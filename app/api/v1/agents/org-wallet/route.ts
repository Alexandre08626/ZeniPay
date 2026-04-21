// GET /api/v1/agents/org-wallet
//   Returns the organization's master wallet (auto-provisions on first call)
//   + the last 20 transfers (top-ups and distributions).

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../_lib/auth";
import { getAgentsDb } from "@/lib/agents/supabase-client";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const db = getAgentsDb();

  // Auto-provision if missing (matches top_up_org_wallet behavior).
  const { data: existing } = await db
    .from("agent_org_wallets")
    .select("id, balance_cents, currency, created_at, updated_at")
    .eq("organization_id", auth.organizationId)
    .maybeSingle();

  let wallet = existing;
  if (!wallet) {
    const { data: created, error } = await db
      .from("agent_org_wallets")
      .insert({ organization_id: auth.organizationId })
      .select("id, balance_cents, currency, created_at, updated_at")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    wallet = created;
  }

  const { data: transfers } = await db
    .from("agent_wallet_transfers")
    .select("*")
    .eq("organization_id", auth.organizationId)
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({ wallet, transfers: transfers ?? [] });
}
