// GET /api/v1/bank/connections?merchant_id=...&type=business|personal
//
// Lists a merchant's active bank connections.

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
  const connectionType = req.nextUrl.searchParams.get("type")?.trim() || null;

  const db = getSupabaseAdmin();
  let q = db.from("zenipay_bank_connections")
    .select("id, merchant_id, connection_type, provider, institution_name, institution_logo_url, account_type, account_number_last4, routing_number, currency, balance_synced, balance_synced_at, verified_at, status, created_at, mx_user_guid, mx_member_guid, mx_account_guid")
    .eq("merchant_id", merchantId)
    .eq("status", "active");
  if (connectionType) q = q.eq("connection_type", connectionType);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error && error.code !== "PGRST205") {
    return NextResponse.json({ error: { code: "server_error", message: error.message } }, { status: 500 });
  }
  return NextResponse.json({ connections: data ?? [] });
}
