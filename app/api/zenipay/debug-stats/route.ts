export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { requireZpSession } from "@/lib/auth/zp-session";

/**
 * Debug endpoint — shows exactly what's in the DB for the current merchant.
 * Only works when the caller is logged in as the merchant.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireZpSession(req);
    if (session instanceof NextResponse) return session;

    const supabase = getSupabaseAdmin();
    const merchantId = session.merchant_id;

    // 1. Merchant record
    const { data: merchant, error: mErr } = await supabase
      .from("zenipay_merchants")
      .select("*")
      .eq("id", merchantId)
      .maybeSingle();

    // 2. Payments for this merchant
    const { data: payments, error: pErr } = await supabase
      .from("zenipay_payments")
      .select("*")
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: false })
      .limit(20);

    // 3. All payments (no filter) — just count
    const { count: allPayCount, error: allPErr } = await supabase
      .from("zenipay_payments")
      .select("*", { count: "exact", head: true });

    // 4. Pay links for this merchant
    const { data: payLinks, error: plErr } = await supabase
      .from("zenipay_pay_links")
      .select("*")
      .eq("merchant_id", merchantId)
      .limit(20);

    // 5. Check accounts
    const { data: accounts, error: aErr } = await supabase
      .from("zenipay_accounts")
      .select("*")
      .eq("merchant_id", merchantId);

    return NextResponse.json({
      session: { merchant_id: session.merchant_id, mode: session.mode },
      merchant: { data: merchant, error: mErr?.message },
      my_payments: { count: payments?.length ?? 0, data: payments, error: pErr?.message },
      all_payments_count: allPayCount ?? 0,
      all_payments_error: allPErr?.message,
      pay_links: { count: payLinks?.length ?? 0, data: payLinks, error: plErr?.message },
      accounts: { count: accounts?.length ?? 0, data: accounts, error: aErr?.message },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
