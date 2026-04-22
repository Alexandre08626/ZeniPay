// GET /api/v1/agents/cards/[id]
//   full card detail + last 50 authorizations.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../../_lib/auth";
import { getAgentsDb } from "@/lib/agents/supabase-client";

interface RouteContext { params: Promise<{ id: string }> | { id: string }; }

export async function GET(req: NextRequest, ctx: RouteContext) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const { id } = await Promise.resolve(ctx.params);
  const db = getAgentsDb();

  const { data: card } = await db
    .from("issued_cards")
    .select("*")
    .eq("id", id)
    .eq("organization_id", auth.organizationId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!card) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data: auths } = await db
    .from("card_authorizations")
    .select("id, amount_cents, currency, merchant_name, merchant_category, merchant_country, decision, decision_reason, occurred_at, created_at, transaction_id")
    .eq("card_id", id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  const agent_id = (card as { agent_id: string | null }).agent_id;
  let agent: { id: string; name: string } | null = null;
  if (agent_id) {
    const { data: a } = await db.from("agents").select("id, name").eq("id", agent_id).maybeSingle();
    agent = (a as { id: string; name: string } | null) ?? null;
  }

  let wallet: { id: string; balance_cents: number; currency: string } | null = null;
  const walletId = (card as { ledger_wallet_id: string | null }).ledger_wallet_id;
  if (walletId) {
    const { data: w } = await db.from("agent_wallets").select("id, balance_cents, currency").eq("id", walletId).maybeSingle();
    wallet = w as typeof wallet;
  }

  return NextResponse.json({ card, agent, wallet, authorizations: auths ?? [] });
}
