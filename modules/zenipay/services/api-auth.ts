import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "./supabase";

/**
 * Validates that the request has a valid merchant session.
 * Checks the x-merchant-id header or merchant_id query param against the DB.
 * Returns the merchant_id if valid, or a 401 response.
 */
export async function validateMerchant(req: NextRequest): Promise<{ merchantId: string } | NextResponse> {
  const merchantId = req.headers.get("x-merchant-id") || req.nextUrl.searchParams.get("merchant_id");
  if (!merchantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase.from("zenipay_merchants").select("id").eq("id", merchantId).single();
    if (!data) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return { merchantId: data.id };
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
