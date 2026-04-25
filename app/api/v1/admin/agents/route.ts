// GET /api/v1/admin/agents
//
// Cross-org list of every agent with its real wallet balance.
// Auth: x-admin-email allowlist.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getAgentBalances } from "@/lib/agents/zc-balances";

const ADMIN_EMAILS = new Set(["zenipay@zeniva.ca", "info@zeniva.ca", "alexandreblais26@gmail.com"]);

function authorized(req: NextRequest): boolean {
  const email = (req.headers.get("x-admin-email") ?? "").trim().toLowerCase();
  return !!email && ADMIN_EMAILS.has(email);
}

interface AgentRow {
  id: string; name: string; agent_type: string; status: string;
  organization_id: string; created_at: string;
}
interface WalletRow {
  agent_id: string; zp_account_number: string | null; zp_routing_code: string | null;
}

async function pgrest<T>(path: string, profile?: string): Promise<T> {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [] as unknown as T;
  const headers: Record<string, string> = { apikey: key, Authorization: `Bearer ${key}` };
  if (profile) headers["Accept-Profile"] = profile;
  const res = await fetch(`${url}/rest/v1/${path}`, { headers, cache: "no-store" });
  if (!res.ok) return [] as unknown as T;
  return await res.json() as T;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const agents = await pgrest<AgentRow[]>(
    "agents?select=id,name,agent_type,status,organization_id,created_at&order=created_at.desc&limit=500",
    "agents",
  );
  const wallets = await pgrest<WalletRow[]>(
    "agent_wallets?select=agent_id,zp_account_number,zp_routing_code&limit=1000",
    "agents",
  );
  const zpByAgent = new Map<string, WalletRow>();
  for (const w of wallets) zpByAgent.set(w.agent_id, w);

  const balances = await getAgentBalances(agents.map((a) => a.id));

  const rows = agents.map((a) => {
    const b = balances.get(a.id);
    const w = zpByAgent.get(a.id);
    return {
      id: a.id,
      name: a.name,
      agent_type: a.agent_type,
      status: a.status,
      organization_id: a.organization_id,
      created_at: a.created_at,
      wallet_balance:       b?.balance_units ?? 0,
      wallet_balance_cents: b?.balance_cents ?? 0,
      currency:             b?.currency ?? "CAD",
      zp_account_number:    w?.zp_account_number ?? null,
      zp_routing_code:      w?.zp_routing_code ?? null,
    };
  });

  return NextResponse.json({ agents: rows });
}
