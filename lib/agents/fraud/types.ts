// Types for the fraud / anomaly-signals module.
// Mirrors `agents.anomaly_signals` and `agents.fraud_alerts` plus the
// in-memory shapes that z-score-computer and baseline-builder produce.

export type AnomalyScopeType = "agent" | "card" | "org";
export type AnomalyMetric =
  | "daily_spend_cents"
  | "hourly_spend_cents"
  | "auth_count_1h"
  | "auth_count_24h"
  | "distinct_merchants_24h";

export type AnomalyWindow = "1h" | "24h" | "7d" | "30d";

export interface AnomalyScope {
  scope_type: AnomalyScopeType;
  scope_ref: string;              // the id (agent.id | issued_cards.id | organization.id)
  organization_id: string;        // denormalized for RLS scoping + index locality
}

export interface BaselineStats {
  mean: number;
  stddev: number;
  sample_count: number;
  last_sample_at: string;         // ISO
  computed_at: string;             // ISO
}

export interface AnomalySignalRow {
  id?: string;
  scope_type: AnomalyScopeType;
  scope_ref: string;
  metric: AnomalyMetric | string;
  time_window: AnomalyWindow;
  value: number;
  baseline: BaselineStats | null;     // stored in JSONB col via adapter
  z_score: number | null;
  computed_at: string;
  organization_id: string;
}

export type FraudAlertType =
  | "velocity_spike"
  | "new_merchant_burst"
  | "off_hours_spend"
  | "unusual_amount"
  | "geographic_anomaly"
  | "policy_boundary_probe";

export type FraudAlertSeverity = "info" | "warn" | "critical";
export type FraudAlertStatus = "open" | "investigating" | "dismissed" | "confirmed_fraud";

/** Matches agents.fraud_alerts.auto_action_taken. */
export type FraudAlertAction = "none" | "paused_card" | "paused_agent" | "required_approval";

export interface FraudAlertRow {
  id: string;
  organization_id: string;
  scope_type: AnomalyScopeType;
  scope_ref: string;
  alert_type: FraudAlertType;
  severity: FraudAlertSeverity;
  details: Record<string, unknown>;
  status: FraudAlertStatus;
  auto_action_taken: FraudAlertAction;
  card_id: string | null;         // populated when the alert → card pause action fires (PR 5 migration adds this col)
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

/** MIN samples required before we even compute z-score. Below this the scope
 *  is considered "cold" and the cron skips it (no signal row written). */
export const BASELINE_MIN_SAMPLES = 7;

/** Fixed z-score threshold for MVP (DECISION 2). */
export const ZSCORE_ALERT_THRESHOLD = 3.0;
export const ZSCORE_CRITICAL_THRESHOLD = 6.0;

/** Dedup window — no two alerts for the same (scope, metric) within this
 *  bucket. Spec: 1h. */
export const ALERT_DEDUP_WINDOW_MS = 60 * 60 * 1000;
