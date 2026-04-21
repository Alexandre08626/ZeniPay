// POST /api/v1/agents/agents/[id]/policies — upsert policy for this agent's wallet.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../../../_lib/auth";
import { getAgentsDb } from "@/lib/agents/supabase-client";
import { logEvent } from "@/lib/agents/audit-log";

interface RouteContext {
  params: Promise<{ id: string }> | { id: string };
}

interface PolicyPatch {
  monthly_budget_cents?: number | null;
  daily_cap_cents?: number | null;
  per_tx_cap_cents?: number | null;
  merchant_whitelist?: string[];
  merchant_blacklist?: string[];
  allowed_categories?: string[];
  time_window_start?: string | null;
  time_window_end?: string | null;
  active?: boolean;
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const { id: agentId } = await Promise.resolve(ctx.params);

  const body: PolicyPatch = await req.json().catch(() => ({}));

  const db = getAgentsDb();

  const { data: wallet } = await db
    .from("agent_wallets")
    .select("id")
    .eq("agent_id", agentId)
    .eq("organization_id", auth.organizationId)
    .maybeSingle();
  if (!wallet) return NextResponse.json({ error: "wallet_not_found" }, { status: 404 });

  const patch: Record<string, unknown> = {};
  const keys: Array<keyof PolicyPatch> = [
    "monthly_budget_cents",
    "daily_cap_cents",
    "per_tx_cap_cents",
    "merchant_whitelist",
    "merchant_blacklist",
    "allowed_categories",
    "time_window_start",
    "time_window_end",
    "active",
  ];
  for (const k of keys) if (k in body) patch[k] = body[k];

  const { data: existing } = await db
    .from("agent_policies")
    .select("id")
    .eq("wallet_id", wallet.id)
    .maybeSingle();

  let policy;
  if (existing?.id) {
    const { data, error } = await db
      .from("agent_policies")
      .update(patch)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    policy = data;
  } else {
    const { data, error } = await db
      .from("agent_policies")
      .insert({ wallet_id: wallet.id, organization_id: auth.organizationId, ...patch })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    policy = data;
  }

  await logEvent({
    organizationId: auth.organizationId,
    actorType: auth.via === "api_key" ? "api_key" : "user",
    actorId: auth.apiKeyId ?? null,
    eventType: "policy.updated",
    payload: { agent_id: agentId, wallet_id: wallet.id, patch },
  });

  return NextResponse.json({ policy });
}
