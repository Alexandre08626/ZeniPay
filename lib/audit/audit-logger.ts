// Fire-and-forget audit logger for zenipay_audit_log.
//
// Never blocks the calling route. If the insert errors, we log to the
// console and return — the business operation proceeds.
//
// SECURITY: route handlers must NEVER pass raw card numbers, PAN,
// plaintext passwords, or API keys into old_value / new_value /
// metadata. The helper does a best-effort scrub but the caller is
// still responsible.

import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

export type ActorType = "merchant_user" | "agent" | "api_key" | "system" | "admin";
export type Severity = "info" | "warning" | "critical";

export interface AuditEntry {
  merchant_id?: string | null;
  actor_type: ActorType;
  actor_id: string;
  actor_email?: string | null;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  old_value?: unknown;
  new_value?: unknown;
  ip_address?: string | null;
  user_agent?: string | null;
  metadata?: Record<string, unknown>;
  severity?: Severity;
}

const SENSITIVE_KEYS = /^(password|pan|card_number|secret|api_key|private_key|totp|totp_seed|ssn|sin)$/i;

function scrub(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(scrub);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.test(k)) { out[k] = "[redacted]"; continue; }
      out[k] = scrub(v);
    }
    return out;
  }
  return value;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await getSupabaseAdmin().from("zenipay_audit_log").insert({
      merchant_id: entry.merchant_id ?? null,
      actor_type: entry.actor_type,
      actor_id: entry.actor_id,
      actor_email: entry.actor_email ?? null,
      action: entry.action,
      resource_type: entry.resource_type,
      resource_id: entry.resource_id ?? null,
      old_value: entry.old_value !== undefined ? scrub(entry.old_value) : null,
      new_value: entry.new_value !== undefined ? scrub(entry.new_value) : null,
      ip_address: entry.ip_address ?? null,
      user_agent: entry.user_agent ?? null,
      metadata: scrub(entry.metadata ?? {}),
      severity: entry.severity ?? "info",
    });
  } catch (e) {
    // Non-critical — surface to server logs but never throw.
    console.error("[audit] log failed", e);
  }
}

/** Non-awaited shortcut — fires the write without tying up the caller. */
export function auditAsync(entry: AuditEntry): void {
  void logAudit(entry);
}
