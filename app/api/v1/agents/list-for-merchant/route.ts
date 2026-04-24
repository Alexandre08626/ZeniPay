// GET /api/v1/agents/list-for-merchant?merchant_id=X
//
// Returns the active agents visible to a given merchant via the
// zenipay_merchant_agent_org_map mapping. Powers the "AI Agent"
// controls on /app/wallets and the agent-selection dropdowns.
//
// Balance comes from `zenicore.accounts` (owner_type='agent_wallet',
// owner_ref=<agent_id>) via the zc_get_accounts SECURITY DEFINER
// wrapper. The legacy `agents.agent_wallets` cache is NOT consulted
// — it drifts from the source of truth (the PR 10 acceptance test
// surfaced this: Marco's ZeniCore account had $0.01 CAD but the
// cache row still read 0 USD, and the merchant UI showed 0).
//
// Shape per row: { id, name, agent_type, status, wallet_balance_cents, currency }

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

// 1_000_000 micro = 1 unit = 100 cents.
const MICRO_PER_CENT = BigInt(10_000);

export async function GET(req: NextRequest) {
  const merchantId = (req.nextUrl.searchParams.get("merchant_id") ?? "").trim();
  if (!merchantId) return err("bad_request", "merchant_id_required", 400);

  const db = getSupabaseAdmin();

  const { data: mapping } = await db
    .from("zenipay_merchant_agent_org_map")
    .select("organization_id")
    .eq("merchant_id", merchantId)
    .maybeSingle();
  if (!mapping?.organization_id) {
    return NextResponse.json({ agents: [], organization_id: null });
  }
  const organizationId = mapping.organization_id as string;

  const { data: agents, error: agentErr } = await db
    .schema("agents")
    .from("agents")
    .select("id, name, agent_type, status, created_at")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .order("created_at", { ascending: true });
  if (agentErr) return err("server_error", agentErr.message, 500);

  const { data: zcAccounts } = await db.rpc("zc_get_accounts", { p_organization_id: organizationId });
  const balanceByAgent = new Map<string, { cents: number; currency: string }>();
  for (const row of (zcAccounts ?? []) as Array<{
    owner_type: string; owner_ref: string; currency: string; balance_micro: string | number;
  }>) {
    if (row.owner_type !== "agent_wallet") continue;
    const micro = BigInt(row.balance_micro);
    const cents = Number(micro / MICRO_PER_CENT);
    const currency = (row.currency || "CAD").trim();
    // If an agent has multiple currency wallets, prefer the first non-zero
    // (deterministic within a currency class, and the ZeniCore wrapper orders
    // by created_at so the oldest wins on ties).
    const prev = balanceByAgent.get(row.owner_ref);
    if (!prev || (prev.cents === 0 && cents !== 0)) {
      balanceByAgent.set(row.owner_ref, { cents, currency });
    }
  }

  const rows = ((agents ?? []) as Array<{
    id: string; name: string; agent_type: string; status: string; created_at: string;
  }>).map((a) => {
    const bal = balanceByAgent.get(a.id);
    return {
      id:             a.id,
      name:           a.name,
      agent_type:     a.agent_type,
      status:         a.status,
      wallet_balance_cents: bal?.cents ?? 0,
      currency:       bal?.currency ?? "CAD",
    };
  });

  return NextResponse.json({ agents: rows, organization_id: organizationId });
}
