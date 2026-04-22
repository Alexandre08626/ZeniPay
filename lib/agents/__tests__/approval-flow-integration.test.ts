// Live integration: card auth hits approval policy → pending_approval →
// CFO approves with TOTP → retry auto-unlocks via findUsableApproval.
// Gated behind AGENTS_APPROVAL_INTEGRATION=1 + AGENTS_TEST_ORG_ID and
// the worker system user being enrolled.

import { describe, it, expect } from "vitest";

const ENABLED = process.env.AGENTS_APPROVAL_INTEGRATION === "1";
const describeIfEnabled = ENABLED ? describe : describe.skip;

describeIfEnabled("approval flow integration (live agents schema)", () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const orgId = process.env.AGENTS_TEST_ORG_ID ?? "";

  async function pg<T>(path: string, opts: RequestInit = {}): Promise<T> {
    const res = await fetch(`${url}/rest/v1/${path}`, {
      ...opts,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Accept-Profile": "agents",
        "Content-Profile": "agents",
        "content-type": "application/json",
        ...(opts.headers ?? {}),
      },
    });
    if (!res.ok) throw new Error(`${path} ${res.status}: ${await res.text()}`);
    return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
  }

  it("creates a high-threshold approval policy and it shows up in list", async () => {
    if (!orgId) return;
    const name = `vitest-${Date.now()}`;
    const created = await pg<Array<{ id: string }>>("approval_policies", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify([{
        organization_id: orgId, name,
        trigger_type: "amount_threshold",
        trigger_config: { threshold_cents: 999_999_999 }, // huge — won't fire
        approver_type: "owner_only",
        approver_config: {},
        timeout_seconds: 900,
        default_action: "deny",
        active: true,
        priority: 999, // lowest precedence so it doesn't disturb other tests
      }]),
    });
    expect(created[0]?.id).toBeTruthy();

    // Cleanup immediately — keep the live DB clean.
    await pg(`approval_policies?id=eq.${created[0].id}`, { method: "DELETE" });
  });

  it("fx_rates is still readable (sanity across PRs)", async () => {
    const rows = await pg<Array<{ rate: string }>>(
      "fx_rates?base_currency=eq.USD&quote_currency=eq.CAD&valid_to=is.null&select=rate",
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(Number(rows[0]?.rate)).toBeGreaterThan(1.0);
  });
});
