export const dynamic = "force-dynamic";

/**
 * ZeniPay — Merchant Data API
 * GET  ?merchant_id=xxx  — load paylinks/invoices/payouts/bankCfg from Supabase
 * PUT  ?merchant_id=xxx  — save paylinks/invoices/payouts/bankCfg to Supabase
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, pgrest } from "../../../../modules/zenipay/services/supabase";
import { hashPassword } from "../../../../modules/zenipay/services/auth";

export async function GET(req: NextRequest) {
  const merchant_id = req.nextUrl.searchParams.get("merchant_id");
  if (!merchant_id) return NextResponse.json({ data: null }, { status: 400 });

  // Use pgrest (direct HTTP fetch, no cache) to always get fresh data
  try {
    const rows = await pgrest(`zenipay_merchants?id=eq.${encodeURIComponent(merchant_id)}&select=merchant_data`) as { merchant_data: Record<string, unknown> }[];
    return NextResponse.json({ data: rows[0]?.merchant_data || {} });
  } catch {
    // Fallback to Supabase client
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("zenipay_merchants")
      .select("merchant_data")
      .eq("id", merchant_id)
      .single();
    if (error) return NextResponse.json({ data: null, error: error.message });
    return NextResponse.json({ data: data?.merchant_data || {} });
  }
}

export async function PUT(req: NextRequest) {
  const merchant_id = req.nextUrl.searchParams.get("merchant_id");
  if (!merchant_id) return NextResponse.json({ error: "Missing merchant_id" }, { status: 400 });

  const body = await req.json();

  const supabase = getSupabaseAdmin();

  // Merge with existing merchant_data to preserve auth fields (email, password, plan, status)
  const { data: existing } = await supabase
    .from("zenipay_merchants")
    .select("merchant_data")
    .eq("id", merchant_id)
    .single();

  // Direct invoice creation
  if (body._direct_invoice) {
    const inv = body._direct_invoice;
    const { error: invErr } = await supabase.from("zenipay_invoices").upsert(inv, { onConflict: "id" });
    if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 });
    return NextResponse.json({ success: true, invoice_id: inv.id });
  }

  // Hash password if being updated
  if (body.password && typeof body.password === "string" && !body.password.includes(":")) {
    body.password = await hashPassword(body.password);
  }

  // Re-read existing IMMEDIATELY before merge to avoid stale data
  const { data: fresh } = await supabase
    .from("zenipay_merchants")
    .select("merchant_data")
    .eq("id", merchant_id)
    .single();

  const merged = { ...(fresh?.merchant_data || existing?.merchant_data || {}), ...body };

  const { error } = await supabase
    .from("zenipay_merchants")
    .update({ merchant_data: merged, updated_at: new Date().toISOString() })
    .eq("id", merchant_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
