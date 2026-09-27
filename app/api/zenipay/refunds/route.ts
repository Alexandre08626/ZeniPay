export const dynamic = "force-dynamic";

// POST /api/zenipay/refunds  { payment_id, amount?, reason?, merchant_id? }
// Refunds one of the session merchant's payments through Finix (real
// reversal), then records it. A verified operator (requireAdmin) may act on
// another merchant by passing merchant_id.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { requireZpSession, resolveMerchantIdAsync } from "@/lib/auth/zp-session";
import { refundPayment, RefundError } from "@/lib/zenipay/refund";

export async function POST(req: NextRequest) {
  const session = await requireZpSession(req);
  if (session instanceof NextResponse) return session;
  const body = await req.json().catch(() => ({}));
  const r = await resolveMerchantIdAsync(session, body.merchant_id ?? null, req);
  if (r instanceof NextResponse) return r;
  if (!body.payment_id) return NextResponse.json({ error: "payment_id required" }, { status: 400 });

  try {
    const result = await refundPayment(getSupabaseAdmin(), r, String(body.payment_id), {
      amount: body.amount != null ? Number(body.amount) : undefined,
      reason: typeof body.reason === "string" ? body.reason.slice(0, 200) : undefined,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    if (e instanceof RefundError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("[refunds]", e);
    return NextResponse.json({ error: "Refund failed" }, { status: 500 });
  }
}
