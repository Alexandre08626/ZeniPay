// GET  /api/v1/agents/agents               list agents for the caller's org
// POST /api/v1/agents/agents               create agent + wallet + (optional) policy

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../_lib/auth";
import { getAgentsDb } from "@/lib/agents/supabase-client";
import { generateKeypair } from "@/lib/agents/crypto";
import { logEvent } from "@/lib/agents/audit-log";
import { getAgentBalances } from "@/lib/agents/zc-balances";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const db = getAgentsDb();
  const { data: agents, error } = await db
    .from("agents")
    .select("id, name, description, agent_type, status, public_key, created_at, updated_at")
    .eq("organization_id", auth.organizationId)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // REAL balances from lib/agents/zc-balances.ts — single source of
  // truth, never the stale agents.agent_wallets cache.
  const ids = ((agents ?? []) as Array<{ id: string }>).map((a) => a.id);
  const balances = await getAgentBalances(ids);

  return NextResponse.json({
    agents: ((agents ?? []) as Array<{ id: string; [k: string]: unknown }>).map((a) => {
      const b = balances.get(a.id);
      return {
        ...a,
        wallet: b
          ? { id: b.zenicore_account_id, balance_cents: b.balance_cents, currency: b.currency }
          : null,
      };
    }),
  });
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const body = await req.json().catch(() => ({}));
  const name: string | undefined = body?.name;
  const description: string | undefined = body?.description;
  const agentType: string = body?.agent_type || "generic";
  const initialBalanceCents: number = Number.isFinite(body?.initial_balance_cents)
    ? Math.max(0, Math.floor(body.initial_balance_cents))
    : Number(process.env.AGENTS_DEFAULT_TEST_BALANCE_CENTS ?? 100000);

  if (!name || String(name).trim().length < 2) {
    return NextResponse.json({ error: "name required (min 2 chars)" }, { status: 400 });
  }

  const db = getAgentsDb();

  // 1. Generate keypair.
  const kp = await generateKeypair();

  // 2. Create agent.
  const { data: agent, error: agentErr } = await db
    .from("agents")
    .insert({
      organization_id: auth.organizationId,
      name: String(name).trim(),
      description: description ? String(description) : null,
      agent_type: agentType,
      public_key: kp.publicKeyBase64,
    })
    .select()
    .single();
  if (agentErr || !agent) {
    return NextResponse.json({ error: agentErr?.message ?? "create failed" }, { status: 500 });
  }

  // 3. Create wallet.
  const { data: wallet, error: walletErr } = await db
    .from("agent_wallets")
    .insert({
      agent_id: agent.id,
      organization_id: auth.organizationId,
      balance_cents: initialBalanceCents,
      currency: "USD",
    })
    .select()
    .single();
  if (walletErr || !wallet) {
    return NextResponse.json({ error: walletErr?.message ?? "wallet create failed" }, { status: 500 });
  }

  // 4. Create an empty/default policy for the wallet.
  const { data: policy } = await db
    .from("agent_policies")
    .insert({
      wallet_id: wallet.id,
      organization_id: auth.organizationId,
    })
    .select()
    .single();

  await logEvent({
    organizationId: auth.organizationId,
    actorType: auth.via === "api_key" ? "api_key" : "user",
    actorId: auth.apiKeyId ?? null,
    eventType: "agent.created",
    payload: { agent_id: agent.id, wallet_id: wallet.id },
  });

  return NextResponse.json({
    agent,
    wallet,
    policy,
    // The private key is returned once here. Client must store it securely —
    // we never persist it server-side.
    keypair: {
      public_key: kp.publicKeyBase64,
      private_key: kp.privateKeyBase64,
      warning: "private_key is only shown once — store it securely",
    },
  });
}
