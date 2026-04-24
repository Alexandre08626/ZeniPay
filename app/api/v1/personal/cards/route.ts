// GET /api/v1/personal/cards?merchant_id=...
//
// Personal virtual cards (zenipay_personal_cards). Same Coming-soon
// pattern as merchant cards: returns { enabled, cards } so the UI
// can render the empty state without hitting an issue endpoint.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { cardIssuingStatus } from "@/lib/card-issuing/provider-factory";

export async function GET(req: NextRequest) {
  const merchantId = req.nextUrl.searchParams.get("merchant_id")?.trim();
  if (!merchantId) {
    return NextResponse.json({ error: { code: "bad_request", message: "merchant_id_required" } }, { status: 400 });
  }
  const status = cardIssuingStatus();
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("zenipay_personal_cards")
    .select("*")
    .eq("merchant_id", merchantId)
    .order("created_at", { ascending: false });
  if (error && error.code !== "PGRST205") {
    return NextResponse.json({ error: { code: "server_error", message: error.message } }, { status: 500 });
  }
  return NextResponse.json({
    enabled: status.enabled,
    provider: status.provider,
    cards: data ?? [],
  });
}
