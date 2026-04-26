// GET /api/v1/agents/list-for-merchant?merchant_id=X
//
// Returns the ACTIVE agents linked to a merchant, each with its real
// ZeniCore wallet balance. Powers the "AI Agent" controls on
// /app/wallets and the mobile agent dropdowns.
//
// Balance resolution goes through `lib/agents/zc-balances.ts` — the
// single source of truth for every endpoint that needs an agent's
// ZeniCore wallet state. Do NOT re-implement that query here.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getAgentBalances } from "@/lib/agents/zc-balances";
import { requireZpSession, resolveMerchantId } from "@/lib/auth/zp-session";

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

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

interface AgentRow { id: string; name: string; agent_type: string; status: string; created_at: string }
interface MappingRow { organization_id: string }
interface WalletRow { agent_id: string; zp_account_number: string | null; zp_routing_code: string | null }

export async function GET(req: NextRequest) {
  const session = requireZpSession(req);
  if (session instanceof NextResponse) return session;
  const r = resolveMerchantId(session, req.nextUrl.searchParams.get("merchant_id"));
  if (r instanceof NextResponse) return r;
  const merchantId = r;

  const mappingRows = await pgrestGet<MappingRow[]>(
    `zenipay_merchant_agent_org_map?merchant_id=eq.${encodeURIComponent(merchantId)}&select=organization_id`,
  );
  if (mappingRows.length === 0) {
    return NextResponse.json({ agents: [], organization_id: null });
  }
  const organizationId = mappingRows[0].organization_id;

  const agents = await pgrestGet<AgentRow[]>(
    `agents?organization_id=eq.${encodeURIComponent(organizationId)}&status=eq.active&select=id,name,agent_type,status,created_at&order=created_at.asc`,
    "agents",
  );

  const [balances, wallets] = await Promise.all([
    getAgentBalances(agents.map((a) => a.id)),
    pgrestGet<WalletRow[]>(
      `agent_wallets?organization_id=eq.${encodeURIComponent(organizationId)}&select=agent_id,zp_account_number,zp_routing_code`,
      "agents",
    ).catch(() => [] as WalletRow[]),
  ]);
  const zpByAgent = new Map<string, WalletRow>();
  for (const w of wallets) zpByAgent.set(w.agent_id, w);

  const rows = agents.map((a) => {
    const b = balances.get(a.id);
    const w = zpByAgent.get(a.id);
    return {
      id:                   a.id,
      name:                 a.name,
      agent_type:           a.agent_type,
      status:               a.status,
      wallet_balance_cents: b?.balance_cents ?? 0,
      wallet_balance:       b?.balance_units ?? 0,
      currency:             b?.currency ?? "CAD",
      wallet_account_id:    b?.zenicore_account_id ?? null,
      zp_account_number:    w?.zp_account_number ?? null,
      zp_routing_code:      w?.zp_routing_code ?? null,
    };
  });

  return NextResponse.json({ agents: rows, organization_id: organizationId });
}
