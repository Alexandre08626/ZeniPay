export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

/**
 * Debug endpoint — returns raw DB row counts for diagnostics.
 * Accepts merchant_id as a query param OR reads it from session.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    // Accept merchant_id from query param OR try session
    let merchantId = req.nextUrl.searchParams.get("merchant_id");
    if (!merchantId) {
      // Try session
      const { requireZpSession } = await import("@/lib/auth/zp-session");
      const session = await requireZpSession(req);
      if (!(session instanceof NextResponse)) {
        merchantId = session.merchant_id;
      }
    }

    const result: Record<string, unknown> = {
      provided_merchant_id: merchantId || "(none)",
      note: "Pass ?merchant_id=XXX in the URL to see your data",
    };

    // Try each table independently
    if (merchantId) {
      const { data: merchant } = await supabase
        .from("zenipay_merchants")
        .select("id, merchant_data")
        .eq("id", merchantId)
        .maybeSingle();
      result.merchant = {
        found: !!merchant,
        id: merchant?.id || null,
        merchant_data_keys: merchant?.merchant_data ? Object.keys(merchant.merchant_data as Record<string, unknown>) : [],
        has_balance: !!((merchant?.merchant_data as Record<string, unknown>)?.balance),
      };

      const { count: myPayCount } = await supabase
        .from("zenipay_payments")
        .select("*", { count: "exact", head: true })
        .eq("merchant_id", merchantId);
      result.my_payments_count = myPayCount ?? 0;

      const { count: allPayCount } = await supabase
        .from("zenipay_payments")
        .select("*", { count: "exact", head: true });
      result.all_payments_count = allPayCount ?? 0;

      const { data: myPays } = await supabase
        .from("zenipay_payments")
        .select("id, amount, status, created_at")
        .eq("merchant_id", merchantId)
        .order("created_at", { ascending: false })
        .limit(10);
      result.my_payments = myPays ?? [];

      const { data: payLinks } = await supabase
        .from("zenipay_pay_links")
        .select("id, amount, uses, status")
        .eq("merchant_id", merchantId)
        .limit(20);
      result.pay_links = payLinks ?? [];

      const { data: accounts } = await supabase
        .from("zenipay_accounts")
        .select("id, name, type, balance, currency")
        .eq("merchant_id", merchantId);
      result.accounts = accounts ?? [];
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
