export const dynamic = "force-dynamic";

/**
 * ZeniPay — Merchant Data API
 * GET  ?merchant_id=xxx  — load paylinks/invoices/payouts/bankCfg from Supabase
 * PUT  ?merchant_id=xxx  — save paylinks/invoices/payouts/bankCfg to Supabase
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSupabase(): any {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  const merchant_id = req.nextUrl.searchParams.get("merchant_id");
  if (!merchant_id) return NextResponse.json({ data: null }, { status: 400 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ data: null });

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

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { error } = await supabase
    .from("zenipay_merchants")
    .update({ merchant_data: body, updated_at: new Date().toISOString() })
    .eq("id", merchant_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
