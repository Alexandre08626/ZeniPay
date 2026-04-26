// POST /api/v1/yield/unenroll
// Body: { merchant_id, enrollment_id }
//
// Sets status='cancelled'. Pending accruals are still paid out at
// the next monthly cron — that's the spec.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { auditAsync } from "@/lib/audit/audit-logger";
import { requireZpSession, resolveMerchantId } from "@/lib/auth/zp-session";

export async function POST(req: NextRequest) {
  const session = await requireZpSession(req);
  if (session instanceof NextResponse) return session;
  const body = await req.json().catch(() => ({})) as { merchant_id?: string; enrollment_id?: string };
  const r = resolveMerchantId(session, body.merchant_id ?? null);
  if (r instanceof NextResponse) return r;
  const merchantId = r;
  const enrollmentId = String(body.enrollment_id ?? "").trim();
  if (!enrollmentId) {
    return NextResponse.json({ error: { code: "bad_request", message: "enrollment_id_required" } }, { status: 400 });
  }
  const db = getSupabaseAdmin();
  const { error } = await db
    .from("zenipay_yield_enrollments")
    .update({ status: "cancelled" })
    .eq("id", enrollmentId)
    .eq("merchant_id", merchantId);
  if (error) {
    return NextResponse.json({ error: { code: "server_error", message: error.message } }, { status: 500 });
  }
  auditAsync({
    merchant_id: merchantId, actor_type: "merchant_user", actor_id: merchantId,
    action: "yield.unenrolled", resource_type: "zenipay_yield_enrollments", resource_id: enrollmentId,
    severity: "info",
  });
  return NextResponse.json({ success: true });
}
