// POST /api/v1/agents/approvals/[id]/reject
//
// PR 12 merchant-rule rejection. Marks a pending zenipay_approval_requests
// row as rejected, optionally with a reason.
//
// For legacy agent-scope TOTP requests, use the sibling /deny endpoint —
// that path carries the TOTP-signed denial semantics.
//
// Body: { reason?: string }

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../../../_lib/auth";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

interface RouteContext { params: Promise<{ id: string }> | { id: string }; }

export async function POST(req: NextRequest, ctx: RouteContext) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const organizationId = auth.organizationId;

  const { id: requestId } = await Promise.resolve(ctx.params);
  if (!requestId.startsWith("apr_")) {
    return NextResponse.json({
      error: "wrong_endpoint",
      hint: "Legacy agent-TOTP requests reject via POST .../deny with a signed TOTP code.",
    }, { status: 400 });
  }

  const body = await req.json().catch(() => ({})) as { reason?: string };
  const reason = body?.reason ? String(body.reason).slice(0, 500) : null;

  const db = getSupabaseAdmin();

  const { data: approval } = await db
    .from("zenipay_approval_requests")
    .select("id, merchant_id, status")
    .eq("id", requestId)
    .maybeSingle();
  if (!approval) return NextResponse.json({ error: "approval_not_found" }, { status: 404 });
  if (approval.status !== "pending") {
    return NextResponse.json({ error: `request_already_${approval.status}` }, { status: 409 });
  }

  // Guard: caller's org must be linked to the approval's merchant.
  const { data: mapping } = await db
    .from("zenipay_merchant_agent_org_map")
    .select("merchant_id")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (mapping?.merchant_id !== approval.merchant_id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { error } = await db.from("zenipay_approval_requests")
    .update({
      status: "rejected",
      decided_at: new Date().toISOString(),
      decided_by: auth.userId ? `user:${auth.userId}` : "org_operator",
      rejection_reason: reason,
    })
    .eq("id", requestId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ rejected: true, reason });
}
