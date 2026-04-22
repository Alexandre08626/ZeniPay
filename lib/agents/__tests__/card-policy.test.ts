// Pure policy unit tests — decides approve vs decline_* without touching
// the DB by exercising a trimmed, in-memory variant of authorizeCardSpend's
// decision rules. Keeps the Stripe webhook's sub-1500ms p95 honest: if any
// of these rules drift, the integration test flags it.

import { describe, it, expect } from "vitest";

type Control = {
  per_tx_cap_cents?: number;
  allowed_mcc?: string[];
  blocked_mcc?: string[];
  allowed_merchants?: string[];
  blocked_merchants?: string[];
  allowed_countries?: string[];
};
type Input = {
  amount_cents: number;
  merchant_category?: string;
  merchant_name?: string;
  merchant_country?: string;
  balance_cents: number;
  z_score: number | null;
  signals_age_s: number | null;
};

const MAX_AGE = 2 * 60 * 60;

function decide(i: Input, c: Control): string {
  if (c.blocked_mcc?.includes(i.merchant_category ?? "")) return "declined_merchant:mcc_blocked";
  if (c.allowed_mcc && c.allowed_mcc.length > 0 && !c.allowed_mcc.includes(i.merchant_category ?? "")) return "declined_merchant:mcc_not_allowed";
  if (c.allowed_countries && c.allowed_countries.length > 0 && !c.allowed_countries.includes(i.merchant_country ?? "")) return "declined_merchant:country_not_allowed";
  if (c.blocked_merchants?.includes(i.merchant_name ?? "")) return "declined_merchant:merchant_blocked";
  if (c.allowed_merchants && c.allowed_merchants.length > 0 && !c.allowed_merchants.includes(i.merchant_name ?? "")) return "declined_merchant:merchant_not_in_allowlist";
  if (c.per_tx_cap_cents != null && i.amount_cents > c.per_tx_cap_cents) return "declined_policy:over_per_tx_cap";
  if (i.signals_age_s != null && i.signals_age_s > MAX_AGE) return "declined_velocity:signals_not_ready";
  if (i.z_score != null && i.z_score > 6) return "declined_fraud:velocity_zscore_exceeded";
  if (i.balance_cents < i.amount_cents) return "declined_balance:insufficient_balance";
  return "approved";
}

describe("card-policy decision rules", () => {
  const base: Input = { amount_cents: 100, balance_cents: 10000, z_score: 0, signals_age_s: 60 };

  it("approves happy path", () => {
    expect(decide(base, {})).toBe("approved");
  });

  it("blocks travel MCC via explicit blocked_mcc", () => {
    expect(decide({ ...base, merchant_category: "4511" }, { blocked_mcc: ["4511"] }))
      .toBe("declined_merchant:mcc_blocked");
  });

  it("enforces allowlist when present", () => {
    expect(decide({ ...base, merchant_category: "5812" }, { allowed_mcc: ["5814"] }))
      .toBe("declined_merchant:mcc_not_allowed");
  });

  it("declines over per-tx cap", () => {
    expect(decide({ ...base, amount_cents: 500 }, { per_tx_cap_cents: 400 }))
      .toBe("declined_policy:over_per_tx_cap");
  });

  it("declines when wallet insufficient", () => {
    expect(decide({ ...base, amount_cents: 10001, balance_cents: 10000 }, {}))
      .toBe("declined_balance:insufficient_balance");
  });

  it("declines signals_not_ready when velocity signals are stale", () => {
    expect(decide({ ...base, signals_age_s: 3 * 60 * 60 }, {}))
      .toBe("declined_velocity:signals_not_ready");
  });

  it("declines on fraud z_score > 6", () => {
    expect(decide({ ...base, z_score: 7.5 }, {}))
      .toBe("declined_fraud:velocity_zscore_exceeded");
  });

  it("blocks merchants in blocked_merchants", () => {
    expect(decide({ ...base, merchant_name: "sketchycoin.io" }, { blocked_merchants: ["sketchycoin.io"] }))
      .toBe("declined_merchant:merchant_blocked");
  });

  it("respects merchant allowlist exclusivity", () => {
    expect(decide({ ...base, merchant_name: "openai.com" }, { allowed_merchants: ["anthropic.com"] }))
      .toBe("declined_merchant:merchant_not_in_allowlist");
  });

  it("respects country allowlist", () => {
    expect(decide({ ...base, merchant_country: "RU" }, { allowed_countries: ["US", "CA"] }))
      .toBe("declined_merchant:country_not_allowed");
  });
});
