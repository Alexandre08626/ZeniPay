// GET /api/v1/agents/agents-with-balances
//
// Same shape as list-for-merchant but scoped to the caller's agents-
// session org. Powers the "Distribute to agent" panel + "Agent
// balances" table on /agents/treasury and the mobile fleet list.
//
// Balance resolution goes through `lib/agents/zc-balances.ts` —
// single source of truth.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../_lib/auth";
import { getAgentBalances } from "@/lib/agents/zc-balances";

async function pgrestGet<T>(path: string, accept?: string): Promise<T> {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
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

interface AgentRow { id: string; name: string; agent_type: string; status: string; created_at: string }

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const organizationId = auth.organizationId;

  const agents = await pgrestGet<AgentRow[]>(
    `agents?organization_id=eq.${encodeURIComponent(organizationId)}&status=eq.active&select=id,name,agent_type,status,created_at&order=created_at.asc`,
    "agents",
  ).catch(() => [] as AgentRow[]);

  const balances = await getAgentBalances(agents.map((a) => a.id));

  const rows = agents.map((a) => {
    const b = balances.get(a.id);
    return {
      id:                   a.id,
      name:                 a.name,
      agent_type:           a.agent_type,
      status:               a.status,
      wallet_balance_cents: b?.balance_cents ?? 0,
      wallet_balance:       b?.balance_units ?? 0,
      currency:             b?.currency ?? "CAD",
      wallet_account_id:    b?.zenicore_account_id ?? null,
    };
  });

  return NextResponse.json({ agents: rows });
}
