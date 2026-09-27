// Automated invoice on money-in: every successful customer payment creates a
// paid invoice and emails it to the payer (merchant in BCC).
//
// Production `zenipay_invoices.id` and `zenipay_payments.id` are UUID columns
// (the repo migrations say TEXT — prod drifted). Human references such as
// `ZNV-…` and `INV-2026-0001` must therefore never be used as `id`; they live
// in `invoice_number` / `metadata.reference`. A 2026-09-27 payment was charged
// at Finix but lost both rows because of this.

import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/send";

export const newRowId = () => crypto.randomUUID();

export interface PaidInvoiceInput {
  merchantId: string | null;
  paymentId: string;          // zenipay_payments.id (UUID)
  paymentRef: string;         // human reference shown to the customer (ZNV-…)
  customerName: string;
  customerEmail: string;
  description: string;
  total: number;
  currency: string;
  taxInclusive?: boolean;     // card flow: reverse-calc tax from the total
}

export interface CreatedInvoice {
  id: string;
  invoice_number: string;
  merchant_id: string | null;
  merchant_name: string;
  merchant_email: string;
  customer_name: string;
  customer_email: string;
  description: string;
  subtotal: number;
  tax: number;
  tax_rate: number;
  total: number;
  currency: string;
  payment_ref: string;
  paid_at: string;
  status?: string;            // default "paid"
}

const round2 = (n: number) => Math.round(n * 100) / 100;

async function loadMerchant(supabase: SupabaseClient, merchantId: string | null) {
  const out = { name: "", email: "", taxRate: 5 };
  if (!merchantId) return out;
  try {
    const { data } = await supabase
      .from("zenipay_merchants")
      .select("*")
      .eq("id", merchantId)
      .maybeSingle();
    if (data) {
      const cfg = (data.config || {}) as Record<string, unknown>;
      if (typeof cfg.tax_rate === "number" && cfg.tax_rate >= 0) out.taxRate = cfg.tax_rate;
      out.name = String(data.business_name || cfg.business_name || cfg.businessName || data.company || data.name || "");
      out.email = String(data.email || cfg.email || "");
    }
  } catch { /* keep defaults */ }
  return out;
}

async function nextInvoiceNumber(supabase: SupabaseClient, merchantId: string | null, offset: number) {
  const year = new Date().getFullYear();
  let count = 0;
  try {
    let q = supabase.from("zenipay_invoices").select("id", { count: "exact", head: true });
    if (merchantId) q = q.eq("merchant_id", merchantId);
    const { count: c } = await q;
    count = c || 0;
  } catch { /* fall through with 0 */ }
  return `INV-${year}-${String(count + 1 + offset).padStart(4, "0")}`;
}

/**
 * Create the paid invoice for a payment. Idempotent on payment_id.
 * Returns null only when every insert shape failed (logged).
 */
export async function createPaidInvoice(
  supabase: SupabaseClient,
  p: PaidInvoiceInput,
): Promise<CreatedInvoice | null> {
  try {
    const { data: existing } = await supabase
      .from("zenipay_invoices").select("id").eq("payment_id", p.paymentId).limit(1);
    if (existing && existing.length > 0) return null;
  } catch { /* payment_id column missing — continue */ }

  const merchant = await loadMerchant(supabase, p.merchantId);
  const total = round2(p.total);
  const rate = p.taxInclusive === false ? 0 : merchant.taxRate / 100;
  const subtotal = round2(total / (1 + rate));
  const tax = round2(total - subtotal);
  const now = new Date().toISOString();
  const description = p.description || `Paiement ${p.paymentRef}`;

  let lastErr: unknown = null;
  // Retry on invoice_number collisions (unique per merchant).
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = newRowId();
    const invoiceNumber = await nextInvoiceNumber(supabase, p.merchantId, attempt);
    const rich = {
      id,
      invoice_number: invoiceNumber,
      merchant_id: p.merchantId,
      customer_name: p.customerName || "Client",
      customer_email: p.customerEmail || "",
      client_name: p.customerName || "Client",
      client_email: p.customerEmail || "",
      items: JSON.stringify([{ description, qty: 1, unit_price: subtotal, total: subtotal }]),
      subtotal,
      tax,
      total,
      amount: total,
      currency: p.currency,
      description,
      status: "paid",
      payment_id: p.paymentId,
      merchant_name: merchant.name,
      merchant_email: merchant.email,
      notes: `Facture générée automatiquement — paiement ${p.paymentRef}`,
      paid_at: now,
      created_at: now,
      updated_at: now,
    };
    const { error: richErr } = await supabase.from("zenipay_invoices").insert(rich);
    if (!richErr) {
      return {
        id, invoice_number: invoiceNumber, merchant_id: p.merchantId,
        merchant_name: merchant.name, merchant_email: merchant.email,
        customer_name: rich.customer_name, customer_email: rich.customer_email,
        description, subtotal, tax, tax_rate: rate * 100, total, currency: p.currency,
        payment_ref: p.paymentRef, paid_at: now,
      };
    }
    if (richErr.code === "23505") { lastErr = richErr; continue; }

    // Legacy schema (client_name / client_email / amount only).
    const legacy = {
      id,
      merchant_id: p.merchantId,
      client_name: p.customerName || "Client",
      client_email: p.customerEmail || "",
      amount: total,
      currency: p.currency,
      status: "paid",
      description: `${invoiceNumber} — ${description}`,
      paid_at: now,
      created_at: now,
      updated_at: now,
    };
    const { error: legacyErr } = await supabase.from("zenipay_invoices").insert(legacy);
    if (!legacyErr) {
      return {
        id, invoice_number: invoiceNumber, merchant_id: p.merchantId,
        merchant_name: merchant.name, merchant_email: merchant.email,
        customer_name: legacy.client_name, customer_email: legacy.client_email,
        description, subtotal, tax, tax_rate: rate * 100, total, currency: p.currency,
        payment_ref: p.paymentRef, paid_at: now,
      };
    }
    console.error("[auto-invoice] insert failed", { rich: richErr, legacy: legacyErr });
    lastErr = legacyErr;
    break;
  }
  console.error("[auto-invoice] giving up", lastErr);
  return null;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const money = (n: number, cur: string) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: cur === "USDC" ? "USD" : cur }).format(n);

