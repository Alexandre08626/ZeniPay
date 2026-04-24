// Single source of truth for "how much does this agent actually have?"
//
// Every endpoint that needs an agent's wallet balance goes through
// this module. Prior to consolidation we had four routes each
// re-implementing the zc_get_accounts fetch + filter dance — each
// with its own subtle bug (wrong schema, wrong org filter, reading
// the stale agents.agent_wallets cache). Centralising here means:
//
//   * New fields (e.g. pending_debit_micro) show up everywhere with
//     one edit.
//   * One place to fix the next ZeniCore schema change.
//   * Callers just await `getAgentBalances(agentIds)` and move on.
//
// Design:
//
//   - We call the public `zc_get_accounts` SECURITY DEFINER wrapper
//     with `p_organization_id: null` because agent_wallet rows in
//     zenicore.accounts don't carry an organization_id column —
//     their org is implied by the agent→org link in agents.agents.
//     Filtering by org at the RPC level silently drops every wallet.
//
//   - We filter client-side against the caller-supplied agent id set.
//
//   - Raw fetch (not supabase-js). The JS client's `.schema("agents")`
//     returned phantom rows in the Vercel runtime during the Oct 2026
//     hotfix; we standardised on direct PostgREST HTTP for anything
//     that touches the agents or zenicore schemas.
//
//   - Requests are marked no-store + no-cache so a stale CDN never
//     shadows a real balance change.

import "server-only";

const MICRO_PER_CENT = BigInt(10_000);
const MICRO_PER_UNIT = BigInt(1_000_000);

export interface AgentBalance {
  agent_id: string;
  balance_cents: number;       // integer cents, positive only (balance_micro / 10_000)
  balance_units: number;       // dollars as a Number for UI fmtMoney
  currency: string;            // 3-letter ISO code, trimmed
  zenicore_account_id: string; // for audit + deep links
}

function env(name: string, fallback?: string): string | null {
  return process.env[name] || (fallback ? process.env[fallback] ?? null : null);
}

interface ZcAccount {
  id: string;
  owner_type: string;
  owner_ref: string;
  currency: string;
  balance_micro: string | number;
}

async function fetchAllZcAccounts(): Promise<ZcAccount[]> {
  const url = env("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_ANON_KEY");
  if (!url || !key) throw new Error("supabase_env_missing");

  const res = await fetch(`${url}/rest/v1/rpc/zc_get_accounts`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    },
    cache: "no-store",
    body: JSON.stringify({ p_organization_id: null }),
  });
  if (!res.ok) throw new Error(`zc_get_accounts ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as ZcAccount[];
}

/**
 * Resolve ZeniCore wallet balances for a set of agent ids.
 *
 * Returns a map keyed by agent id; agents without a ZeniCore account
 * are simply absent from the map (the caller is expected to default
 * them to zero — `getAgentBalance(id)?.balance_cents ?? 0`).
 *
 * If an agent happens to have multiple currency wallets, we prefer the
 * first non-zero (tie-broken by ZeniCore's creation order). Agents in
 * practice have one wallet per currency and today we only run CAD, so
 * this branch is defensive more than load-bearing.
 */
export async function getAgentBalances(agentIds: Iterable<string>): Promise<Map<string, AgentBalance>> {
  const ids = new Set(Array.from(agentIds));
  const out = new Map<string, AgentBalance>();
  if (ids.size === 0) return out;

  let rows: ZcAccount[];
  try {
    rows = await fetchAllZcAccounts();
  } catch {
    return out; // treasury unreachable — callers render with empty balances
  }

  for (const row of rows) {
    if (row.owner_type !== "agent_wallet") continue;
    if (!ids.has(row.owner_ref)) continue;

    const micro = BigInt(row.balance_micro);
    const cents = Number(micro / MICRO_PER_CENT);
    const units = Number(micro) / Number(MICRO_PER_UNIT);
    const currency = (row.currency || "CAD").trim();

    const prev = out.get(row.owner_ref);
    if (!prev || (prev.balance_cents === 0 && cents !== 0)) {
      out.set(row.owner_ref, {
        agent_id: row.owner_ref,
        balance_cents: cents,
        balance_units: units,
        currency,
        zenicore_account_id: row.id,
      });
    }
  }

  return out;
}

/** Shorthand for one agent. */
export async function getAgentBalance(agentId: string): Promise<AgentBalance | null> {
  const m = await getAgentBalances([agentId]);
  return m.get(agentId) ?? null;
}

/** The org treasury balance (first non-zero currency wins). */
export async function getOrgTreasuryBalance(orgId: string): Promise<AgentBalance | null> {
  const url = env("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_ANON_KEY");
  if (!url || !key) return null;
  const res = await fetch(`${url}/rest/v1/rpc/zc_get_accounts`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    },
    cache: "no-store",
    body: JSON.stringify({ p_organization_id: orgId }),
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as ZcAccount[];
  let best: AgentBalance | null = null;
  for (const row of rows) {
    if (row.owner_type !== "org_treasury") continue;
    const micro = BigInt(row.balance_micro);
    const cents = Number(micro / MICRO_PER_CENT);
    const units = Number(micro) / Number(MICRO_PER_UNIT);
    const candidate: AgentBalance = {
      agent_id: row.owner_ref,
      balance_cents: cents,
      balance_units: units,
      currency: (row.currency || "CAD").trim(),
      zenicore_account_id: row.id,
    };
    if (!best || (best.balance_cents === 0 && cents !== 0)) best = candidate;
  }
  return best;
}
