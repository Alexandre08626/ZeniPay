// Merchant-issued invoices (manual or created by Orvel), optionally split
// into installments. Shared by POST /api/zenipay/invoices and Orvel's
// create_invoice tool so both follow exactly the same rules.

import type { SupabaseClient } from "@supabase/supabase-js";
import { newRowId, loadMerchant, nextInvoiceNumber, emailInvoice } from "./auto-invoice";
import {
  resolvePlan, createInstallments, sendInstallmentRequest, todayMontreal,
  type PlanLine, type Installment,
} from "./installments";

export interface NewInvoiceInput {
  customer_name: string;
  customer_email?: string;
  description?: string;
  amount: number;          // before tax
  tax?: number;            // dollars
  currency?: string;
  notes?: string;
  status?: "draft" | "sent" | "paid";
  due_date?: string;       // YYYY-MM-DD
  installments?: PlanLine[];
  send_now?: boolean;      // email the invoice (or due installments) right away
}

export interface NewInvoiceResult {
  invoice: Record<string, unknown>;
  installments: Installment[];
  emailed: string[];       // what was emailed: "invoice" | installment labels
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const round2 = (n: number) => Math.round(n * 100) / 100;

export class InvoiceError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export async function createMerchantInvoice(
  supabase: SupabaseClient,
  merchantId: string,
  input: NewInvoiceInput,
): Promise<NewInvoiceResult> {
  const name = String(input.customer_name || "").trim();
  const email = String(input.customer_email || "").trim().toLowerCase();
  const amount = round2(Number(input.amount));
  const tax = round2(Number(input.tax || 0));
  if (!name) throw new InvoiceError("Le nom du client est requis.");
  if (!(amount > 0)) throw new InvoiceError("Le montant doit être plus grand que 0.");
  if (!(tax >= 0)) throw new InvoiceError("Taxe invalide.");
  if (email && !EMAIL_RE.test(email)) throw new InvoiceError("Courriel du client invalide.");
  const total = round2(amount + tax);
  const currency = (input.currency || "CAD").toUpperCase();
  if (!["CAD", "USD"].includes(currency)) throw new InvoiceError("Devise non supportée (CAD ou USD).");

  const hasPlan = Array.isArray(input.installments) && input.installments.length > 0;
  let lines: ReturnType<typeof resolvePlan> = [];
  if (hasPlan) {
    if (!email) throw new InvoiceError("Le courriel du client est requis pour les versements (les liens de paiement lui sont envoyés).");
    try { lines = resolvePlan(total, input.installments as PlanLine[]); }
    catch (e) { throw new InvoiceError(e instanceof Error ? e.message : String(e)); }
  }

  const merchant = await loadMerchant(supabase, merchantId);
  const description = String(input.description || "Service").slice(0, 300);
  const status = hasPlan ? "sent" : (input.status || "draft");
  const now = new Date().toISOString();

  let invoice: Record<string, unknown> | null = null;
  let lastErr: { code?: string; message?: string } | null = null;
  for (let attempt = 0; attempt < 5 && !invoice; attempt++) {
    const id = newRowId();
    const invoiceNumber = await nextInvoiceNumber(supabase, merchantId, attempt);
    const rich: Record<string, unknown> = {
      id, invoice_number: invoiceNumber, merchant_id: merchantId,
      customer_name: name, customer_email: email, client_name: name, client_email: email,
      items: JSON.stringify([{ description, qty: 1, unit_price: amount, total: amount }]),
      subtotal: amount, tax, total, amount: total, currency, description,
      status, notes: input.notes || null,
      merchant_name: merchant.name, merchant_email: merchant.email,
      paid_at: status === "paid" ? now : null,
      created_at: now, updated_at: now,
    };
    if (input.due_date) rich.due_date = input.due_date;
    if (hasPlan) { rich.has_installments = true; rich.amount_paid = 0; rich.due_date = lines[lines.length - 1].due_date; }

    const { error } = await supabase.from("zenipay_invoices").insert(rich);
    if (!error) { invoice = rich; break; }
    lastErr = error;
    if (error.code === "23505") continue;
    if (hasPlan) {
      // Installment columns missing → the SQL migration hasn't been run.
      if (error.code === "42703" || error.code === "PGRST204") throw new InvoiceError("MIGRATION_REQUIRED", 503);
      throw new InvoiceError(error.message, 500);
    }
    const legacy = {
      id, merchant_id: merchantId, client_name: name, client_email: email,
      amount: total, currency, status, description: `${invoiceNumber} — ${description}`,
      due_date: input.due_date ?? null, paid_at: status === "paid" ? now : null,
      created_at: now, updated_at: now,
    };
    const { error: legacyErr } = await supabase.from("zenipay_invoices").insert(legacy);
    if (!legacyErr) { invoice = { ...legacy, invoice_number: invoiceNumber, customer_name: name, customer_email: email, subtotal: amount, tax, total }; break; }
    lastErr = legacyErr;
    break;
  }
  if (!invoice) throw new InvoiceError(lastErr?.message || "Création de la facture impossible.", 500);

  let installments: Installment[] = [];
  const emailed: string[] = [];
  if (hasPlan) {
    try {
      installments = await createInstallments(supabase, { invoiceId: String(invoice.id), merchantId, currency, lines });
    } catch (e) {
      await supabase.from("zenipay_invoices").delete().eq("id", invoice.id);
      const msg = e instanceof Error ? e.message : String(e);
      throw new InvoiceError(msg, msg === "MIGRATION_REQUIRED" ? 503 : 500);
    }
    // Everything already due (today or earlier) goes out now; the rest is
    // sent by the daily cron on its due date.
    const today = todayMontreal();
    for (const inst of installments) {
      if (inst.due_date <= today && (await sendInstallmentRequest(supabase, inst))) emailed.push(inst.label);
    }
  } else if (input.send_now && email) {
    const ok = await emailInvoice({
      id: String(invoice.id), invoice_number: String(invoice.invoice_number),
      merchant_id: merchantId, merchant_name: merchant.name, merchant_email: merchant.email,
      customer_name: name, customer_email: email, description,
      subtotal: amount, tax, tax_rate: amount > 0 ? round2((tax / amount) * 100) : 0,
      total, currency, payment_ref: String(invoice.invoice_number), paid_at: now, status,
    });
    if (ok) {
      emailed.push("invoice");
      if (status === "draft") await supabase.from("zenipay_invoices").update({ status: "sent", updated_at: now }).eq("id", invoice.id);
    }
  }
  return { invoice, installments, emailed };
}
