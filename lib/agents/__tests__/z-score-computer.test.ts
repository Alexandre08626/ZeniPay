// Z-score computer unit tests.
//
// Welford correctness is verified against a naive two-pass reference
// (compute mean, then sum of (x-mean)^2) — same result up to float precision.
// Cold-start + zero-variance are the security-critical edge cases.

import { describe, it, expect } from "vitest";
import { computeZScore, initWelford, pushSample, stddev, computeZ } from "../fraud/z-score-computer";

describe("z-score-computer", () => {
  describe("Welford correctness", () => {
    it("matches a naive two-pass on a synthetic 30-sample series", () => {
      const xs = Array.from({ length: 30 }, (_, i) => (i * 17) % 100);
      const mean = xs.reduce((s, v) => s + v, 0) / xs.length;
      const variance = xs.reduce((s, v) => s + (v - mean) ** 2, 0) / xs.length;
      const naiveSd = Math.sqrt(variance);

      const state = initWelford();
      for (const v of xs) pushSample(state, v);
      expect(state.mean).toBeCloseTo(mean, 10);
      expect(stddev(state)).toBeCloseTo(naiveSd, 10);
    });

    it("tracks min/max + last_sample_at", () => {
      const state = initWelford();
      pushSample(state, 5, "2026-01-01");
      pushSample(state, 15, "2026-01-03");
      pushSample(state, 10, "2026-01-02");
      expect(state.min).toBe(5);
      expect(state.max).toBe(15);
      expect(state.last_sample_at).toBe("2026-01-03");
    });
  });

  describe("cold-start", () => {
    it("returns z=null + cold=true when <7 samples", () => {
      for (let n = 0; n <= 6; n++) {
        const history = Array(n).fill(10);
        const out = computeZScore(history, 100);
        expect(out.cold).toBe(true);
        expect(out.z).toBeNull();
        expect(out.reason).toBe("cold_start");
      }
    });

    it("activates at exactly 7 samples", () => {
      const history = Array(7).fill(10);
      const out = computeZScore(history, 20);
      // All samples are 10 → stddev=0 → zero_variance branch
      expect(out.cold).toBe(false);
      expect(out.z).toBeNull();
      expect(out.reason).toBe("zero_variance");
    });
  });

  describe("zero-variance", () => {
    it("returns z=null with reason=zero_variance", () => {
      const out = computeZScore([10, 10, 10, 10, 10, 10, 10], 100);
      expect(out.z).toBeNull();
      expect(out.stddev).toBe(0);
      expect(out.mean).toBe(10);
      expect(out.cold).toBe(false);
      expect(out.reason).toBe("zero_variance");
    });
  });

  describe("real z-score", () => {
    it("flags an outlier with positive z well above threshold", () => {
      const history = [90, 100, 110, 95, 105, 100, 100, 90, 110, 100];
      const out = computeZScore(history, 130);
      expect(out.z).not.toBeNull();
      expect(out.z as number).toBeGreaterThan(3);
      expect(out.cold).toBe(false);
    });

    it("returns negative z for a suppressed current value", () => {
      const history = [100, 100, 100, 100, 100, 100, 100, 100, 200];
      const out = computeZScore(history, 0);
      expect(out.z).not.toBeNull();
      expect(out.z as number).toBeLessThan(0);
    });
  });

  describe("computeZ (running state)", () => {
    it("lets callers update a baseline incrementally", () => {
      const s = initWelford();
      for (let i = 0; i < 30; i++) pushSample(s, 100 + (i % 5));
      const outcome = computeZ(s, 150);
      expect(outcome.cold).toBe(false);
      expect(outcome.z).not.toBeNull();
      expect(outcome.sample_count).toBe(30);
    });
  });
});
