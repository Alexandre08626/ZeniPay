export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../modules/zenipay/services/supabase";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ merchant_id: null });

  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("zenipay_pay_links")
      .select("merchant_id")
      .eq("id", id)
      .single();

    return NextResponse.json({ merchant_id: data?.merchant_id || null });
  } catch {
    return NextResponse.json({ merchant_id: null });
  }
}
