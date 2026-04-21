// GET /api/v1/agents/agents/[id] — full detail incl. wallet + policy + 20 last tx

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../../_lib/auth";
import { getAgentsDb } from "@/lib/agents/supabase-client";

interface RouteContext {
  params: Promise<{ id: string }> | { id: string };
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const { id } = await Promise.resolve(ctx.params);

  const db = getAgentsDb();
  const { data: agent } = await db
    .from("agents")
    .select("*")
    .eq("id", id)
    .eq("organization_id", auth.organizationId)
    .maybeSingle();
  if (!agent) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data: wallet } = await db
    .from("agent_wallets")
    .select("*")
    .eq("agent_id", id)
    .maybeSingle();

  const { data: policy } = wallet
    ? await db.from("agent_policies").select("*").eq("wallet_id", wallet.id).maybeSingle()
    : { data: null };

  const { data: transactions } = await db
    .from("agent_transactions")
    .select("id, amount_cents, currency, merchant_id, category, status, protocol_used, created_at")
    .eq("agent_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({ agent, wallet, policy, transactions: transactions ?? [] });
}
