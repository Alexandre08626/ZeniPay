// POST /api/v1/bank/sync
// Body: { merchant_id, connection_id }
//
// Re-reads the balance from MX for a single connection and updates
// zenipay_bank_connections.balance_synced / balance_synced_at.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { syncBalance, aggregateMember } from "@/lib/mx/mx-client";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { merchant_id?: string; connection_id?: string };
  const merchantId   = String(body.merchant_id ?? "").trim();
  const connectionId = String(body.connection_id ?? "").trim();
  if (!merchantId || !connectionId) {
    return NextResponse.json({ error: { code: "bad_request", message: "missing_fields" } }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { data: conn } = await db
    .from("zenipay_bank_connections")
    .select("id, merchant_id, mx_user_guid, mx_account_guid, mx_member_guid")
    .eq("id", connectionId)
    .eq("merchant_id", merchantId)
    .maybeSingle();
  if (!conn) return NextResponse.json({ error: { code: "not_found", message: "connection_not_found" } }, { status: 404 });
  if (!conn.mx_user_guid || !conn.mx_account_guid) {
    return NextResponse.json({ error: { code: "unprocessable", message: "connection_missing_mx_ids" } }, { status: 422 });
  }

  // Trigger a fresh pull at MX (talks to the underlying bank) before
  // reading. Without this we'd just surface MX's cached snapshot.
  if (conn.mx_member_guid) {
    try { await aggregateMember(conn.mx_user_guid, conn.mx_member_guid); } catch { /* best-effort */ }
  }

  let result;
  try {
    result = await syncBalance(conn.mx_user_guid, conn.mx_account_guid);
  } catch (e) {
    return NextResponse.json({ error: { code: "bad_gateway", message: e instanceof Error ? e.message : String(e) } }, { status: 502 });
  }
  if (!result) {
    return NextResponse.json({ error: { code: "bad_gateway", message: "mx_account_read_failed" } }, { status: 502 });
  }

  const now = new Date().toISOString();
  await db.from("zenipay_bank_connections")
    .update({ balance_synced: result.balance, balance_synced_at: now })
    .eq("id", connectionId);

  return NextResponse.json({
    balance: result.balance,
    currency: result.currency,
    synced_at: now,
  });
}
