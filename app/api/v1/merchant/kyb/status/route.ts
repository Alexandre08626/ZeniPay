// GET /api/v1/merchant/kyb/status?merchant_id=X
// Thin read endpoint that returns the fields needed to render the
// /app/overview KYB banner.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

export async function GET(req: NextRequest) {
  const mid = (req.nextUrl.searchParams.get("merchant_id") ?? "").trim();
  if (!mid) return NextResponse.json({ error: "merchant_id_required" }, { status: 400 });

  const { data, error } = await getSupabaseAdmin()
    .from("zenipay_merchants")
    .select("id, status, onboarding_state, kyb_rejection_reason, kyb_submitted_at, kyb_approved_at")
    .eq("id", mid)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data)  return NextResponse.json({ merchant: null });

  return NextResponse.json({ merchant: data });
}
