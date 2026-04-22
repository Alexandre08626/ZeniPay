import { describe, it, expect } from "vitest";
import { evaluate, type ApprovalPolicyRow } from "../approvals/policy-evaluator";

const policy = (overrides: Partial<ApprovalPolicyRow> = {}): ApprovalPolicyRow => ({
  id: "apo_x",
  organization_id: "org_x",
  name: "test",
  trigger_type: "amount_threshold",
  trigger_config: { threshold_cents: 100_00 },
  approver_type: "owner_only",
  approver_config: {},
  timeout_seconds: 900,
  default_action: "deny",
  active: true,
  priority: 100,
  ...overrides,
});

const ctx = (overrides: Partial<Parameters<typeof evaluate>[0]> = {}) => ({
  amountCents: 5000, currency: "USD", occurredAt: new Date("2026-04-21T14:00:00Z"), ...overrides,
});

describe("approval policy evaluator", () => {
  it("returns no approval when no policy matches", () => {
    const r = evaluate(ctx({ amountCents: 1000 }), [policy()]);
    expect(r.requires_approval).toBe(false);
    expect(r.matched_policy_id).toBeNull();
  });

  it("fires on amount_threshold at or above cents", () => {
    const r = evaluate(ctx({ amountCents: 10_000 }), [policy()]);
    expect(r.requires_approval).toBe(true);
    expect(r.reason).toBe("policy:amount_threshold:amount>=10000");
  });

  it("respects priority ordering (lower = higher precedence)", () => {
    const r = evaluate(ctx({ amountCents: 50_000 }), [
      policy({ id: "second", priority: 100, trigger_config: { threshold_cents: 10_000 } }),
      policy({ id: "first",  priority: 1,   trigger_config: { threshold_cents: 5_000 } }),
    ]);
    expect(r.matched_policy_id).toBe("first");
  });

  it("ignores inactive policies", () => {
    const r = evaluate(ctx({ amountCents: 999999 }), [policy({ active: false })]);
    expect(r.requires_approval).toBe(false);
  });

  it("fires on merchant_category", () => {
    const r = evaluate(
      ctx({ merchantCategory: "7995" }),
      [policy({ trigger_type: "merchant_category", trigger_config: { mccs: ["7995"] } })],
    );
    expect(r.requires_approval).toBe(true);
    expect(r.reason).toContain("merchant_category");
  });

  it("fires on new_merchant when merchant not in seen list", () => {
    const r = evaluate(
      ctx({ merchantName: "weird.shop" }),
      [policy({ trigger_type: "new_merchant", trigger_config: { seen_merchants: ["openai.com"] } })],
    );
    expect(r.requires_approval).toBe(true);
  });

  it("does not fire on new_merchant when merchant already seen", () => {
    const r = evaluate(
      ctx({ merchantName: "openai.com" }),
      [policy({ trigger_type: "new_merchant", trigger_config: { seen_merchants: ["openai.com"] } })],
    );
    expect(r.requires_approval).toBe(false);
  });

  it("fires on off_hours with wraparound (22:00 → 06:00 UTC)", () => {
    const atNight = new Date("2026-04-22T03:00:00Z");
    const r = evaluate(
      ctx({ occurredAt: atNight }),
      [policy({ trigger_type: "off_hours", trigger_config: { timezone: "UTC", start: "22:00", end: "06:00" } })],
    );
    expect(r.requires_approval).toBe(true);
  });

  it("does not fire on off_hours during day", () => {
    const atDay = new Date("2026-04-22T15:00:00Z");
    const r = evaluate(
      ctx({ occurredAt: atDay }),
      [policy({ trigger_type: "off_hours", trigger_config: { timezone: "UTC", start: "22:00", end: "06:00" } })],
    );
    expect(r.requires_approval).toBe(false);
  });

  it("fires on anomaly_score at threshold", () => {
    const r = evaluate(
      ctx({ anomalyScore: 4.5 }),
      [policy({ trigger_type: "anomaly_score", trigger_config: { threshold: 4 } })],
    );
    expect(r.requires_approval).toBe(true);
    expect(r.reason).toContain("z>=4");
  });

  it("required_signatures=1 for single-approver policies", () => {
    const r = evaluate(ctx({ amountCents: 10_000 }), [policy({ approver_type: "owner_only" })]);
    expect(r.required_signatures).toBe(1);
  });

  it("required_signatures comes from approver_config.min_approvals for multi_sig", () => {
    const r = evaluate(ctx({ amountCents: 10_000 }), [policy({
      approver_type: "multi_sig", approver_config: { min_approvals: 3 },
    })]);
    expect(r.required_signatures).toBe(3);
  });

  it("multi_sig defaults to 2 when min_approvals missing", () => {
    const r = evaluate(ctx({ amountCents: 10_000 }), [policy({ approver_type: "multi_sig" })]);
    expect(r.required_signatures).toBe(2);
  });
});
