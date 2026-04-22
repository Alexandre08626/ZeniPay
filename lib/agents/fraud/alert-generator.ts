// Given a freshly-written anomaly signal, decide whether to raise a fraud
// alert. Idempotency rule (spec): no duplicate alert for the same
// (scope_type, scope_ref, metric) within ALERT_DEDUP_WINDOW_MS (=1h).
//
// Severity mapping:
//   z >= 6.0 → critical   (spec: z > 6)
//   z >= 3.0 → warn       (spec threshold)
//   z <  3.0 → no alert
//
// Alert type is picked from metric (extensible — we treat novel metrics as
// "velocity_spike" by default).

import { getAgentsDb } from "../supabase-client";
import type { BaselineResult } from "./baseline-builder";
import {
  ALERT_DEDUP_WINDOW_MS,
  ZSCORE_ALERT_THRESHOLD,
  ZSCORE_CRITICAL_THRESHOLD,
  type FraudAlertType,
  type FraudAlertSeverity,
  type FraudAlertRow,
} from "./types";

export interface AlertDecision {
  raised: FraudAlertRow | null;
  reason: "below_threshold" | "cold" | "deduplicated" | "raised";
}

export async function maybeRaiseAlert(result: BaselineResult): Promise<AlertDecision> {
  const z = result.outcome.z;
  if (result.outcome.cold) return { raised: null, reason: "cold" };
  if (z == null || Math.abs(z) < ZSCORE_ALERT_THRESHOLD) {
    return { raised: null, reason: "below_threshold" };
  }

  const db = getAgentsDb();
  const alertType = inferAlertType(result.metric);
  const severity: FraudAlertSeverity = Math.abs(z) >= ZSCORE_CRITICAL_THRESHOLD ? "critical" : "warn";

  // Dedup — any open/investigating alert for this (scope, metric) raised
  // within the last hour suppresses a new one. We intentionally DO allow a
  // new alert if the prior one was already resolved — a returning anomaly
  // is signal worth surfacing again.
  const dedupCutoff = new Date(Date.now() - ALERT_DEDUP_WINDOW_MS).toISOString();
  const { data: existing } = await db
    .from("fraud_alerts")
    .select("id, status, created_at")
    .eq("organization_id", result.scope.organization_id)
    .eq("scope_type", result.scope.scope_type)
    .eq("scope_ref", result.scope.scope_ref)
    .contains("details", { metric: result.metric })    // matches the JSONB details.metric field we set below
    .gte("created_at", dedupCutoff)
    .in("status", ["open", "investigating"])
    .limit(1)
    .maybeSingle();
  if (existing) return { raised: null, reason: "deduplicated" };

  const { data: inserted, error } = await db
    .from("fraud_alerts")
    .insert({
      organization_id: result.scope.organization_id,
      scope_type: result.scope.scope_type,
      scope_ref: result.scope.scope_ref,
      alert_type: alertType,
      severity,
      details: {
        metric: result.metric,
        time_window: result.time_window,
        z_score: z,
        current_value: result.current_value,
        baseline_mean: result.baseline.mean,
        baseline_stddev: result.baseline.stddev,
        sample_count: result.baseline.sample_count,
        generated_at: new Date().toISOString(),
      },
      status: "open",
      auto_action_taken: "none",
    })
    .select()
    .maybeSingle();
  if (error) throw new Error(`alert_generator.insert: ${error.message}`);
  return { raised: (inserted as FraudAlertRow) ?? null, reason: "raised" };
}

function inferAlertType(metric: string): FraudAlertType {
  if (metric === "distinct_merchants_24h") return "new_merchant_burst";
  if (metric === "auth_count_1h") return "velocity_spike";
  if (metric === "daily_spend_cents") return "unusual_amount";
  return "velocity_spike";
}
