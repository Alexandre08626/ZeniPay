// POST /api/v1/agents/approvers/verify
//
// Body: { code: "123456" }
//
// Proves the caller has their TOTP authenticator paired correctly — running
// this successfully marks the enrollment as "verified" (reflected via
// user_approval_secrets.rotated_at being updated within the last minute,
// which the dashboard reads as an "activated" state).

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, requireUser } from "../../_lib/auth";
import { verifyCode } from "@/lib/agents/approvals/totp";
import { readUserTotpSecret } from "@/lib/agents/approvals/vault-secrets";
import { getAgentsDb } from "@/lib/agents/supabase-client";
import { logEvent } from "@/lib/agents/audit-log";

export async function POST(req: NextRequest) {
  const base = await authenticate(req);
  const auth = requireUser(base);
  if (auth instanceof Response) return auth;

  const body = await req.json().catch(() => ({}));
  const code = String(body?.code ?? "").trim();
  if (!/^\d{6}$/.test(code)) return NextResponse.json({ error: "code must be 6 digits" }, { status: 400 });

  const secret = await readUserTotpSecret(auth.userId);
  if (!secret) return NextResponse.json({ error: "no_enrolled_secret" }, { status: 404 });

  if (!verifyCode(secret, code)) {
    return NextResponse.json({ ok: false, error: "invalid_code" }, { status: 403 });
  }

  // Touch rotated_at to indicate successful verification moment.
  await getAgentsDb()
    .from("user_approval_secrets")
    .update({ rotated_at: new Date().toISOString() })
    .eq("user_id", auth.userId);

  await logEvent({
    organizationId: auth.organizationId,
    actorType: "user", actorId: auth.userId,
    eventType: "approver.verified",
    payload: { secret_type: "totp" },
  });

  return NextResponse.json({ ok: true });
}
