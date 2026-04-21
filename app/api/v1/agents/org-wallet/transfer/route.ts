// POST /api/v1/agents/org-wallet/transfer
//   Body: { agent_id | agent_wallet_id, amount_cents, note? }
//   Atomically debits the org's master wallet and credits the target agent
//   wallet inside a single Postgres transaction.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../../_lib/auth";
import { getAgentsDb } from "@/lib/agents/supabase-client";
import { logEvent } from "@/lib/agents/audit-log";

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const amount = Number(body?.amount_cents);
  const note: string | null = body?.note ?? null;
  let agentWalletId: string | null = body?.agent_wallet_id ?? null;
  const agentId: string | null = body?.agent_id ?? null;

  if (!Number.isInteger(amount) || amount <= 0) {
    return NextResponse.json({ error: "amount_cents must be a positive integer" }, { status: 400 });
  }
  if (!agentWalletId && !agentId) {
    return NextResponse.json({ error: "agent_wallet_id or agent_id required" }, { status: 400 });
  }

  const db = getAgentsDb();

  // Resolve agent_id → wallet_id if needed.
  if (!agentWalletId && agentId) {
    const { data: w } = await db
      .from("agent_wallets")
      .select("id, organization_id")
      .eq("agent_id", agentId)
      .maybeSingle();
    if (!w || w.organization_id !== auth.organizationId) {
      return NextResponse.json({ error: "agent_not_found" }, { status: 404 });
    }
    agentWalletId = w.id as string;
  }

  const { data, error } = await db.rpc("transfer_org_to_agent", {
    p_organization_id: auth.organizationId,
    p_agent_wallet_id: agentWalletId,
    p_amount_cents: amount,
    p_note: note,
  });
  if (error) {
    // Surface balance / scope violations as 422 instead of 500.
    const msg = error.message || "";
    const status = /not in organization|not found|positive|non_negative|balance_cents/i.test(msg) ? 422 : 500;
    return NextResponse.json({ error: msg }, { status });
  }

  const row = Array.isArray(data) ? data[0] : data;
  await logEvent({
    organizationId: auth.organizationId,
    actorType: auth.via === "api_key" ? "api_key" : "user",
    actorId: auth.apiKeyId ?? null,
    eventType: "org_wallet.distributed",
    payload: {
      transfer_id: row?.transfer_id,
      agent_wallet_id: agentWalletId,
      amount_cents: amount,
    },
  });

  return NextResponse.json({
    transfer_id: row?.transfer_id,
    org_balance_cents: row?.org_balance_cents,
    agent_balance_cents: row?.agent_balance_cents,
  });
}
