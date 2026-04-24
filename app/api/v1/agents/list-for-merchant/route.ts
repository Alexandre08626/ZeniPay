// GET /api/v1/agents/list-for-merchant?merchant_id=X
//
// Returns the ACTIVE agents linked to a merchant, each with its real
// ZeniCore wallet balance. Powers the "AI Agent" controls on
// /app/wallets and the mobile agent dropdowns.
//
// IMPORTANT: we use raw PostgREST fetches instead of supabase-js's
// `.schema("agents")` API. The JS client returned stale / phantom
// rows in the Vercel runtime during the October 2026 hotfix — rows
// that had been hard-deleted from agents.agents kept showing up as
// `status: active` in the response. Raw fetch with
// `Accept-Profile: agents` matches the actual current state.
//
// Shape per row:
//   { id, name, agent_type, status, wallet_balance_cents, currency,
//     wallet_account_id }

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

function env(name: "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY"): string | null {
  const url = process.env[name] || process.env[name === "SUPABASE_URL" ? "NEXT_PUBLIC_SUPABASE_URL" : "SUPABASE_ANON_KEY"];
  return url ?? null;
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

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

const MICRO_PER_CENT = BigInt(10_000);

interface AgentRow { id: string; name: string; agent_type: string; status: string; created_at: string }
interface ZcAccount { id: string; owner_type: string; owner_ref: string; currency: string; balance_micro: string | number }
interface MappingRow { organization_id: string }

export async function GET(req: NextRequest) {
  const merchantId = (req.nextUrl.searchParams.get("merchant_id") ?? "").trim();
  if (!merchantId) return err("bad_request", "merchant_id_required", 400);

  // 1. merchant ↔ org mapping (public schema, no Accept-Profile needed).
  const mappingRows = await pgrestGet<MappingRow[]>(
    `zenipay_merchant_agent_org_map?merchant_id=eq.${encodeURIComponent(merchantId)}&select=organization_id`,
  );
  if (mappingRows.length === 0) {
    return NextResponse.json({ agents: [], organization_id: null });
  }
  const organizationId = mappingRows[0].organization_id;

  // 2. active agents from the agents.agents table (Accept-Profile: agents).
  const agents = await pgrestGet<AgentRow[]>(
    `agents?organization_id=eq.${encodeURIComponent(organizationId)}&status=eq.active&select=id,name,agent_type,status,created_at&order=created_at.asc`,
    "agents",
  );

  // 3. real ZeniCore balances via the SECURITY DEFINER wrapper.
  let zcAccounts: ZcAccount[] = [];
  try {
    zcAccounts = await callRpc<ZcAccount[]>("zc_get_accounts", { p_organization_id: organizationId });
  } catch { /* treasury unreachable — fall back to zero balances */ }

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
      id:                     a.id,
      name:                   a.name,
      agent_type:             a.agent_type,
      status:                 a.status,
      wallet_balance_cents:   bal?.cents ?? 0,
      wallet_balance:         (bal?.cents ?? 0) / 100,
      currency:               bal?.currency ?? "CAD",
      wallet_account_id:      bal?.account_id ?? null,
    };
  });

  return NextResponse.json({ agents: rows, organization_id: organizationId });
}
