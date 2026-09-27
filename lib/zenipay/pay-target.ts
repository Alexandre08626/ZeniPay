// Server-side source of truth for "what is being paid": merchant, amount,
// currency. The checkout page sends pay_link_id; everything else it sends
// (amount, merchant_id) is display-only and must never be trusted — a
// tampered request could otherwise pay $1 for a $1,000 link or credit
// another merchant.

import type { SupabaseClient } from "@supabase/supabase-js";
import { findInstallmentByToken, type Installment } from "./installments";

export interface PayTarget {
  kind: "installment" | "link";
  id: string;
  merchantId: string;
  amount: number | null;       // null = open amount (customer chooses)
  currency: string;
  description: string;
  status: string;              // "active" | "paid" | "cancelled" | …
  uses: number;
  installment?: Installment;
}

export async function resolvePayTarget(supabase: SupabaseClient, id: string): Promise<PayTarget | null> {
  if (!id) return null;

  const inst = await findInstallmentByToken(supabase, id);
  if (inst) {
    let invoiceNumber = "";
    try {
      const { data: inv } = await supabase.from("zenipay_invoices").select("*").eq("id", inst.invoice_id).maybeSingle();
      invoiceNumber = inv?.invoice_number || "";
    } catch { /* ignore */ }
    return {
      kind: "installment",
      id,
      merchantId: inst.merchant_id,
      amount: inst.amount,
      currency: inst.currency || "CAD",
      description: [invoiceNumber && `Facture ${invoiceNumber}`, inst.label].filter(Boolean).join(" — "),
      status: inst.status === "paid" ? "paid" : inst.status === "cancelled" ? "cancelled" : "active",
      uses: 0,
      installment: inst,
    };
  }

  const { data: link } = await supabase
    .from("zenipay_pay_links").select("*").eq("id", id).maybeSingle();
  if (link?.merchant_id) {
    const amt = Number(link.amount);
    return {
      kind: "link",
      id,
      merchantId: link.merchant_id,
      amount: Number.isFinite(amt) && amt > 0 ? amt : null,
      currency: String(link.currency || "CAD").toUpperCase(),
      description: link.description || "",
      status: link.status || "active",
      uses: Number(link.uses || 0),
    };
  }

  // Legacy: links stored in the merchant's config JSONB.
  const { data: merchants } = await supabase.from("zenipay_merchants").select("id, config");
  for (const m of merchants || []) {
    const cfg = (m.config || {}) as Record<string, unknown>;
    const found = ((cfg.payLinks || []) as Array<Record<string, unknown>>).find((l) => l.id === id);
    if (found) {
      const amt = Number(found.amount);
      return {
        kind: "link",
        id,
        merchantId: m.id as string,
        amount: Number.isFinite(amt) && amt > 0 ? amt : null,
        currency: String(found.currency || "CAD").toUpperCase(),
        description: String(found.description || ""),
        status: String(found.status || "active"),
        uses: 0,
      };
    }
  }
  return null;
}

/** Amount to charge: the link's fixed amount wins over anything the client sent. */
export function chargeableAmount(target: PayTarget, clientAmount: unknown): number | null {
  if (target.amount != null) return target.amount;
  const n = parseFloat(String(clientAmount));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}
