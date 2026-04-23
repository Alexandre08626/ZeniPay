// End-to-end smoke for PR 8 Money IN via Finix Card.
//
// Gated: skipped unless AGENTS_FUNDING_E2E=1. The tests hit a real ZeniPay
// preview / sandbox deploy and exercise the full path:
//
//   POST /api/v1/agents/treasury/fund-sources    (register card)
//   POST /api/v1/agents/treasury/fund-sources/[id]/verify
//   POST /api/v1/agents/treasury/fund/card       (happy path + decline + replay)
//   GET  /api/v1/agents/treasury/events          (verify state transitions)
//   RPC  zc_get_accounts / zc_verify_chain_integrity (SQL assertions)
//
// Required env:
//   AGENTS_FUNDING_E2E=1
//   BASE_URL                         e.g. https://<preview>.vercel.app
//   E2E_ORG_ID                       organization under test
//   E2E_USER_ID                      UUID for x-zp-agents-user
//   E2E_FINIX_SANDBOX_SUCCESS_PI     pre-existing Finix sandbox PI that succeeds
//   E2E_FINIX_SANDBOX_DECLINE_PI     pre-existing Finix sandbox PI that declines
//   E2E_FINIX_IDENTITY_ID            matching Finix identity
//   SUPABASE_URL                     (service-role queries)
//   SUPABASE_SERVICE_ROLE_KEY
//
// Optional:
//   E2E_FOREIGN_ORG_ID               a second org used to test cross-org isolation
//
// Run:  AGENTS_FUNDING_E2E=1 BASE_URL=... npx vitest run tests/funding-card-e2e.test.ts

import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

const GATED = process.env.AGENTS_FUNDING_E2E === "1";
const d = GATED ? describe : describe.skip;

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const ORG = process.env.E2E_ORG_ID ?? "";
const USER = process.env.E2E_USER_ID ?? "";
const PI_OK = process.env.E2E_FINIX_SANDBOX_SUCCESS_PI ?? "";
const PI_DECLINE = process.env.E2E_FINIX_SANDBOX_DECLINE_PI ?? "";
const IDENTITY = process.env.E2E_FINIX_IDENTITY_ID ?? "";
const FOREIGN_ORG = process.env.E2E_FOREIGN_ORG_ID ?? "";
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

async function api(path: string, init: RequestInit & { org?: string } = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-zp-agents-org", init.org ?? ORG);
  if (USER) headers.set("x-zp-agents-user", USER);
  headers.set("content-type", "application/json");
  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  const body = await res.text();
  let json: unknown = body;
  try { json = JSON.parse(body); } catch { /* non-JSON body */ }
  return { status: res.status, json: json as Record<string, unknown>, raw: body };
}

