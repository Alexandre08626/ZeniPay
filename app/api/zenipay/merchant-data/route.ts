export const dynamic = "force-dynamic";

/**
 * ZeniPay — Merchant Data API
 * GET  ?merchant_id=xxx  — load paylinks/invoices/payouts/bankCfg from Supabase
 * PUT  ?merchant_id=xxx  — save paylinks/invoices/payouts/bankCfg to Supabase
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, pgrest } from "../../../../modules/zenipay/services/supabase";
import { hashPassword } from "../../../../modules/zenipay/services/auth";
import { requireZpSession, resolveMerchantId } from "@/lib/auth/zp-session";

export async function GET(req: NextRequest) {
  const session = await requireZpSession(req);
  if (session instanceof NextResponse) return session;
  const r = resolveMerchantId(session, req.nextUrl.searchParams.get("merchant_id"));
  if (r instanceof NextResponse) return r;
  const merchant_id = r;

  // Use pgrest (direct HTTP fetch, no cache) to always get fresh data
  try {
    const rows = await pgrest(`zenipay_merchants?id=eq.${encodeURIComponent(merchant_id)}&select=config`) as { config: Record<string, unknown> }[];
    return NextResponse.json({ data: rows[0]?.config || {} });
  } catch {
    // Fallback to Supabase client
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("zenipay_merchants")
      .select("config")
      .eq("id", merchant_id)
      .single();
    if (error) return NextResponse.json({ data: null, error: error.message });
    return NextResponse.json({ data: data?.config || {} });
  }
}

export async function PUT(req: NextRequest) {
  const session = await requireZpSession(req);
  if (session instanceof NextResponse) return session;
  const r = resolveMerchantId(session, req.nextUrl.searchParams.get("merchant_id"));
  if (r instanceof NextResponse) return r;
  const merchant_id = r;

  const body = await req.json();

  const supabase = getSupabaseAdmin();

  // Merge with existing config to preserve auth fields (email, password, plan, status)
  const { data: existing } = await supabase
    .from("zenipay_merchants")
    .select("config")
    .eq("id", merchant_id)
    .single();

  // Direct invoice creation
  if (body._direct_invoice) {
    const inv = body._direct_invoice;

    // Production `zenipay_invoices` uses the legacy schema
    // (client_name / client_email / amount) and does NOT yet have
    // invoice_number / subtotal / tax / total / items / notes. Write the
    // rich shape first; fall back to the legacy columns if the rich
    // columns are missing.
    const rich = {
      id: inv.id,
      invoice_number: inv.invoice_number ?? inv.id,
      merchant_id: inv.merchant_id,
      customer_name: inv.customer_name,
      customer_email: inv.customer_email,
      client_name: inv.customer_name ?? inv.client_name,
      client_email: inv.customer_email ?? inv.client_email,
      items: inv.items ?? JSON.stringify([{ description: inv.description || "Service", qty: 1, unit_price: Number(inv.subtotal || inv.amount || 0), total: Number(inv.subtotal || inv.amount || 0) }]),
      subtotal: inv.subtotal ?? 0,
      tax: inv.tax ?? 0,
      total: inv.total ?? 0,
      amount: inv.total ?? inv.amount,
      currency: inv.currency ?? "CAD",
      description: inv.items ? (JSON.parse(typeof inv.items === "string" ? inv.items : "[]")[0]?.description || "") : (inv.description || ""),
      status: inv.status,
      notes: inv.notes,
      merchant_name: inv.merchant_name,
      merchant_email: inv.merchant_email,
      due_date: inv.due_date ?? null,
      paid_at: inv.paid_at ?? null,
      created_at: inv.created_at,
      updated_at: inv.updated_at ?? new Date().toISOString(),
    };

    const { error: richErr } = await supabase.from("zenipay_invoices").upsert(rich, { onConflict: "id" });
    if (!richErr) return NextResponse.json({ success: true, invoice_id: inv.id });

    // Fallback: legacy columns only.
    const legacy = {
      id: inv.id,
      merchant_id: inv.merchant_id,
      client_name: inv.customer_name || "Client",
      client_email: inv.customer_email || "",
      amount: inv.total ?? inv.amount ?? 0,
      currency: inv.currency || "CAD",
      status: inv.status,
      description: inv.description || "",
      due_date: inv.due_date ?? null,
      paid_at: inv.paid_at ?? null,
      created_at: inv.created_at,
      updated_at: inv.updated_at ?? new Date().toISOString(),
    };
    const { error: legacyErr } = await supabase.from("zenipay_invoices").upsert(legacy, { onConflict: "id" });
    if (legacyErr) return NextResponse.json({ error: legacyErr.message }, { status: 500 });
    return NextResponse.json({ success: true, invoice_id: inv.id });
  }

  // Hash password if being updated
  if (body.password && typeof body.password === "string" && !body.password.includes(":")) {
    body.password = await hashPassword(body.password);
  }

  // Re-read existing IMMEDIATELY before merge to avoid stale data
  const { data: fresh } = await supabase
    .from("zenipay_merchants")
    .select("config")
    .eq("id", merchant_id)
    .single();

  const merged = { ...(fresh?.config || existing?.config || {}), ...body };

  const { error } = await supabase
    .from("zenipay_merchants")
    .update({ config: merged, updated_at: new Date().toISOString() })
    .eq("id", merchant_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
