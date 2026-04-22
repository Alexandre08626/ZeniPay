// Build a rolling 30-day baseline for a given (scope, metric) by streaming
// card_authorizations rows through Welford's accumulator. One function per
// metric — keeping them separate makes the SQL obvious and lets future
// metrics slot in without reworking a generic aggregator.
//
// Returns the baseline + the CURRENT value (i.e. today / last-hour bucket
// depending on the metric) so signals-writer can persist both + derive z.
//
// Why we bucket here (not in SQL): we want the baseline built from the last
// 30 daily buckets EXCLUDING today, then compare today's partial-day value
// against that baseline. Doing the grouping in JS is easier to read, and
// 30×N rows at card scope is small enough that a single SELECT is fine.

import { getAgentsDb } from "../supabase-client";
import { initWelford, pushSample, computeZ, type WelfordState, type ZScoreOutcome } from "./z-score-computer";
import type { AnomalyScope, AnomalyMetric, AnomalyWindow, BaselineStats } from "./types";

export interface BaselineResult {
  scope: AnomalyScope;
  metric: AnomalyMetric;
  time_window: AnomalyWindow;
  current_value: number;
  outcome: ZScoreOutcome;
  baseline: BaselineStats;
}

interface AuthRow {
  id: string;
  amount_cents: number;
  merchant_name: string | null;
  merchant_category: string | null;
  created_at: string;
}

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const WINDOW_DAYS = 30;

/** Daily-spend-cents baseline: "how much does this scope spend in a day?"
 *  Current = today's partial total. Baseline = last 30 completed days. */
export async function buildDailySpendBaseline(scope: AnomalyScope): Promise<BaselineResult | null> {
  const db = getAgentsDb();
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const windowStart = new Date(todayStart.getTime() - WINDOW_DAYS * DAY_MS);

  const filter = scopeToEqCol(scope.scope_type);
  const { data, error } = await db
    .from("card_authorizations")
    .select("id, amount_cents, merchant_name, merchant_category, created_at")
    .eq(filter.col, filter.value(scope))
    .eq("decision", "approved")
    .is("deleted_at", null)
    .gte("created_at", windowStart.toISOString())
    .lte("created_at", now.toISOString())
    .order("created_at", { ascending: true });
  if (error) throw new Error(`baseline.daily_spend: ${error.message}`);
  const rows = (data ?? []) as AuthRow[];
  if (rows.length === 0) return null;

  // Bucket by UTC day.
  const byDay = new Map<string, number>();
  for (const r of rows) {
    const d = new Date(r.created_at);
    const k = d.toISOString().slice(0, 10);
    byDay.set(k, (byDay.get(k) ?? 0) + Number(r.amount_cents));
  }

  const todayKey = now.toISOString().slice(0, 10);
  const currentValue = byDay.get(todayKey) ?? 0;

  const state: WelfordState = initWelford();
  byDay.forEach((v, k) => { if (k !== todayKey) pushSample(state, v, k); });

  const outcome = computeZ(state, currentValue);
  return {
    scope,
    metric: "daily_spend_cents",
    time_window: "24h",
    current_value: currentValue,
    outcome,
    baseline: {
      mean: outcome.mean,
      stddev: outcome.stddev,
      sample_count: outcome.sample_count,
      last_sample_at: state.last_sample_at ?? new Date(0).toISOString(),
      computed_at: now.toISOString(),
    },
  };
}

/** Hourly auth-count baseline: "how many auths per hour does this scope do?"
 *  Current = this hour. Baseline = last 30 × 24 completed hours. */
