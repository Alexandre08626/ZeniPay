// POST /api/v1/agents/approvers/enroll
//
// Body: {} (no args — TOTP is the only flavor in PR 3)
//
// Generates a fresh 160-bit base32 TOTP seed, stores it in Supabase Vault,
// writes the pointer row in agents.user_approval_secrets, and returns the
// plaintext seed + provisioning URI ONCE. The client scans the QR code,
// then calls /approvers/verify with the first generated code to activate.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, requireUser } from "../../_lib/auth";
import { generateSecret, provisioningUri } from "@/lib/agents/approvals/totp";
import { enrollUserTotp } from "@/lib/agents/approvals/vault-secrets";
import { logEvent } from "@/lib/agents/audit-log";

export async function POST(req: NextRequest) {
  const base = await authenticate(req);
  const auth = requireUser(base);
  if (auth instanceof Response) return auth;

  const secret = generateSecret();
  await enrollUserTotp({ userId: auth.userId, plaintextSecret: secret });

  const body = await req.json().catch(() => ({}));
  const email = body?.email ? String(body.email) : `user-${auth.userId.slice(0, 8)}`;

  const issuer = process.env.AGENTS_APPROVAL_TOTP_ISSUER || "ZeniPay Agents";
  const uri = provisioningUri({ secret, account: email, issuer });

  await logEvent({
    organizationId: auth.organizationId,
    actorType: "user", actorId: auth.userId,
    eventType: "approver.enrolled",
    payload: { secret_type: "totp" }, // NEVER log the secret itself
  });

  return NextResponse.json({
    secret,                    // shown ONCE — client should never re-request
    provisioning_uri: uri,     // otpauth://... for QR
    algorithm: "SHA1",
    digits: 6,
    period_seconds: 30,
    warning: "This is the ONLY time the secret is returned. Store it in your authenticator now.",
  });
}
