// CRUD for approval_requests + the retry-window lookup used by authorize.ts.
//
// Lifecycle:
//   pending → approved | denied | expired | canceled
//
// Retry-window model:
//   When a CFO approves a request, we record resolved_at. On the AGENT's
//   next card-auth attempt (Stripe does NOT auto-retry), authorize.ts
//   calls findUsableApproval() to see if a recently-approved request
//   matches the new auth context within ±10% amount + same merchant +
//   last 5 minutes. If yes → bypass threshold. If no → create a new
//   pending request. This avoids approval churn while keeping each
//   retry explicit in the ledger.

import { getAgentsDb } from "../supabase-client";
import { logEvent } from "../audit-log";
import { createHmac, randomBytes } from "node:crypto";

export const RETRY_WINDOW_SECONDS = 5 * 60;
export const RETRY_AMOUNT_TOLERANCE = 0.10; // ±10%

export interface CreateRequestInput {
  organizationId: string;
  policyId: string;
  subjectType: "card_authorization" | "transaction" | "rule_creation" | "credential_write";
  subjectRef: string;
  requestedByAgentId?: string | null;
  requestedAmountCents: number;
  requestedCurrency: string;
  context: Record<string, unknown>;
  timeoutSeconds: number;
}

export interface ApprovalRequestRow {
  id: string;
  organization_id: string;
  policy_id: string;
  subject_type: string;
  subject_ref: string;
  requested_by_agent_id: string | null;
  requested_amount_cents: number | null;
  requested_currency: string | null;
  context: Record<string, unknown>;
  status: "pending" | "approved" | "denied" | "expired" | "canceled";
  expires_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  notifications_sent: unknown[];
  created_at: string;
}

/** Create a pending approval_request row. */
export async function createRequest(i: CreateRequestInput): Promise<ApprovalRequestRow> {
  const db = getAgentsDb();
  const expiresAt = new Date(Date.now() + i.timeoutSeconds * 1000).toISOString();
  const { data, error } = await db
    .from("approval_requests")
    .insert({
      organization_id: i.organizationId,
      policy_id: i.policyId,
      subject_type: i.subjectType,
      subject_ref: i.subjectRef,
      requested_by_agent_id: i.requestedByAgentId ?? null,
      requested_amount_cents: i.requestedAmountCents,
      requested_currency: i.requestedCurrency,
      context: i.context,
      status: "pending",
      expires_at: expiresAt,
    })
    .select()
    .single();
  if (error || !data) throw new Error(`approval_requests insert failed: ${error?.message}`);

  await logEvent({
    organizationId: i.organizationId,
    actorType: "system",
    eventType: "approval.requested",
    payload: { request_id: data.id, policy_id: i.policyId, amount_cents: i.requestedAmountCents },
  });
  return data as ApprovalRequestRow;
}

/**
 * Look up a recently-approved request matching the current auth context.
 * Returns the row if found, null otherwise.
 *
 * Match criteria:
 *   - same organization_id
 *   - same subject_type='card_authorization'
 *   - context.card_id === current card
 *   - context.merchant === current merchant (fallback to loose match if absent)
 *   - requested_amount_cents within ±RETRY_AMOUNT_TOLERANCE of current
 *   - status='approved' AND resolved_at within RETRY_WINDOW_SECONDS
 */
export async function findUsableApproval(args: {
  organizationId: string;
  cardId: string;
  merchantName?: string;
  amountCents: number;
}): Promise<ApprovalRequestRow | null> {
  const db = getAgentsDb();
  const windowAgo = new Date(Date.now() - RETRY_WINDOW_SECONDS * 1000).toISOString();
  const lo = Math.floor(args.amountCents * (1 - RETRY_AMOUNT_TOLERANCE));
  const hi = Math.ceil(args.amountCents * (1 + RETRY_AMOUNT_TOLERANCE));

  const { data } = await db
    .from("approval_requests")
    .select("*")
    .eq("organization_id", args.organizationId)
    .eq("subject_type", "card_authorization")
    .eq("status", "approved")
    .gte("resolved_at", windowAgo)
    .gte("requested_amount_cents", lo)
    .lte("requested_amount_cents", hi)
    .order("resolved_at", { ascending: false })
    .limit(5);

  const rows = (data ?? []) as ApprovalRequestRow[];
  for (const r of rows) {
    const ctx = r.context as { card_id?: string; merchant?: string };
    if (ctx.card_id !== args.cardId) continue;
    if (args.merchantName && ctx.merchant && ctx.merchant !== args.merchantName) continue;
    return r;
  }
  return null;
}