export async function buildHourlyAuthCountBaseline(scope: AnomalyScope): Promise<BaselineResult | null> {
  const db = getAgentsDb();
  const now = new Date();
  const hourStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours()));
  const windowStart = new Date(hourStart.getTime() - WINDOW_DAYS * 24 * HOUR_MS);

  const filter = scopeToEqCol(scope.scope_type);
  const { data, error } = await db
    .from("card_authorizations")
    .select("id, created_at")
    .eq(filter.col, filter.value(scope))
    .is("deleted_at", null)
    .gte("created_at", windowStart.toISOString())
    .lte("created_at", now.toISOString())
    .order("created_at", { ascending: true });
  if (error) throw new Error(`baseline.hourly_auth_count: ${error.message}`);
  const rows = (data ?? []) as Array<{ id: string; created_at: string }>;
  if (rows.length === 0) return null;

  // Bucket by UTC hour.
  const byHour = new Map<string, number>();
  for (const r of rows) {
    const d = new Date(r.created_at);
    const k = `${d.toISOString().slice(0, 13)}Z`;
    byHour.set(k, (byHour.get(k) ?? 0) + 1);
  }

  const thisHourKey = `${hourStart.toISOString().slice(0, 13)}Z`;
  const currentValue = byHour.get(thisHourKey) ?? 0;

  const state = initWelford();
  byHour.forEach((v, k) => { if (k !== thisHourKey) pushSample(state, v, k); });

  const outcome = computeZ(state, currentValue);
  return {
    scope,
    metric: "auth_count_1h",
    time_window: "1h",
    current_value: currentValue,
    outcome,
    baseline: {
      mean: outcome.mean,
      stddev: outcome.stddev,
      sample_count: outcome.sample_count,
      last_sample_at: state.last_sample_at ?? new Date(0).toISOString(),
      computed_at: now.toISOString(),
    },
  };
}

/** Distinct-merchants-per-day: proxy for "new merchant burst". Current =
 *  distinct merchants seen in the last 24h. Baseline = distinct merchants
 *  per 24h over last 30 days. */
export async function buildDistinctMerchantsBaseline(scope: AnomalyScope): Promise<BaselineResult | null> {
  const db = getAgentsDb();
  const now = new Date();
  const windowStart = new Date(now.getTime() - (WINDOW_DAYS + 1) * DAY_MS);

  const filter = scopeToEqCol(scope.scope_type);
  const { data, error } = await db
    .from("card_authorizations")
    .select("id, merchant_name, merchant_category, created_at")
    .eq(filter.col, filter.value(scope))
    .eq("decision", "approved")
    .is("deleted_at", null)
    .gte("created_at", windowStart.toISOString())
    .lte("created_at", now.toISOString());
  if (error) throw new Error(`baseline.distinct_merchants: ${error.message}`);
  const rows = (data ?? []) as AuthRow[];
  if (rows.length === 0) return null;

  // Group merchants by day, compute distinct count per day.
  const byDay = new Map<string, Set<string>>();
  for (const r of rows) {
    const day = new Date(r.created_at).toISOString().slice(0, 10);
    const key = `${r.merchant_name ?? ""}::${r.merchant_category ?? ""}`;
    const set = byDay.get(day) ?? new Set<string>();
    set.add(key);
    byDay.set(day, set);
  }

  const todayKey = now.toISOString().slice(0, 10);
  const currentValue = (byDay.get(todayKey) ?? new Set()).size;

  const state = initWelford();
  byDay.forEach((v, k) => { if (k !== todayKey) pushSample(state, v.size, k); });

  const outcome = computeZ(state, currentValue);
  return {
    scope,
    metric: "distinct_merchants_24h",
    time_window: "24h",
    current_value: currentValue,
    outcome,
    baseline: {
      mean: outcome.mean,
      stddev: outcome.stddev,
      sample_count: outcome.sample_count,
      last_sample_at: state.last_sample_at ?? new Date(0).toISOString(),
      computed_at: now.toISOString(),
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function scopeToEqCol(scope_type: "agent" | "card" | "org"): { col: string; value: (s: AnomalyScope) => string } {
  if (scope_type === "card") return { col: "card_id", value: (s) => s.scope_ref };
  if (scope_type === "agent") {
    // card_authorizations doesn't have agent_id directly; it flows through
    // issued_cards.agent_id. We denormalize at query time by joining.
    // For scope=agent we use a different path — see buildForAgent.
    return { col: "card_id", value: () => { throw new Error("use buildForAgent"); } };
  }
  return { col: "organization_id", value: (s) => s.organization_id };
}
