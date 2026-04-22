// Persists a BaselineResult → anomaly_signals. Upsert on the composite key
// (scope_type, scope_ref, metric, time_window) so a second cron tick within
// the same bucket overwrites the prior estimate instead of piling rows.
//
// The baseline JSONB carries { mean, stddev, sample_count, last_sample_at,
// computed_at } — exactly the shape authorize.ts needs for its velocity
// check (it currently reads baseline + z_score; this module produces both).

import { getAgentsDb } from "../supabase-client";
import type { BaselineResult } from "./baseline-builder";
import type { AnomalySignalRow } from "./types";

export async function writeSignal(result: BaselineResult): Promise<AnomalySignalRow | null> {
  // Cold scopes don't emit a signal row (DECISION 2): authorize.ts reads
  // "no row" as "unknown" and passes through.
  if (result.outcome.cold) return null;

  const db = getAgentsDb();
  const row = {
    organization_id: result.scope.organization_id,
    scope_type: result.scope.scope_type,
    scope_ref: result.scope.scope_ref,
    metric: result.metric,
    time_window: result.time_window,
    value: result.current_value,
    baseline: result.baseline,
    z_score: result.outcome.z,
    computed_at: new Date().toISOString(),
  };

  // Insert-only: keeping a history is useful for investigating alerts and
  // for baseline drift analysis. The index idx_anomaly_scope_metric_time
  // orders by computed_at DESC so the "current" row is the first returned
  // in reads. Old rows age out via a maintenance sweep (out of scope for PR 5).
  const { data, error } = await db
    .from("anomaly_signals")
    .insert(row)
    .select()
    .maybeSingle();
  if (error) throw new Error(`signals_writer.insert: ${error.message}`);
  return (data as AnomalySignalRow) ?? null;
}
