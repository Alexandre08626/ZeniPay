// GET /api/v1/personal/profile?merchant_id=...
//
// Returns the personal profile + KYC status for the merchant.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

export async function GET(req: NextRequest) {
  const merchantId = req.nextUrl.searchParams.get("merchant_id")?.trim();
  if (!merchantId) {
    return NextResponse.json({ error: { code: "bad_request", message: "merchant_id_required" } }, { status: 400 });
  }
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
