// Real refunds: reverse the Finix transfer, THEN record it. Before this,
// /api/zenipay/refunds only flipped the DB status — the customer never got
// the money back.
//
// Concurrency: a refund lock in payment.metadata (set with a conditional
// update) stops two simultaneous requests from reversing twice.

import type { SupabaseClient } from "@supabase/supabase-js";
import { createReversal } from "@/modules/zenipay/gateways/finix";
import { newRowId } from "./auto-invoice";
import { sendEmail } from "@/lib/email/send";

const round2 = (n: number) => Math.round(n * 100) / 100;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class RefundError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export interface RefundResult {
  payment_id: string;
  reference: string;
  refunded_now: number;
  refunded_total: number;
  fully_refunded: boolean;
  reversal_id: string;
}

/** Find one of the merchant's payments by UUID id or by its ZNV-… reference. */
export async function findMerchantPayment(supabase: SupabaseClient, merchantId: string, idOrRef: string) {
  const key = String(idOrRef || "").trim();
  if (!key) return null;
  if (UUID_RE.test(key)) {
    const { data } = await supabase.from("zenipay_payments").select("*").eq("id", key).eq("merchant_id", merchantId).maybeSingle();
    if (data) return data;
  }
  const { data } = await supabase.from("zenipay_payments").select("*")
    .eq("merchant_id", merchantId).eq("metadata->>reference", key).maybeSingle();
  return data || null;
}

export async function refundPayment(
  supabase: SupabaseClient,
  merchantId: string,
  idOrRef: string,
  opts: { amount?: number; reason?: string; notifyCustomer?: boolean } = {},
): Promise<RefundResult> {
  const payment = await findMerchantPayment(supabase, merchantId, idOrRef);
  if (!payment) throw new RefundError("Paiement introuvable.", 404);
  if (payment.status !== "succeeded") throw new RefundError(`Seul un paiement réussi peut être remboursé (statut : ${payment.status}).`);

  const meta = (payment.metadata || {}) as Record<string, unknown>;
  const transferId = String(payment.gateway_transfer_id || meta.gateway_transfer_id || "");
  if (!transferId) throw new RefundError("Ce paiement n'a pas de transaction Finix associée — remboursement impossible automatiquement.");

  const paid = round2(Number(payment.amount) || 0);
  const already = round2(Number(meta.refunded_amount || 0));
  const left = round2(paid - already);
  const amount = opts.amount != null ? round2(Number(opts.amount)) : left;
  if (!(amount > 0)) throw new RefundError("Montant de remboursement invalide.");
  if (amount > left + 0.001) throw new RefundError(`Maximum remboursable : ${left.toFixed(2)} $.`);

  // Lock (conditional on no lock present) so two requests can't both reverse.
  const lock = new Date().toISOString();
  const { data: locked } = await supabase.from("zenipay_payments")
    .update({ metadata: { ...meta, refund_lock: lock } })
    .eq("id", payment.id).is("metadata->>refund_lock", null)
    .select("id");
  if (!locked || locked.length === 0) throw new RefundError("Un remboursement est déjà en cours pour ce paiement.", 409);

  let reversal: Record<string, unknown>;
  try {
    reversal = await createReversal(transferId, Math.round(amount * 100));
  } catch (e) {
    await supabase.from("zenipay_payments").update({ metadata: meta }).eq("id", payment.id);
    throw new RefundError(`Finix a refusé le remboursement : ${e instanceof Error ? e.message : String(e)}`, 502);
  }

  const now = new Date().toISOString();
  const refundedTotal = round2(already + amount);
  const full = refundedTotal >= paid - 0.001;
  const reference = String(meta.reference || payment.id);
  const reversalId = String(reversal.id || "");
  const refunds = Array.isArray(meta.refunds) ? meta.refunds : [];

  await supabase.from("zenipay_payments").update({
    status: full ? "refunded" : "succeeded",
    metadata: {
      ...meta,
      refund_lock: null,
      refunded_amount: refundedTotal,
      refunds: [...refunds, { amount, reversal_id: reversalId, reason: opts.reason || "", at: now }],
    },
    updated_at: now,
  }).eq("id", payment.id);

  // Ledger debit + merchant balance debit (mirror of the credit on money-in).
  await supabase.from("zenipay_ledger").insert({
    id: newRowId(),
    payment_id: payment.id,
    merchant_id: merchantId,
    event_type: "refund",
    wallet_type: "platform",
    direction: "debit",
    amount,
    currency: payment.currency || "CAD",
    reference,
    note: `Refund ${reference}${opts.reason ? ` — ${opts.reason}` : ""} | Finix reversal ${reversalId}`,
    created_at: now,
  });
  const { data: acct } = await supabase.from("zenipay_accounts").select("id, balance")
    .eq("merchant_id", merchantId).eq("is_primary", true).maybeSingle();
  if (acct) {
    await supabase.from("zenipay_accounts")
      .update({ balance: round2(Number(acct.balance || 0) - amount), updated_at: now }).eq("id", acct.id);
  }
  if (full) {
    await supabase.from("zenipay_invoices").update({ status: "refunded", updated_at: now }).eq("payment_id", payment.id);
  }

  if (opts.notifyCustomer !== false && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payment.customer_email || "")) {
    const money = new Intl.NumberFormat("fr-CA", { style: "currency", currency: payment.currency || "CAD" }).format(amount);
    try {
      await sendEmail({
        to: payment.customer_email,
        subject: `Remboursement de ${money} — ${reference}`,
        html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#334155;max-width:520px">
          <p>Bonjour ${String(payment.customer_name || "").replace(/[<>&"]/g, "")},</p>
          <p>Un remboursement de <b>${money}</b> a été émis pour votre paiement <b>${reference}</b>. Selon votre banque, il apparaîtra sur votre relevé d'ici 5 à 10 jours ouvrables.</p>
          <p style="color:#94a3b8;font-size:12px">A refund of ${money} was issued for payment ${reference}. It may take 5–10 business days to appear on your statement.</p></div>`,
      });
    } catch { /* refund is done; email is best-effort */ }
  }

  return { payment_id: payment.id, reference, refunded_now: amount, refunded_total: refundedTotal, fully_refunded: full, reversal_id: reversalId };
}
