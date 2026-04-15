export const dynamic = "force-dynamic";

/**
 * ZeniPay — Merchant Data API
 * GET  ?merchant_id=xxx  — load paylinks/invoices/payouts/bankCfg from Supabase
 * PUT  ?merchant_id=xxx  — save paylinks/invoices/payouts/bankCfg to Supabase
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../modules/zenipay/services/supabase";
import { hashPassword } from "../../../../modules/zenipay/services/auth";

export async function GET(req: NextRequest) {
  const merchant_id = req.nextUrl.searchParams.get("merchant_id");
  if (!merchant_id) return NextResponse.json({ data: null }, { status: 400 });

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("zenipay_merchants")
    .select("merchant_data")
    .eq("id", merchant_id)
    .single();

  if (error) return NextResponse.json({ data: null, error: error.message });
  return NextResponse.json({ data: data?.merchant_data || {} });
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

  // Use Postgres JSONB merge (||) for atomic update — prevents race conditions
  const { error } = await supabase.rpc("merge_merchant_data", {
    p_merchant_id: merchant_id,
    p_data: body,
  });

  // Fallback to JS merge if RPC doesn't exist
  if (error?.message?.includes("function") || error?.code === "42883") {
    const merged = { ...(existing?.merchant_data || {}), ...body };
    const { error: fallbackErr } = await supabase
      .from("zenipay_merchants")
      .update({ merchant_data: merged, updated_at: new Date().toISOString() })
      .eq("id", merchant_id);
    if (fallbackErr) return NextResponse.json({ error: fallbackErr.message }, { status: 500 });
  } else if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
