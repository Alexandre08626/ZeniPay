// GET /api/v1/agents/agents-with-balances
//
// Powers the "Distribute to agent" panel and "Agent balances" table on
// /agents/treasury. Returns every active agent in the caller's org with
// their current ZeniCore balance (from `zenicore.accounts`, not the
// legacy `agents.agent_wallets` cache — that's what let Marco's $0.01
// CAD hide in the acceptance test).
//
// Response: { agents: [{ id, name, agent_type, wallet_balance_cents, currency }] }

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../_lib/auth";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

const MICRO_PER_CENT = BigInt(10_000);

function pgEnv(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

async function zcAccounts(orgId: string): Promise<Array<{
  owner_type: string; owner_ref: string; currency: string; balance_micro: string | number;
}>> {
  const env = pgEnv();
  if (!env) throw new Error("supabase_env_missing");
  const res = await fetch(`${env.url}/rest/v1/rpc/zc_get_accounts`, {
    method: "POST",
    headers: {
      apikey: env.key,
      Authorization: `Bearer ${env.key}`,
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    },
    cache: "no-store",
    body: JSON.stringify({ p_organization_id: orgId }),
  });
  if (!res.ok) {
    throw new Error(`zc_get_accounts ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return res.json();
}

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const organizationId = auth.organizationId;

  const db = getSupabaseAdmin();
  const { data: agents, error } = await db
    .schema("agents")
    .from("agents")
    .select("id, name, agent_type, status, created_at")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: { code: "server_error", message: error.message } }, { status: 500 });

  let zc: Awaited<ReturnType<typeof zcAccounts>> = [];
  try {
    zc = await zcAccounts(organizationId);
  } catch (e) {
    return NextResponse.json({ error: { code: "zenicore_unreachable", message: String(e) } }, { status: 502 });
  }

  const balanceByAgent = new Map<string, { cents: number; currency: string }>();
  for (const row of zc) {
    if (row.owner_type !== "agent_wallet") continue;
    const cents = Number(BigInt(row.balance_micro) / MICRO_PER_CENT);
    const currency = (row.currency || "CAD").trim();
    const prev = balanceByAgent.get(row.owner_ref);
    if (!prev || (prev.cents === 0 && cents !== 0)) {
      balanceByAgent.set(row.owner_ref, { cents, currency });
    }
  }

  const rows = ((agents ?? []) as Array<{
    id: string; name: string; agent_type: string;
  }>).map((a) => {
    const bal = balanceByAgent.get(a.id);
    return {
      id:              a.id,
      name:            a.name,
      agent_type:      a.agent_type,
      wallet_balance_cents: bal?.cents ?? 0,
      currency:        bal?.currency ?? "CAD",
    };
  });

  return NextResponse.json({ agents: rows });
}
