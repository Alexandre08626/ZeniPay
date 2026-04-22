// GET /api/v1/agents/treasury
//   Returns the org treasury, per-currency balances, totals view, funding
//   sources. Auto-provisions treasury on first call so the dashboard never
//   sees a null state.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../_lib/auth";
import { getAgentsDb } from "@/lib/agents/supabase-client";
import { ensureTreasury, getBalances, getTreasuryTotals } from "@/lib/agents/treasury/treasury";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const treasury = await ensureTreasury(auth.organizationId);
  const [balances, totals] = await Promise.all([
    getBalances(auth.organizationId),
    getTreasuryTotals(auth.organizationId),
  ]);

  const db = getAgentsDb();
  const { data: funding } = await db
    .from("funding_sources")
    .select("*")
    .eq("organization_id", auth.organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return NextResponse.json({
    treasury,
    totals,
    balances,
    funding_sources: funding ?? [],
  });
}
