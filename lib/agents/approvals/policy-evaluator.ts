// Decides whether a card authorization needs a human approval.
//
// Pure over the policy rows + the auth context; does not hit the DB.
// The caller (authorize.ts) loads the matching active policies via
// loadApplicablePolicies() then calls evaluate(authContext, policies).
//
// Matching policies are ordered by priority (lower = higher precedence);
// the FIRST match wins. If no policy matches, no approval needed.

import type { AgentPolicy } from "../types";

export interface AuthContext {
  amountCents: number;
  currency: string;
  merchantCategory?: string;   // MCC
  merchantName?: string;
  merchantCountry?: string;
  occurredAt: Date;            // UTC
  anomalyScore?: number | null;
}

/** Policy row with the approval-specific shape (trigger_config / approver_config). */
export interface ApprovalPolicyRow {
  id: string;
  organization_id: string;
  name: string;
  trigger_type: "amount_threshold" | "merchant_category" | "new_merchant" | "off_hours" | "anomaly_score";
  trigger_config: Record<string, unknown>;
  approver_type: "specific_user" | "any_admin" | "owner_only" | "multi_sig";
  approver_config: Record<string, unknown>;
  timeout_seconds: number;
  default_action: "approve" | "deny";
  active: boolean;
  priority: number;
}

export interface EvaluateResult {
  requires_approval: boolean;
  matched_policy_id: string | null;
  reason: string;
  required_signatures: number;         // derived from approver_config (1 = single)
  timeout_seconds: number;
}

export function evaluate(ctx: AuthContext, policies: ApprovalPolicyRow[]): EvaluateResult {
  // Sort by priority ascending; first match wins.
  const sorted = [...policies]
    .filter((p) => p.active)
    .sort((a, b) => a.priority - b.priority);

  for (const p of sorted) {
    const match = matches(p, ctx);
    if (match) {
      return {
        requires_approval: true,
        matched_policy_id: p.id,
        reason: `policy:${p.trigger_type}:${match}`,
        required_signatures: requiredSignatures(p),
        timeout_seconds: p.timeout_seconds,
      };
    }
  }
  return {
    requires_approval: false,
    matched_policy_id: null,
    reason: "no_policy_matched",
    required_signatures: 0,
    timeout_seconds: 0,
  };
}

function matches(p: ApprovalPolicyRow, ctx: AuthContext): string | null {
  const cfg = p.trigger_config;
  switch (p.trigger_type) {
    case "amount_threshold": {
      const threshold = asInt(cfg.threshold_cents);
      if (threshold != null && ctx.amountCents >= threshold) return `amount>=${threshold}`;
      return null;
    }
    case "merchant_category": {
      const mccs = asStringArray(cfg.mccs);
      if (ctx.merchantCategory && mccs.includes(ctx.merchantCategory)) return `mcc=${ctx.merchantCategory}`;
      return null;
    }
    case "new_merchant": {
      // Caller passes "seen_merchants" list — if the current merchant is NOT
      // in the list, the policy fires. Default: no seen list → always new.
      const seen = asStringArray(cfg.seen_merchants);
      if (ctx.merchantName && !seen.includes(ctx.merchantName)) return `new=${ctx.merchantName}`;
      return null;
    }
    case "off_hours": {
      const tz = String(cfg.timezone ?? "UTC");
      const start = String(cfg.start ?? "22:00");
      const end = String(cfg.end ?? "06:00");
      if (isOffHours(ctx.occurredAt, start, end, tz)) return "off_hours";
      return null;
    }
    case "anomaly_score": {
      const threshold = asNumber(cfg.threshold);
      if (threshold != null && ctx.anomalyScore != null && ctx.anomalyScore >= threshold) {
        return `z>=${threshold}`;
      }
      return null;
    }
  }
}

function requiredSignatures(p: ApprovalPolicyRow): number {
  if (p.approver_type === "multi_sig") {
    return asInt(p.approver_config.min_approvals) ?? 2;
  }
  return 1;
}

// UTC-only off-hours check. Policy stores local "HH:MM" strings + timezone
// name; we convert `now` to that timezone using Intl.DateTimeFormat, then
// compare as minute-of-day. Wraparound windows (e.g. 22:00→06:00) supported.
function isOffHours(now: Date, startHm: string, endHm: string, timezone: string): boolean {
  try {
    const dtf = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });
    const parts = dtf.formatToParts(now);
    const hh = Number(parts.find((p) => p.type === "hour")?.value ?? "00");
    const mm = Number(parts.find((p) => p.type === "minute")?.value ?? "00");
    const mins = hh * 60 + mm;
    const startMins = hmToMin(startHm);
    const endMins = hmToMin(endHm);
    if (startMins === endMins) return true;
    if (startMins < endMins) return mins >= startMins && mins < endMins;
    return mins >= startMins || mins < endMins; // wraparound
  } catch {
    return false;
  }
}
function hmToMin(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function asInt(v: unknown): number | null {
  return typeof v === "number" && Number.isInteger(v) ? v : null;
}
function asNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? (v.filter((x) => typeof x === "string") as string[]) : [];
}

// Filter: is this policy type applicable to the given decision layer? For PR 3
// we wire approvals into card_authorization only; the same rows could later
// drive API-spend auth.
export function filterForCardAuth(policies: AgentPolicy[] | ApprovalPolicyRow[]): ApprovalPolicyRow[] {
  return policies as ApprovalPolicyRow[];
}
