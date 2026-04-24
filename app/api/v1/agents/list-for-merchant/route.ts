// GET /api/v1/agents/list-for-merchant?merchant_id=X
//
// Returns the active agents visible to a given merchant via the
// zenipay_merchant_agent_org_map mapping. Powers the "AI Agent" tab on
// /app/wallets so merchants can distribute from their ZeniPay account
// directly to a specific agent wallet.
//
// Shape per row:
//   { id, name, agent_type, status, wallet_balance_cents, currency }
//
// Balance comes from agents.agent_wallets (cents). We keep cents on the
// wire so the merchant UI can format with its own Intl formatter —
// consistent with the rest of the merchant side.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function GET(req: NextRequest) {
  const merchantId = (req.nextUrl.searchParams.get("merchant_id") ?? "").trim();
  if (!merchantId) return err("bad_request", "merchant_id_required", 400);

  const db = getSupabaseAdmin();

  // Mapping lookup.
  const { data: mapping } = await db
    .from("zenipay_merchant_agent_org_map")
    .select("organization_id")
    .eq("merchant_id", merchantId)
    .maybeSingle();
  if (!mapping?.organization_id) {
    // Not linked — not an error, just an empty fleet.
    return NextResponse.json({ agents: [], organization_id: null });
  }
  const organizationId = mapping.organization_id as string;

  // Active agents for this org.
  const { data: agents, error: agentErr } = await db
    .schema("agents")
    .from("agents")
    .select("id, name, agent_type, status, created_at")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .order("created_at", { ascending: true });
  if (agentErr) return err("server_error", agentErr.message, 500);

  const ids = ((agents ?? []) as Array<{ id: string }>).map((a) => a.id);
  let walletsByAgentId: Record<string, { balance_cents: number; currency: string }> = {};
  if (ids.length > 0) {
    const { data: wallets } = await db
      .schema("agents")
      .from("agent_wallets")
      .select("agent_id, balance_cents, currency")
      .in("agent_id", ids);
    walletsByAgentId = Object.fromEntries(
      ((wallets ?? []) as Array<{ agent_id: string; balance_cents: number; currency: string }>).map((w) => [
        w.agent_id,
        { balance_cents: Number(w.balance_cents ?? 0), currency: w.currency || "CAD" },
      ]),
    );
  }

  const rows = ((agents ?? []) as Array<{
    id: string; name: string; agent_type: string; status: string; created_at: string;
  }>).map((a) => ({
    id:             a.id,
    name:           a.name,
    agent_type:     a.agent_type,
    status:         a.status,
    wallet_balance_cents: walletsByAgentId[a.id]?.balance_cents ?? 0,
    currency:       walletsByAgentId[a.id]?.currency ?? "CAD",
  }));

  return NextResponse.json({ agents: rows, organization_id: organizationId });
}
