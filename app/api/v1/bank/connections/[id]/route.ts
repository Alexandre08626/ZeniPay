// DELETE /api/v1/bank/connections/[id]?merchant_id=...
//
// Soft-disconnect — sets status='disconnected' on the row. We keep
// the MX guids around for audit purposes; re-connecting the same
// member creates a new row.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { auditAsync } from "@/lib/audit/audit-logger";
import { requireZpSession, resolveMerchantId } from "@/lib/auth/zp-session";

interface RouteContext { params: Promise<{ id: string }> | { id: string }; }

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const session = await requireZpSession(req);
  if (session instanceof NextResponse) return session;
  const { id } = await Promise.resolve(ctx.params);
  const r = resolveMerchantId(session, req.nextUrl.searchParams.get("merchant_id"));
  if (r instanceof NextResponse) return r;
  const merchantId = r;
  const db = getSupabaseAdmin();
  const { error } = await db
    .from("zenipay_bank_connections")
    .update({ status: "disconnected" })
    .eq("id", id)
    .eq("merchant_id", merchantId);
  if (error) {
    return NextResponse.json({ error: { code: "server_error", message: error.message } }, { status: 500 });
  }
  auditAsync({
    merchant_id: merchantId,
    actor_type: "merchant_user",
    actor_id: merchantId,
    action: "bank.disconnected",
    resource_type: "zenipay_bank_connections",
    resource_id: id,
    severity: "info",
  });
  return NextResponse.json({ success: true });
}
