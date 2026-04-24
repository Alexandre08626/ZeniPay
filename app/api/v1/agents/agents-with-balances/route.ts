// GET /api/v1/agents/agents-with-balances
//
// Same shape + semantics as list-for-merchant, but scoped to the
// caller's agents-session org. Powers the "Distribute to agent" panel
// + "Agent balances" table on /agents/treasury and the mobile fleet
// list.
//
// See list-for-merchant for the rationale: raw PostgREST fetch only,
// no supabase-js `.schema()` — it returned ghost rows in Vercel.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../_lib/auth";

const MICRO_PER_CENT = BigInt(10_000);

function env(name: "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY"): string | null {
  const v = process.env[name] || process.env[name === "SUPABASE_URL" ? "NEXT_PUBLIC_SUPABASE_URL" : "SUPABASE_ANON_KEY"];
  return v ?? null;
}

async function pgrestGet<T>(path: string, accept?: string): Promise<T> {
  const url = env("SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("supabase_env_missing");
  const headers: Record<string, string> = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Cache-Control": "no-cache",
  };
  if (accept) headers["Accept-Profile"] = accept;
  const res = await fetch(`${url}/rest/v1/${path}`, { headers, cache: "no-store" });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as T;
}

async function callRpc<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  const url = env("SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("supabase_env_missing");
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    },
    cache: "no-store",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${fn} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as T;
}

interface AgentRow { id: string; name: string; agent_type: string; status: string; created_at: string }
interface ZcAccount { id: string; owner_type: string; owner_ref: string; currency: string; balance_micro: string | number }

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const organizationId = auth.organizationId;

  const agents = await pgrestGet<AgentRow[]>(
    `agents?organization_id=eq.${encodeURIComponent(organizationId)}&status=eq.active&select=id,name,agent_type,status,created_at&order=created_at.asc`,
    "agents",
  ).catch(() => [] as AgentRow[]);

  let zcAccounts: ZcAccount[] = [];
  try {
    zcAccounts = await callRpc<ZcAccount[]>("zc_get_accounts", { p_organization_id: organizationId });
  } catch { /* treasury unreachable */ }

  const balanceByAgent = new Map<string, { cents: number; currency: string; account_id: string }>();
  for (const row of zcAccounts) {
    if (row.owner_type !== "agent_wallet") continue;
    const cents = Number(BigInt(row.balance_micro) / MICRO_PER_CENT);
    const currency = (row.currency || "CAD").trim();
    const prev = balanceByAgent.get(row.owner_ref);
    if (!prev || (prev.cents === 0 && cents !== 0)) {
      balanceByAgent.set(row.owner_ref, { cents, currency, account_id: row.id });
    }
  }

  const rows = agents.map((a) => {
    const bal = balanceByAgent.get(a.id);
    return {
      id:                   a.id,
      name:                 a.name,
      agent_type:           a.agent_type,
      status:               a.status,
      wallet_balance_cents: bal?.cents ?? 0,
      wallet_balance:       (bal?.cents ?? 0) / 100,
      currency:             bal?.currency ?? "CAD",
      wallet_account_id:    bal?.account_id ?? null,
    };
  });

  return NextResponse.json({ agents: rows });
}
