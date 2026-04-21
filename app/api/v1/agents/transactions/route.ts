// GET /api/v1/agents/transactions
//   Filters: agent_id, status, limit (default 100, max 500).

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../_lib/auth";
import { getAgentsDb } from "@/lib/agents/supabase-client";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agent_id");
  const status = searchParams.get("status");
  const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit") ?? 100)));

  const db = getAgentsDb();
  let q = db
    .from("agent_transactions")
    .select(
      "id, agent_id, wallet_id, amount_cents, currency, merchant_id, category, status, protocol_used, policy_check_result, created_at, settled_at",
    )
    .eq("organization_id", auth.organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (agentId) q = q.eq("agent_id", agentId);
  if (status) q = q.eq("status", status);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ transactions: data ?? [] });
}
