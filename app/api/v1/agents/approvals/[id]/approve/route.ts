// POST /api/v1/agents/approvals/[id]/approve
//
// Body: { totp_code: "123456", notes?: string }
//
// Flow:
//   1. Require session user (step-up via TOTP). API key bearer tokens not allowed
//      for approvals — they're a human-in-the-loop act.
//   2. Load the approver's vault_secret_id, decrypt the TOTP seed.
//   3. Verify the submitted code (±30s drift).
//   4. Record signature via resolveRequest() — idempotent per (request, user).
//   5. Audit log (NEVER includes the decrypted secret or the code).

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, requireUser, unauthorized } from "../../../_lib/auth";
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
