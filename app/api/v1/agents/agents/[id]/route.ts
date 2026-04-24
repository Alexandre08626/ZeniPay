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

  // Legacy agents.agent_wallets cache row — kept for policy linkage
  // only (the amounts it carries can be stale).
  const { data: legacyWallet } = await db
    .from("agent_wallets")
    .select("*")
    .eq("agent_id", id)
    .maybeSingle();

  // Real balance + currency live in zenicore.accounts. We query all
  // agent_wallet rows and match by agent id — no org filter because
  // those rows don't carry an organization_id column.
  let wallet = legacyWallet;
  try {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      const res = await fetch(`${url}/rest/v1/rpc/zc_get_accounts`, {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        cache: "no-store",
        body: JSON.stringify({ p_organization_id: null }),
      });
      if (res.ok) {
        const rows = (await res.json()) as Array<{
          id: string; owner_type: string; owner_ref: string;
          currency: string; balance_micro: string | number;
        }>;
        const match = rows.find((r) => r.owner_type === "agent_wallet" && r.owner_ref === id);
        if (match) {
          const cents = Number(BigInt(match.balance_micro) / BigInt(10_000));
          wallet = {
            ...(legacyWallet ?? {}),
            id: match.id,
            agent_id: id,
            balance_cents: cents,
            currency: (match.currency || "CAD").trim(),
          };
        }
      }
    }
  } catch { /* fall back to legacy cache values */ }

  const { data: policy } = legacyWallet
    ? await db.from("agent_policies").select("*").eq("wallet_id", legacyWallet.id).maybeSingle()
    : { data: null };

  const { data: transactions } = await db
    .from("agent_transactions")
    .select("id, amount_cents, currency, merchant_id, category, status, protocol_used, created_at")
    .eq("agent_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({ agent, wallet, policy, transactions: transactions ?? [] });
}
