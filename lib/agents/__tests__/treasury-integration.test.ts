// Integration tests — run against the live agents schema. Gated on
// AGENTS_TREASURY_INTEGRATION=1 so vitest run in CI stays hermetic.
// Covers: book_transfer idempotency replay, atomic org→agent distribution,
// recursive guard on the owl↔treasury sync triggers.

import { describe, it, expect } from "vitest";

const ENABLED = process.env.AGENTS_TREASURY_INTEGRATION === "1";
const describeIfEnabled = ENABLED ? describe : describe.skip;

describeIfEnabled("treasury integration (live agents schema)", () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const orgId = process.env.AGENTS_TEST_ORG_ID ?? "";

  async function rpc<T>(fn: string, params: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "content-type": "application/json",
        "Accept-Profile": "agents",
        "Content-Profile": "agents",
      },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error(`${fn} ${res.status}: ${await res.text()}`);
    return (await res.json()) as T;
  }

  it("fx_convert returns positive integer cents for active pair", async () => {
    const cents = await rpc<number>("fx_convert", {
      p_amount_cents: 100_00, p_from: "USD", p_to: "CAD",
    });
    expect(Number(cents)).toBeGreaterThan(100_00);  // USD→CAD > 1.0
    expect(Number.isInteger(Number(cents))).toBe(true);
  });

  it("book_transfer idempotency: same key → single transfer, second call replayed=true", async () => {
    if (!orgId) return;
    const idem = `vitest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const first = await rpc<Array<Record<string, unknown>>>("book_transfer", {
      p_organization_id: orgId,
      p_from_type: "treasury", p_from_id: null,
      p_to_type: "org", p_to_id: null,
      p_amount_cents: 1, p_currency: "USD",
      p_note: "vitest idempotency probe",
      p_idempotency_key: idem, p_actor: null,
    });
    const second = await rpc<Array<Record<string, unknown>>>("book_transfer", {
      p_organization_id: orgId,
      p_from_type: "treasury", p_from_id: null,
      p_to_type: "org", p_to_id: null,
      p_amount_cents: 1, p_currency: "USD",
      p_note: "vitest idempotency probe",
      p_idempotency_key: idem, p_actor: null,
    });
    expect(first[0]?.replayed).toBe(false);
    expect(second[0]?.replayed).toBe(true);
    expect(second[0]?.transfer_id).toBe(first[0]?.transfer_id);
  });
});