function supa() {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("SUPABASE_URL / SERVICE_ROLE_KEY missing");
  return createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function treasuryBalanceCents(orgId: string, currency: string): Promise<number> {
  const { data, error } = await supa().rpc("zc_get_accounts", { p_organization_id: orgId });
  if (error) throw error;
  const rows = (data ?? []) as Array<{ owner_type: string; currency: string; balance_micro: string }>;
  const treasuryRow = rows.find((r) => r.owner_type === "org_treasury" && r.currency.trim() === currency);
  if (!treasuryRow) return 0;
  return Math.round(Number(treasuryRow.balance_micro) / 10_000); // micro → cents
}

d("PR 8 — Money IN via Finix Card (E2E)", () => {
  let fundingSourceId = "";
  let declineFundingSourceId = "";

  beforeAll(() => {
    const missing = [
      ["BASE_URL", BASE_URL], ["E2E_ORG_ID", ORG], ["E2E_FINIX_SANDBOX_SUCCESS_PI", PI_OK],
      ["E2E_FINIX_IDENTITY_ID", IDENTITY], ["SUPABASE_URL", SUPABASE_URL],
      ["SUPABASE_SERVICE_ROLE_KEY", SUPABASE_KEY],
    ].filter(([, v]) => !v).map(([k]) => k);
    if (missing.length) throw new Error(`Missing env: ${missing.join(", ")}`);
  });

  it("registers + verifies a card funding source", async () => {
    const res = await api("/api/v1/agents/treasury/fund-sources", {
      method: "POST",
      body: JSON.stringify({
        label: `e2e-success-${Date.now()}`,
        currency: "CAD",
        finix_tokenization_result: {
          payment_instrument_id: PI_OK,
          identity_id: IDENTITY,
          last4: "4242",
          brand: "VISA",
        },
      }),
    });
    expect(res.status, JSON.stringify(res.json)).toBe(200);
    fundingSourceId = String(res.json.funding_source_id);
    expect(fundingSourceId).toMatch(/^fs_/);

    const verify = await api(`/api/v1/agents/treasury/fund-sources/${fundingSourceId}/verify`, {
      method: "POST", body: JSON.stringify({}),
    });
    expect(verify.status).toBe(200);
    expect(verify.json.status).toBe("verified");
  });

  it("funds $100 CAD and credits the treasury synchronously", async () => {
    const before = await treasuryBalanceCents(ORG, "CAD");
    const idempotencyKey = `e2e-fund-${Date.now()}`;
    const fund = await api("/api/v1/agents/treasury/fund/card", {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({
        funding_source_id: fundingSourceId,
        amount_units: 100,
        currency: "CAD",
        idempotency_key: idempotencyKey,
      }),
    });
    expect(fund.status, JSON.stringify(fund.json)).toBe(200);

    // Wait up to 30s for async credit if PENDING.
    const end = Date.now() + 30_000;
    let credited = false;
    while (Date.now() < end) {
      const now = await treasuryBalanceCents(ORG, "CAD");
      if (now >= before + 10_000) { credited = true; break; }
      await new Promise((r) => setTimeout(r, 2000));
    }
    expect(credited, `treasury did not credit within 30s (before=${before}¢)`).toBe(true);

    const integrity = await supa().rpc("zc_verify_chain_integrity", { p_start_at: null });
    expect(integrity.error).toBeNull();
    const row = ((integrity.data as Array<{ total_entries: number; verified_entries: number }>) ?? [])[0];
    expect(row?.total_entries).toBe(row?.verified_entries);

    const events = await api("/api/v1/agents/treasury/events?limit=50");
    const list = (events.json.funding_events as Array<{ state: string; funding_source_id: string | null }>) ?? [];
    expect(list.some((e) => e.funding_source_id === fundingSourceId && e.state === "credited")).toBe(true);
  });

  it("replaying the same idempotency_key does not double-credit", async () => {
    const idempotencyKey = `e2e-replay-${Date.now()}`;
    const first = await api("/api/v1/agents/treasury/fund/card", {
      method: "POST", headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ funding_source_id: fundingSourceId, amount_units: 50, currency: "CAD", idempotency_key: idempotencyKey }),
    });
    expect(first.status).toBe(200);
    const balanceAfterFirst = await treasuryBalanceCents(ORG, "CAD");

    const replay = await api("/api/v1/agents/treasury/fund/card", {
      method: "POST", headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ funding_source_id: fundingSourceId, amount_units: 50, currency: "CAD", idempotency_key: idempotencyKey }),
    });
    // Either Finix returns the cached SUCCEEDED (200) or the wrapper flags duplicate.
    expect([200, 422]).toContain(replay.status);
    await new Promise((r) => setTimeout(r, 3000));
    const balanceAfterReplay = await treasuryBalanceCents(ORG, "CAD");
    expect(balanceAfterReplay).toBe(balanceAfterFirst);
  });

  (FOREIGN_ORG ? it : it.skip)("rejects funding with a funding_source_id from a different org", async () => {
    const res = await api("/api/v1/agents/treasury/fund/card", {
      method: "POST", headers: { "Idempotency-Key": `e2e-xorg-${Date.now()}` },
      body: JSON.stringify({
        funding_source_id: fundingSourceId,  // belongs to ORG, not FOREIGN_ORG
        amount_units: 10, currency: "CAD",
        idempotency_key: `e2e-xorg-${Date.now()}`,
      }),
      org: FOREIGN_ORG,
    });
    expect(res.status).toBe(403);
    const err = res.json.error as { code: string; message: string } | undefined;
    expect(err?.code).toBe("forbidden");
  });

  (PI_DECLINE ? it : it.skip)("logs a failed funding_event on a declined card", async () => {
    const reg = await api("/api/v1/agents/treasury/fund-sources", {
      method: "POST",
      body: JSON.stringify({
        label: `e2e-decline-${Date.now()}`, currency: "CAD",
        finix_tokenization_result: { payment_instrument_id: PI_DECLINE, identity_id: IDENTITY, last4: "0002", brand: "VISA" },
      }),
    });
    expect(reg.status).toBe(200);
    declineFundingSourceId = String(reg.json.funding_source_id);
    const vr = await api(`/api/v1/agents/treasury/fund-sources/${declineFundingSourceId}/verify`, { method: "POST", body: JSON.stringify({}) });
    expect(vr.status).toBe(200);

    const before = await treasuryBalanceCents(ORG, "CAD");
    const key = `e2e-decline-${Date.now()}`;
    const fund = await api("/api/v1/agents/treasury/fund/card", {
      method: "POST", headers: { "Idempotency-Key": key },
      body: JSON.stringify({ funding_source_id: declineFundingSourceId, amount_units: 100, currency: "CAD", idempotency_key: key }),
    });
    expect(fund.status).toBeGreaterThanOrEqual(400);
    const after = await treasuryBalanceCents(ORG, "CAD");
    expect(after).toBe(before);

    const events = await api("/api/v1/agents/treasury/events?limit=50");
    const list = (events.json.funding_events as Array<{ state: string; funding_source_id: string | null }>) ?? [];
    expect(list.some((e) => e.funding_source_id === declineFundingSourceId && e.state === "failed")).toBe(true);
  });
});