export function renderInvoiceEmail(inv: CreatedInvoice): string {
  const from = esc(inv.merchant_name || "ZeniPay");
  const paid = (inv.status || "paid") === "paid";
  const date = new Date(inv.paid_at).toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" });
  const row = (label: string, value: string, bold = false) =>
    `<tr><td style="padding:6px 0;color:#64748b;font-size:13px">${label}</td><td style="padding:6px 0;text-align:right;font-size:13px;${bold ? "font-weight:700;color:#0f172a" : "color:#0f172a"}">${value}</td></tr>`;
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;padding:28px">
<tr><td>
  <div style="font-size:18px;font-weight:700;color:#0f172a">${from}</div>
  ${inv.merchant_email ? `<div style="font-size:12px;color:#94a3b8;margin-top:2px">${esc(inv.merchant_email)}</div>` : ""}
  <div style="margin-top:20px;font-size:22px;font-weight:700;color:#0f172a">Facture ${esc(inv.invoice_number)}</div>
  <div style="font-size:12px;color:#64748b;margin-top:4px">Invoice · ${esc(date)}</div>
  ${paid
    ? `<div style="display:inline-block;margin-top:10px;padding:3px 10px;border-radius:999px;background:#dcfce7;color:#166534;font-size:11px;font-weight:700">PAYÉE · PAID</div>`
    : `<div style="display:inline-block;margin-top:10px;padding:3px 10px;border-radius:999px;background:#fef3c7;color:#92400e;font-size:11px;font-weight:700">À PAYER · DUE</div>`}

  <p style="font-size:14px;color:#334155;margin:22px 0 4px">Bonjour ${esc(inv.customer_name)},</p>
  <p style="font-size:14px;color:#334155;margin:0 0 18px">${paid
    ? `Merci pour votre paiement. Voici votre facture.<br><span style="color:#94a3b8;font-size:12px">Thank you for your payment. Your invoice is below.</span>`
    : `Voici votre facture.<br><span style="color:#94a3b8;font-size:12px">Please find your invoice below.</span>`}</p>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;margin-bottom:12px">
    ${row(esc(inv.description), money(inv.subtotal, inv.currency))}
  </table>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${row("Sous-total / Subtotal", money(inv.subtotal, inv.currency))}
    ${inv.tax ? row(`Taxes (${inv.tax_rate}%)`, money(inv.tax, inv.currency)) : ""}
    ${row(paid ? "Total payé / Total paid" : "Total dû / Total due", money(inv.total, inv.currency), true)}
    ${paid ? row("Référence de paiement", esc(inv.payment_ref)) : ""}
  </table>

  <p style="font-size:11px;color:#94a3b8;margin-top:26px">Paiement traité par ZeniPay pour ${from}. Pour toute question, répondez à ce courriel.</p>
</td></tr></table>
</td></tr></table></body></html>`;
}

/** Email the invoice to the customer, merchant in BCC. Never throws. */
export async function emailInvoice(inv: CreatedInvoice): Promise<boolean> {
  const to = (inv.customer_email || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    console.warn("[auto-invoice] no valid customer email, invoice not sent", inv.invoice_number);
    return false;
  }
  try {
    await sendEmail({
      to,
      bcc: inv.merchant_email || undefined,
      subject: `Facture ${inv.invoice_number} — ${inv.merchant_name || "ZeniPay"}`,
      html: renderInvoiceEmail(inv),
      fromName: inv.merchant_name || "ZeniPay",
      replyTo: inv.merchant_email || undefined,
    });
    return true;
  } catch (e) {
    console.error("[auto-invoice] email failed", inv.invoice_number, e instanceof Error ? e.message : String(e));
    return false;
  }
}
