// GET /api/v1/merchant/payouts?merchant_id=X[&status=pending|processing|completed|failed][&limit=N]
//
// Lists payout_requests for a merchant, joined with destination nickname /
// type for the UI.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

export async function GET(req: NextRequest) {
  const mid = (req.nextUrl.searchParams.get("merchant_id") ?? "").trim();
  const status = req.nextUrl.searchParams.get("status");
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? "100") || 100, 500);
  if (!mid) return NextResponse.json({ error: { code: "bad_request", message: "merchant_id_required" } }, { status: 400 });

  const db = getSupabaseAdmin();

  let q = db
    .from("zenipay_payout_requests")
    .select("*")
    .eq("merchant_id", mid)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (status) q = q.eq("status", status);
  const { data: payouts, error } = await q;
  if (error) return NextResponse.json({ error: { code: "server_error", message: error.message } }, { status: 500 });

  // Attach destination metadata.
  const destIds = Array.from(new Set(((payouts ?? []) as Array<{ destination_id: string | null }>).map((p) => p.destination_id).filter(Boolean) as string[]));
  let destsById: Record<string, { nickname: string; destination_type: string; bank_name: string | null }> = {};
  if (destIds.length > 0) {
    const { data: dests } = await db
      .from("zenipay_payout_destinations")
      .select("id, nickname, destination_type, bank_name")
      .in("id", destIds);
    destsById = Object.fromEntries(
      ((dests ?? []) as Array<{ id: string; nickname: string; destination_type: string; bank_name: string | null }>)
        .map((d) => [d.id, { nickname: d.nickname, destination_type: d.destination_type, bank_name: d.bank_name }]),
    );
  }

  const rows = ((payouts ?? []) as Array<{
    id: string; destination_id: string | null; from_account_id: string | null;
    amount_units: number; currency: string; status: string;
    estimated_arrival: string | null; finix_transfer_id: string | null;
    failure_reason: string | null; memo: string | null;
    created_at: string; updated_at: string;
  }>).map((p) => ({
    ...p,
    destination: p.destination_id ? (destsById[p.destination_id] ?? null) : null,
  }));

  return NextResponse.json({ payouts: rows });
}
