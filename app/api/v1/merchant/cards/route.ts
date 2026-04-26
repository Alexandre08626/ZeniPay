// GET /api/v1/merchant/cards?merchant_id=...
//
// Lists the merchant's virtual cards. Returns { enabled, provider, cards }
// so the UI can render "Coming soon" without a second round-trip.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { cardIssuingStatus } from "@/lib/card-issuing/provider-factory";
import { requireZpSession, resolveMerchantId } from "@/lib/auth/zp-session";

export async function GET(req: NextRequest) {
  const session = requireZpSession(req);
  if (session instanceof NextResponse) return session;
  const r = resolveMerchantId(session, req.nextUrl.searchParams.get("merchant_id"));
  if (r instanceof NextResponse) return r;
  const merchantId = r;

  const status = cardIssuingStatus();
  const db = getSupabaseAdmin();

  // If no provider is enabled + table hasn't been applied yet, .from()
  // returns a PGRST205. Swallow it so the UI falls straight into the
  // "Coming soon" state instead of flashing an error banner.
  const { data, error } = await db
    .from("zenipay_merchant_cards")
    .select("id, merchant_id, account_id, card_type, usage_type, provider, last4, exp_month, exp_year, status, spending_limit_daily, spending_limit_monthly, currency, cardholder_name, created_at, cancelled_at")
    .eq("merchant_id", merchantId)
    .order("created_at", { ascending: false });

  if (error && error.code !== "PGRST205") {
    return NextResponse.json({ error: { code: "server_error", message: error.message } }, { status: 500 });
  }

  return NextResponse.json({
    enabled:  status.enabled,
    provider: status.provider,
    cards:    data ?? [],
  });
}
