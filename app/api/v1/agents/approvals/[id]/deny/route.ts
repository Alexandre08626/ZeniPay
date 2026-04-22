// POST /api/v1/agents/approvals/[id]/deny
//
// Body: { totp_code, reason?: string }
//
// Denial also requires TOTP — denying is just as consequential as approving,
// and we want a cryptographic record of "this human said no".

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, requireUser } from "../../../_lib/auth";
import { verifyCode } from "@/lib/agents/approvals/totp";
import { readUserTotpSecret } from "@/lib/agents/approvals/vault-secrets";
import { resolveRequest, signChallenge } from "@/lib/agents/approvals/request-manager";
import { logEvent } from "@/lib/agents/audit-log";

interface RouteContext { params: Promise<{ id: string }> | { id: string }; }

export async function POST(req: NextRequest, ctx: RouteContext) {
  const base = await authenticate(req);
  const auth = requireUser(base);
  if (auth instanceof Response) return auth;

  const { id: requestId } = await Promise.resolve(ctx.params);
  const body = await req.json().catch(() => ({}));
  const totpCode = String(body?.totp_code ?? "").trim();
  const reason = body?.reason ? String(body.reason) : null;

  if (!/^\d{6}$/.test(totpCode)) return NextResponse.json({ error: "totp_code must be 6 digits" }, { status: 400 });

  const secret = await readUserTotpSecret(auth.userId);
  if (!secret) return NextResponse.json({ error: "approver_not_enrolled" }, { status: 403 });
  if (!verifyCode(secret, totpCode)) {
    await logEvent({
      organizationId: auth.organizationId, actorType: "user", actorId: auth.userId,
      eventType: "approval.totp_verify_failed",
      payload: { request_id: requestId, action: "deny" },
    });
    return NextResponse.json({ error: "invalid_totp_code" }, { status: 403 });
  }

  const sig = signChallenge(requestId, "denied", auth.userId, secret);
  const clientMeta = {
    ip: req.headers.get("x-forwarded-for") ?? null,
    user_agent: req.headers.get("user-agent") ?? null,
  };
  const updated = await resolveRequest({
    requestId,
    approverUserId: auth.userId,
    decision: "denied",
    notes: reason,
    signatureCiphertext: sig,
    clientMetadata: clientMeta,
  });
  return NextResponse.json({ request: updated });
}