/** Resolve (approve or deny) a pending request. Idempotent per approver. */
export interface ResolveInput {
  requestId: string;
  approverUserId: string;
  decision: "approved" | "denied";
  notes?: string | null;
  signatureCiphertext: string; // HMAC(challenge) — stored for audit
  clientMetadata: Record<string, unknown>;
}

export async function resolveRequest(i: ResolveInput): Promise<ApprovalRequestRow> {
  const db = getAgentsDb();

  const { data: req } = await db
    .from("approval_requests")
    .select("*")
    .eq("id", i.requestId)
    .maybeSingle();
  if (!req) throw new Error("approval_request not found");
  const r = req as ApprovalRequestRow;
  if (r.status !== "pending") {
    // Idempotent: if already resolved by same decision, re-record signature only.
    await recordSignature(i, r);
    return r;
  }

  // Record signature (unique per approver per request — ON CONFLICT ignored).
  await recordSignature(i, r);

  // Count signatures to decide if we transition the request.
  const { data: sigs } = await db
    .from("approval_signatures")
    .select("approver_user_id, decision")
    .eq("request_id", i.requestId);
  const approvedCount = ((sigs ?? []) as Array<{ decision: string }>).filter((s) => s.decision === "approved").length;
  const deniedCount  = ((sigs ?? []) as Array<{ decision: string }>).filter((s) => s.decision === "denied").length;

  // Determine required_signatures from the matched policy.
  const { data: policy } = await db
    .from("approval_policies").select("approver_type, approver_config")
    .eq("id", r.policy_id).maybeSingle();
  const required = policy?.approver_type === "multi_sig"
    ? Number((policy.approver_config as { min_approvals?: number }).min_approvals ?? 2)
    : 1;

  let next: "approved" | "denied" | "pending" = "pending";
  if (deniedCount >= 1) next = "denied";
  else if (approvedCount >= required) next = "approved";

  if (next !== "pending") {
    const { data: updated } = await db
      .from("approval_requests")
      .update({
        status: next,
        resolved_at: new Date().toISOString(),
        resolved_by: i.approverUserId,
        resolution_notes: i.notes ?? null,
      })
      .eq("id", i.requestId)
      .select()
      .single();
    await logEvent({
      organizationId: r.organization_id,
      actorType: "user",
      actorId: i.approverUserId,
      eventType: next === "approved" ? "approval.approved" : "approval.denied",
      payload: { request_id: i.requestId, approved_count: approvedCount, denied_count: deniedCount },
    });
    return (updated as ApprovalRequestRow) ?? r;
  }
  return r;
}

async function recordSignature(i: ResolveInput, req: ApprovalRequestRow): Promise<void> {
  const db = getAgentsDb();
  await db
    .from("approval_signatures")
    .insert({
      request_id: i.requestId,
      approver_user_id: i.approverUserId,
      decision: i.decision,
      signature: i.signatureCiphertext,
      client_metadata: i.clientMetadata,
    })
    .select("id")
    .single()
    .then(
      () => {},
      () => { /* unique (request_id, approver_user_id) violation = already signed; ignore */ },
    );
  void req;
}

/**
 * Produce a deterministic HMAC challenge that the approver's TOTP verify
 * result implicitly "signs" (we co-record the TOTP-passed moment + the
 * request details so the audit trail has a cryptographically anchored
 * representation of the decision event, not just an authz marker).
 */
export function signChallenge(requestId: string, decision: string, approverUserId: string, secret: string): string {
  const nonce = randomBytes(8).toString("hex");
  const msg = `${requestId}.${decision}.${approverUserId}.${nonce}.${Date.now()}`;
  const mac = createHmac("sha256", secret).update(msg).digest("hex");
  return `${nonce}.${mac}`;
}

/** Auto-expire pending requests whose expires_at is in the past. Returns count. */
export async function expireStale(): Promise<number> {
  const db = getAgentsDb();
  const { data } = await db
    .from("approval_requests")
    .update({ status: "expired", resolved_at: new Date().toISOString() })
    .lt("expires_at", new Date().toISOString())
    .eq("status", "pending")
    .select("id, organization_id");
  const rows = (data ?? []) as Array<{ id: string; organization_id: string }>;
  for (const r of rows) {
    await logEvent({
      organizationId: r.organization_id,
      actorType: "system",
      eventType: "approval.expired",
      payload: { request_id: r.id },
    });
  }
  return rows.length;
}
