// Pure z-score computation via Welford's online algorithm.
//
// Why Welford: two-pass mean/variance accumulates floating-point error on
// long windows. Welford is numerically stable AND streams — you can feed it
// one sample at a time without keeping the whole array in memory. That
// matches our batch-the-cron pattern: we iterate rows from the DB and push
// each into the accumulator instead of materialising arrays for 30-day
// windows with 10K+ rows.
//
// Cold-start semantics (DECISION 2):
//   - window has fewer than BASELINE_MIN_SAMPLES points: return
//     { stddev: 0, mean: …, cold: true }. Callers MUST treat cold=true as
//     "unknown" — no z-score, no alert, no decline in authorize.ts.
//   - stddev=0 (all samples identical): z-score is undefined; return null.
//     Happens legitimately on new cards with one repeated merchant.

import { BASELINE_MIN_SAMPLES } from "./types";

export interface WelfordState {
  count: number;
  mean: number;
  m2: number;   // sum of squared deviations from the mean
  min: number;
  max: number;
  last_sample_at: string | null;
}

export function initWelford(): WelfordState {
  return { count: 0, mean: 0, m2: 0, min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY, last_sample_at: null };
}

/** Fold a new sample into the running statistics. Returns the same state
 *  mutated in place (cheap — no allocations in hot path). */
export function pushSample(state: WelfordState, value: number, sampledAt?: string): WelfordState {
  state.count += 1;
  const delta = value - state.mean;
  state.mean += delta / state.count;
  const delta2 = value - state.mean;    // post-mean-update delta
  state.m2 += delta * delta2;
  if (value < state.min) state.min = value;
  if (value > state.max) state.max = value;
  if (sampledAt && (!state.last_sample_at || sampledAt > state.last_sample_at)) {
    state.last_sample_at = sampledAt;
  }
  return state;
}

/** Population standard deviation (n, not n-1). Matches what the DB value
 *  represents: we observe every auth in the window, not a sample. */
export function stddev(state: WelfordState): number {
  if (state.count < 2) return 0;
  return Math.sqrt(state.m2 / state.count);
}

export interface ZScoreOutcome {
  z: number | null;               // null on cold start or zero variance
  mean: number;
  stddev: number;
  sample_count: number;
  cold: boolean;                  // true → caller must not alert on this scope
  reason?: "cold_start" | "zero_variance";
}

/** Given a running state and a candidate current value, compute the z-score. */
export function computeZ(state: WelfordState, currentValue: number): ZScoreOutcome {
  if (state.count < BASELINE_MIN_SAMPLES) {
    return {
      z: null, mean: state.mean, stddev: stddev(state),
      sample_count: state.count, cold: true, reason: "cold_start",
    };
  }
  const sd = stddev(state);
  if (sd === 0) {
    return {
      z: null, mean: state.mean, stddev: 0,
      sample_count: state.count, cold: false, reason: "zero_variance",
    };
  }
  const z = (currentValue - state.mean) / sd;
  return { z, mean: state.mean, stddev: sd, sample_count: state.count, cold: false };
}

/** Convenience: compute z-score from an array of historical values + current. */
export function computeZScore(history: number[], current: number): ZScoreOutcome {
  const s = initWelford();
  for (const v of history) pushSample(s, v);
  return computeZ(s, current);
}
