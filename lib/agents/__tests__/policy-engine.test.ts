import { describe, it, expect } from "vitest";
import {
  validateTransaction,
  isInUtcTimeWindow,
  type ValidateTransactionInput,
} from "../policy-engine";
import type { AgentPolicy, AgentWallet } from "../types";

const wallet = (balanceCents = 100_000): AgentWallet => ({
  id: "wlt_x",
  agent_id: "agt_x",
  organization_id: "org_x",
  balance_cents: balanceCents,
  currency: "USD",
  finix_balance_ref: null,
  created_at: "",
  updated_at: "",
});

const policy = (overrides: Partial<AgentPolicy> = {}): AgentPolicy => ({
  id: "pol_x",
  wallet_id: "wlt_x",
  organization_id: "org_x",
  monthly_budget_cents: null,
  daily_cap_cents: null,
  per_tx_cap_cents: null,
  merchant_whitelist: [],
  merchant_blacklist: [],
  allowed_categories: [],
  time_window_start: null,
  time_window_end: null,
  active: true,
  created_at: "",
  updated_at: "",
  ...overrides,
});

const baseInput = (overrides: Partial<ValidateTransactionInput> = {}): ValidateTransactionInput => ({
  wallet: wallet(),
  policy: policy(),
  amountCents: 1000,
  merchantId: "merchant_abc",
  category: "api_call",
  timestamp: new Date("2026-04-21T12:00:00Z"),
  monthToDateSpendCents: 0,
  dayToDateSpendCents: 0,
  ...overrides,
});

describe("policy-engine.validateTransaction — happy path", () => {
  it("approves when wallet has balance and no policy", () => {
    const r = validateTransaction(baseInput({ policy: null }));
    expect(r.approved).toBe(true);
    expect(r.reason).toBe("approved");
  });

  it("approves when all rules pass", () => {
    const r = validateTransaction(
      baseInput({
        policy: policy({
          monthly_budget_cents: 500_000,
          daily_cap_cents: 50_000,
          per_tx_cap_cents: 5_000,
          merchant_whitelist: ["merchant_abc"],
          allowed_categories: ["api_call"],
        }),
      }),
    );
    expect(r.approved).toBe(true);
  });
});

describe("policy-engine.validateTransaction — rejections", () => {
  it("rejects invalid amounts", () => {
    expect(validateTransaction(baseInput({ amountCents: 0 })).approved).toBe(false);
    expect(validateTransaction(baseInput({ amountCents: -5 })).approved).toBe(false);
    expect(validateTransaction(baseInput({ amountCents: 1.5 })).approved).toBe(false);
  });

  it("rejects when wallet balance < amount", () => {
    const r = validateTransaction(baseInput({ wallet: wallet(100), amountCents: 500 }));
    expect(r.approved).toBe(false);
    expect(r.checks.find((c) => c.rule === "wallet_balance")?.pass).toBe(false);
  });

  it("rejects when policy is inactive", () => {
    const r = validateTransaction(baseInput({ policy: policy({ active: false }) }));
    expect(r.approved).toBe(false);
    expect(r.reason).toBe("policy_inactive");
  });

  it("rejects when over per-tx cap", () => {
    const r = validateTransaction(
      baseInput({ amountCents: 10_000, policy: policy({ per_tx_cap_cents: 5_000 }) }),
    );
    expect(r.approved).toBe(false);
    expect(r.reason).toBe("per_tx_cap");
  });

  it("rejects when projected daily spend exceeds cap", () => {
    const r = validateTransaction(
      baseInput({
        amountCents: 1_000,
        policy: policy({ daily_cap_cents: 5_000 }),
        dayToDateSpendCents: 4_500,
      }),
    );
    expect(r.approved).toBe(false);
    expect(r.reason).toBe("daily_cap");
  });

  it("rejects when projected monthly spend exceeds budget", () => {
    const r = validateTransaction(
      baseInput({
        amountCents: 1_000,
        policy: policy({ monthly_budget_cents: 50_000 }),
        monthToDateSpendCents: 49_500,
      }),
    );
    expect(r.approved).toBe(false);
    expect(r.reason).toBe("monthly_budget");
  });

  it("rejects blacklisted merchant", () => {
    const r = validateTransaction(
      baseInput({
        merchantId: "bad",
        policy: policy({ merchant_blacklist: ["bad"] }),
      }),
    );
    expect(r.approved).toBe(false);
    expect(r.reason).toBe("merchant_blacklist");
  });

  it("rejects non-whitelisted merchant", () => {
    const r = validateTransaction(
      baseInput({
        merchantId: "other",
        policy: policy({ merchant_whitelist: ["only_me"] }),
      }),
    );
    expect(r.approved).toBe(false);
    expect(r.reason).toBe("merchant_whitelist");
  });

  it("rejects disallowed category", () => {
    const r = validateTransaction(
      baseInput({
        category: "adult",
        policy: policy({ allowed_categories: ["api_call"] }),
      }),
    );
    expect(r.approved).toBe(false);
    expect(r.reason).toBe("allowed_categories");
  });

  it("rejects outside time window", () => {
    const r = validateTransaction(
      baseInput({
        timestamp: new Date("2026-04-21T23:00:00Z"),
        policy: policy({
          time_window_start: "09:00:00",
          time_window_end: "17:00:00",
        }),
      }),
    );
    expect(r.approved).toBe(false);
    expect(r.reason).toBe("time_window");
  });
});

describe("policy-engine.isInUtcTimeWindow", () => {
  it("works for a normal same-day window", () => {
    expect(isInUtcTimeWindow(new Date("2026-04-21T10:00:00Z"), "09:00:00", "17:00:00")).toBe(true);
    expect(isInUtcTimeWindow(new Date("2026-04-21T08:00:00Z"), "09:00:00", "17:00:00")).toBe(false);
    expect(isInUtcTimeWindow(new Date("2026-04-21T17:00:00Z"), "09:00:00", "17:00:00")).toBe(false);
  });

  it("wraps across midnight", () => {
    // 22:00 -> 06:00 window
    expect(isInUtcTimeWindow(new Date("2026-04-21T23:00:00Z"), "22:00:00", "06:00:00")).toBe(true);
    expect(isInUtcTimeWindow(new Date("2026-04-21T05:30:00Z"), "22:00:00", "06:00:00")).toBe(true);
    expect(isInUtcTimeWindow(new Date("2026-04-21T12:00:00Z"), "22:00:00", "06:00:00")).toBe(false);
  });

  it("returns true for a zero-width window (interpret as always-open)", () => {
    expect(isInUtcTimeWindow(new Date("2026-04-21T00:00:00Z"), "00:00:00", "00:00:00")).toBe(true);
  });
});
