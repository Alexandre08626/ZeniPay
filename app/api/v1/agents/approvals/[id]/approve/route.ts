// POST /api/v1/agents/approvals/[id]/approve
//
// Two flows share this path, routed by the id prefix:
//
//   `apr_…`  — PR 12 merchant-rule request. Simple approver click,
//              no TOTP. Executes the stored payload via
//              zc_distribute_to_agent and marks the row approved.
//
//   else     — Legacy agent-scope TOTP signature flow. Body:
//              { totp_code: "123456", notes?: string }. Verifies the
//              approver's TOTP, records a signature, resolves the
//              request via resolveRequest().

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, requireUser, unauthorized } from "../../../_lib/auth";
import { verifyCode } from "@/lib/agents/approvals/totp";
import { readUserTotpSecret } from "@/lib/agents/approvals/vault-secrets";
import { resolveRequest, signChallenge } from "@/lib/agents/approvals/request-manager";
import { logEvent } from "@/lib/agents/audit-log";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

interface RouteContext { params: Promise<{ id: string }> | { id: string }; }

const MICRO = BigInt(1_000_000);
function toMicro(units: number): string {
  const cents = Math.round(units * 100);
  return (BigInt(cents) * (MICRO / BigInt(100))).toString();
}

async function handleMerchantRuleApprove(req: NextRequest, requestId: string) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const organizationId = auth.organizationId;

  const db = getSupabaseAdmin();

  const { data: approval } = await db
    .from("zenipay_approval_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();
  if (!approval) return NextResponse.json({ error: "approval_not_found" }, { status: 404 });
  if (approval.status !== "pending") {
    return NextResponse.json({ error: `request_already_${approval.status}` }, { status: 409 });
  }
  if (approval.expires_at && new Date(approval.expires_at).getTime() < Date.now()) {
    // Lazy-expire rows a cron hasn't picked up yet.
    await db.from("zenipay_approval_requests")
      .update({ status: "expired", decided_at: new Date().toISOString() })
      .eq("id", requestId);
    return NextResponse.json({ error: "request_expired" }, { status: 410 });
  }

  // Guard that the caller's org is linked to the approval's merchant.
  const { data: mapping } = await db
    .from("zenipay_merchant_agent_org_map")
    .select("merchant_id")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (mapping?.merchant_id !== approval.merchant_id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const payload = (approval.payload ?? {}) as {
    to_agent_id?: string;
    amount_units?: number;
    currency?: string;
    idempotency_key?: string;
    memo?: string;
    organization_id?: string;
  };
  const execOrg = payload.organization_id ?? organizationId;

  // Execute the stored distribution.
  const { data: txId, error: rpcErr } = await db.rpc("zc_distribute_to_agent", {
    p_organization_id:  execOrg,
    p_agent_id:         payload.to_agent_id,
    p_amount_micro:     toMicro(Number(payload.amount_units)),
    p_currency:         String(payload.currency ?? approval.currency ?? "CAD"),
    p_idempotency_key:  String(payload.idempotency_key ?? approval.idempotency_key ?? requestId),
    p_posted_by:        `approver:${auth.userId ?? approval.approver_email ?? "org_operator"}`,
  });
  if (rpcErr) {
    const m = rpcErr.message || "";
    const status = /insufficient|22000/i.test(m) ? 422 : 502;
    return NextResponse.json({
      error: status === 422 ? "insufficient_treasury_balance" : "agent_distribute_failed",
      detail: m,
    }, { status });
  }

  await db.from("zenipay_approval_requests")
    .update({
      status: "approved",
      decided_at: new Date().toISOString(),
      decided_by: auth.userId ? `user:${auth.userId}` : approval.approver_email,
    })
    .eq("id", requestId);

  return NextResponse.json({
    approved: true,
    tx_group_id: txId as string | null,
    agent_id: payload.to_agent_id,
    agent_name: approval.agent_name,
    amount_units: payload.amount_units,
    currency: payload.currency ?? approval.currency,
  });
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id: requestId } = await Promise.resolve(ctx.params);
  if (requestId.startsWith("apr_")) {
    return handleMerchantRuleApprove(req, requestId);
  }

  const base = await authenticate(req);
  const auth = requireUser(base);
  if (auth instanceof Response) return auth;
  const body = await req.json().catch(() => ({}));
  const totpCode = String(body?.totp_code ?? "").trim();
  const notes = body?.notes ? String(body.notes) : null;

  if (!/^\d{6}$/.test(totpCode)) {
    return NextResponse.json({ error: "totp_code must be 6 digits" }, { status: 400 });
  }

  // Verify the TOTP code against the caller's enrolled secret.
  const secret = await readUserTotpSecret(auth.userId);
  if (!secret) return NextResponse.json({ error: "approver_not_enrolled" }, { status: 403 });
  if (!verifyCode(secret, totpCode)) {
    await logEvent({
      organizationId: auth.organizationId,
      actorType: "user",
      actorId: auth.userId,
      eventType: "approval.totp_verify_failed",
      payload: { request_id: requestId },
    });
    return NextResponse.json({ error: "invalid_totp_code" }, { status: 403 });
  }

  // Sign the challenge with a per-request nonce. The HMAC is stored for audit —
  // we use the vault-decrypted secret as the key so forging the signature
  // later would require another vault decrypt.
  const sig = signChallenge(requestId, "approved", auth.userId, secret);

  const clientMeta = {
    ip: req.headers.get("x-forwarded-for") ?? req.headers.get("cf-connecting-ip") ?? null,
    user_agent: req.headers.get("user-agent") ?? null,
  };

  const updated = await resolveRequest({
    requestId,
    approverUserId: auth.userId,
    decision: "approved",
    notes,
    signatureCiphertext: sig,
    clientMetadata: clientMeta,
  });

  // Mark the user's secret as recently-used (for audit/rotation UX).
  try {
    const { getAgentsDb } = await import("@/lib/agents/supabase-client");
    await getAgentsDb()
      .from("user_approval_secrets")
      .update({ rotated_at: updated.resolved_at ?? new Date().toISOString() })
      .eq("user_id", auth.userId)
      .select("user_id");
    // (Schema stores rotated_at as last-activity stand-in until secret_type + last_used_at land.)
  } catch { /* non-critical */ }

  return NextResponse.json({ request: updated });
}
