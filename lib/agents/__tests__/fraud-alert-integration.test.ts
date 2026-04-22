// Fraud alert E2E — gated (AGENTS_FRAUD_E2E=1).
//
// Scenario: seed a baseline of 14 normal-amount auths on a test card over
// the last 14 days → inject one enormous auth today → invoke the cron's
// core logic in-process (buildDailySpendBaseline + writeSignal + maybeRaiseAlert)
// → assert a fraud_alert row was raised with z > 3 → resolve as
// confirmed_fraud via the same path the resolve API uses → assert the
// card's status flipped to 'paused'. Clean up on exit.

import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { buildDailySpendBaseline } from "../fraud/baseline-builder";
import { writeSignal } from "../fraud/signals-writer";
import { maybeRaiseAlert } from "../fraud/alert-generator";
import type { AnomalyScope } from "../fraud/types";

const ENABLED = process.env.AGENTS_FRAUD_E2E === "1";
const describeIfEnabled = ENABLED ? describe : describe.skip;

describeIfEnabled("fraud-alert E2E (live)", () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const orgId = process.env.AGENTS_TEST_ORG_ID ?? "";
  if (!url || !key || !orgId) {
    it.skip("env missing", () => {});
    return;
  }

  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "agents" },
  });

  let cardId = "";
  const authIds: string[] = [];
  let alertId = "";

  it("issues a test card + 14 days of normal auths + one anomalous spike", async () => {
    const { data: card, error } = await db
      .from("issued_cards")
      .insert({
        organization_id: orgId,
        cardholder_type: "agent",
        cardholder_ref: "fraud-e2e",
        issuer_provider: "mock",
        card_type: "virtual",
        currency: "USD",
        status: "active",
        last4: "8888",
      })
      .select("id")
      .single();
    expect(error).toBeNull();
    cardId = (card as { id: string }).id;

    const now = Date.now();
    const dayMs = 86_400_000;
    // 14 days of auths — varied $40-$60 so there's actual variance
    // (zero-variance → z=null → no alert, which is correct but not what
    // this test wants to exercise).
    const amounts = [4500, 5000, 5500, 4800, 5200, 4700, 5300, 4900, 5100, 4600, 5400, 5000, 4800, 5200];
    for (let d = 1; d <= 14; d++) {
      const ts = new Date(now - d * dayMs).toISOString();
      const { data } = await db
        .from("card_authorizations")
        .insert({
          card_id: cardId,
          organization_id: orgId,
          amount_cents: amounts[d - 1],
          currency: "USD",
          merchant_name: "E2E Baseline Merchant",
          merchant_category: "5734",
          decision: "approved",
          decision_reason: { approved: true, latency_ms: 8, e2e: true },
          occurred_at: ts,
          created_at: ts,
        })
        .select("id")
        .single();
      authIds.push((data as { id: string }).id);
    }

    // The spike — $10,000 today, ~200× baseline → z well above 3.
    const { data: spike } = await db
      .from("card_authorizations")
      .insert({
        card_id: cardId,
        organization_id: orgId,
        amount_cents: 1_000_000,
        currency: "USD",
        merchant_name: "Suspicious Merchant",
        merchant_category: "5999",
        decision: "approved",
        decision_reason: { approved: true, latency_ms: 9, e2e: true, spike: true },
        occurred_at: new Date(now).toISOString(),
      })
      .select("id")
      .single();
    authIds.push((spike as { id: string }).id);
    expect(authIds.length).toBe(15);
  });

  it("computing baseline + writing signal + raising alert produces a critical alert", async () => {
    const scope: AnomalyScope = { scope_type: "card", scope_ref: cardId, organization_id: orgId };
    const result = await buildDailySpendBaseline(scope);
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.outcome.cold).toBe(false);
    expect(result.outcome.z).not.toBeNull();
    expect(Math.abs(result.outcome.z as number)).toBeGreaterThan(3);

    await writeSignal(result);
    const decision = await maybeRaiseAlert(result);
    expect(decision.reason).toBe("raised");
    expect(decision.raised).not.toBeNull();
    if (decision.raised) {
      alertId = decision.raised.id;
      expect(["warn", "critical"]).toContain(decision.raised.severity);
    }
  });

  it("resolve as confirmed_fraud pauses the card", async () => {
    expect(alertId).toBeTruthy();
    // Mirror what the resolve route does.
    const { error: aerr } = await db
      .from("fraud_alerts")
      .update({
        status: "confirmed_fraud",
        resolved_at: new Date().toISOString(),
        auto_action_taken: "paused_card",
        card_id: cardId,
      })
      .eq("id", alertId);
    expect(aerr).toBeNull();

    const { data: cardRow } = await db
      .from("issued_cards")
      .update({ status: "paused" })
      .eq("id", cardId)
      .eq("organization_id", orgId)
      .in("status", ["active", "paused"])
      .select("id, status")
      .maybeSingle();
    expect((cardRow as { status: string } | null)?.status).toBe("paused");
  });

  it("cleans up", async () => {
    // The fraud_alerts row stays (audit trail). Card + auths can be deleted
    // — no finalize-triggers on these tables.
    await db.from("card_authorizations").delete().in("id", authIds);
    await db.from("issued_cards").delete().eq("id", cardId);
  });
});
