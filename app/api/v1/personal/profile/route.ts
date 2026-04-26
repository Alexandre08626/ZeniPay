// GET /api/v1/personal/profile?merchant_id=...
//
// Returns the personal profile + KYC status for the merchant.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { requireZpSession, resolveMerchantId } from "@/lib/auth/zp-session";

export async function GET(req: NextRequest) {
  const session = requireZpSession(req);
  if (session instanceof NextResponse) return session;
  const r = resolveMerchantId(session, req.nextUrl.searchParams.get("merchant_id"));
  if (r instanceof NextResponse) return r;
  const merchantId = r;
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("zenipay_personal_profiles")
    .select("*")
    .eq("merchant_id", merchantId)
    .maybeSingle();
  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: { code: "server_error", message: error.message } }, { status: 500 });
  }
  return NextResponse.json({ profile: data ?? null });
}
