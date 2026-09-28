export const dynamic = "force-dynamic";

// POST /api/zenipay/invoices/send  { invoice_id, to? }
// Emails one of the session merchant's invoices to its customer (merchant in
// BCC). `to` overrides/fills the customer email and is saved on the invoice.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { requireZpSession, resolveMerchantId } from "@/lib/auth/zp-session";
import { emailInvoice, type CreatedInvoice } from "@/lib/zenipay/auto-invoice";
import { invoiceNumberOf, invoiceDescriptionOf } from "@/lib/zenipay/installments";
import { updateTolerant } from "@/lib/zenipay/db-tolerant";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const session = await requireZpSession(req);
  if (session instanceof NextResponse) return session;
  const r = resolveMerchantId(session, req.nextUrl.searchParams.get("merchant_id"));
  if (r instanceof NextResponse) return r;
  const merchantId = r;

  const body = await req.json().catch(() => ({}));
  const invoiceId = String(body.invoice_id || "");
  if (!invoiceId) return NextResponse.json({ error: "invoice_id required" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: row, error } = await supabase
    .from("zenipay_invoices")
    .select("*")
    .eq("id", invoiceId)
    .eq("merchant_id", merchantId)
    .maybeSingle();
  if (error || !row) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const override = typeof body.to === "string" ? body.to.trim() : "";
  if (override && !EMAIL_RE.test(override)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  const to = override || row.customer_email || row.client_email || "";
  if (!EMAIL_RE.test(to)) {
    return NextResponse.json({ error: "NO_CUSTOMER_EMAIL" }, { status: 422 });
  }

  let merchantName = row.merchant_name || "";
  let merchantEmail = row.merchant_email || "";
  if (!merchantName || !merchantEmail) {
    const { data: m } = await supabase.from("zenipay_merchants").select("*").eq("id", merchantId).maybeSingle();
    const cfg = ((m?.config || {}) as Record<string, unknown>);
    merchantName ||= String(m?.business_name || cfg.business_name || cfg.businessName || m?.company || m?.name || "");
    merchantEmail ||= String(m?.email || cfg.email || "");
  }

  let description = invoiceDescriptionOf(row);
  try {
    const items = typeof row.items === "string" ? JSON.parse(row.items) : row.items;
    if (!description && Array.isArray(items) && items[0]?.description) description = items[0].description;
  } catch { /* keep */ }

  const total = Number(row.total ?? row.amount ?? 0);
  const tax = Number(row.tax ?? 0);
  const subtotal = Number(row.subtotal ?? total - tax);
  const invoice: CreatedInvoice = {
    id: row.id,
    invoice_number: invoiceNumberOf(row),
    merchant_id: merchantId,
    merchant_name: merchantName,
    merchant_email: merchantEmail,
    customer_name: row.customer_name || row.client_name || "Client",
    customer_email: to,
    description: description || "Service",
    subtotal,
    tax,
    tax_rate: subtotal > 0 ? Math.round((tax / subtotal) * 10000) / 100 : 0,
    total,
    currency: row.currency || "CAD",
    payment_ref: row.payment_id || invoiceNumberOf(row),
    paid_at: row.paid_at || row.created_at || new Date().toISOString(),
    status: row.status || "sent",
  };

  const sent = await emailInvoice(invoice);
  if (!sent) return NextResponse.json({ error: "EMAIL_FAILED" }, { status: 502 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (override) { patch.customer_email = override; patch.client_email = override; }
  if (row.status === "draft") patch.status = "sent";
  if (Object.keys(patch).length > 1) {
    await updateTolerant(supabase, "zenipay_invoices", patch, (q) => q.eq("id", row.id));
  }
  return NextResponse.json({ success: true, sent_to: to });
}
