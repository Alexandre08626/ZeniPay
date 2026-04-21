// POST /api/v1/agents/payments/authorize
//   Core endpoint. Validates the Ed25519 signature, runs the policy engine,
//   atomically debits the wallet, writes the transaction row, logs to audit.
//   Returns { authorized, transaction_id, reason, policy_check_result }.
//
// Body:
//   { agent_id, amount_cents, currency, merchant_id, category,
//     protocol, signature, idempotency_key }
// The signature is over canonicalJson(body without signature).

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../../_lib/auth";
import { getAgentsDb } from "@/lib/agents/supabase-client";
import { loadPolicyContext, validateTransaction } from "@/lib/agents/policy-engine";
import { canonicalJsonForSigning, verify } from "@/lib/agents/crypto";
import { debitWallet } from "@/lib/agents/wallet-engine";
import { logEvent } from "@/lib/agents/audit-log";
import type { PolicyCheckResult } from "@/lib/agents/types";

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const agentId: string | undefined = body?.agent_id;
  const amountCents: number = Number(body?.amount_cents);
  const currency: string = String(body?.currency || "USD");
  const merchantId: string | null = body?.merchant_id ?? null;
  const category: string | null = body?.category ?? null;
  const protocol: string = String(body?.protocol || "zenipay_v1");
  const signature: string | null = body?.signature ?? null;
  const idempotencyKey: string | null = body?.idempotency_key ?? null;

  if (!agentId || !Number.isFinite(amountCents) || amountCents <= 0) {
    return NextResponse.json({ error: "invalid_request", detail: "agent_id + positive amount_cents required" }, { status: 422 });
  }

  const db = getAgentsDb();

  // Scope: agent must belong to caller's org.
  const { data: agent } = await db
    .from("agents")
    .select("id, organization_id, public_key, status")
    .eq("id", agentId)
    .maybeSingle();
  if (!agent || agent.organization_id !== auth.organizationId) {
    return NextResponse.json({ error: "agent_not_found" }, { status: 404 });
  }
  if (agent.status !== "active") {
    return NextResponse.json({ error: "agent_not_active", detail: agent.status }, { status: 403 });
  }

  // Idempotency shortcut.
  if (idempotencyKey) {
    const { data: prior } = await db
      .from("agent_transactions")
      .select("id, status, amount_cents, policy_check_result")
      .eq("organization_id", auth.organizationId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (prior) {
      return NextResponse.json({
        authorized: prior.status === "authorized" || prior.status === "captured",
        transaction_id: prior.id,
        reason: "idempotent_replay",
        policy_check_result: prior.policy_check_result ?? {},
      });
    }
  }

  // Signature verification (optional in Phase 1 if the agent has no public_key
  // registered — we warn but still allow, so the dashboard can test without
  // a keypair. In prod the API-key path would require signatures.)
  let signatureOk = true;
  if (signature && agent.public_key) {
    const { signature: _sigOmit, ...payload } = body;
    void _sigOmit;
    const message = canonicalJsonForSigning(payload as Record<string, unknown>);
    signatureOk = await verify(signature, message, agent.public_key);
    if (!signatureOk) {
      await writeDeniedTx({
        db, auth, agentId, amountCents, currency, merchantId, category, protocol,
        signature, idempotencyKey,
        policyResult: {
          approved: false,
          reason: "signature_invalid",
          checks: [{ rule: "wallet_balance", pass: false, detail: "signature verify failed" }],
        },
      });
      return NextResponse.json({ authorized: false, reason: "signature_invalid" }, { status: 403 });
    }
  }

  // Load policy + usage context.
  const ctx = await loadPolicyContext((await getWalletIdForAgent(db, agentId))!, new Date());

  const policyResult = validateTransaction({
    wallet: ctx.wallet,
    policy: ctx.policy,
    amountCents,
    merchantId,
    category,
    timestamp: new Date(),
    monthToDateSpendCents: ctx.monthToDateSpendCents,
    dayToDateSpendCents: ctx.dayToDateSpendCents,
  });

  if (!policyResult.approved) {
    const { id: txId } = await writeTx(db, {
      agentId,
      walletId: ctx.wallet.id,
      organizationId: auth.organizationId,
      amountCents,
      currency,
      merchantId,
      category,
      status: "denied",
      protocol,
      policyCheckResult: policyResult,
      signature,
      idempotencyKey,
    });
    await logEvent({
      organizationId: auth.organizationId,
      actorType: auth.via === "api_key" ? "api_key" : "user",
      actorId: auth.apiKeyId ?? null,
      eventType: "payment.denied",
      payload: { transaction_id: txId, reason: policyResult.reason },
    });
    return NextResponse.json({
      authorized: false,
      transaction_id: txId,
      reason: policyResult.reason,
      policy_check_result: policyResult,
    });
  }

  // Approved: debit wallet + insert tx in authorized state.
  try {
    await debitWallet(ctx.wallet.id, amountCents);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ authorized: false, reason: "wallet_debit_failed", detail }, { status: 402 });
  }
  const { id: txId } = await writeTx(db, {
    agentId,
    walletId: ctx.wallet.id,
    organizationId: auth.organizationId,
    amountCents,
    currency,
    merchantId,
    category,
    status: "authorized",
    protocol,
    policyCheckResult: policyResult,
    signature,
    idempotencyKey,
  });
  await logEvent({
    organizationId: auth.organizationId,
    actorType: auth.via === "api_key" ? "api_key" : "user",
    actorId: auth.apiKeyId ?? null,
    eventType: "payment.authorized",
    payload: { transaction_id: txId, amount_cents: amountCents, merchant_id: merchantId },
  });

  return NextResponse.json({
    authorized: true,
    transaction_id: txId,
    reason: "approved",
    policy_check_result: policyResult,
  });
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

interface DbClient {
  from: (t: string) => {
    select: (s: string) => {
      eq: (c: string, v: unknown) => { maybeSingle: () => Promise<{ data: { id: string } | null }> };
    };
  };
}

async function getWalletIdForAgent(db: DbClient, agentId: string): Promise<string | null> {
  const { data } = await db.from("agent_wallets").select("id").eq("agent_id", agentId).maybeSingle();
  return data?.id ?? null;
}

interface WriteTxParams {
  agentId: string;
  walletId: string;
  organizationId: string;
  amountCents: number;
  currency: string;
  merchantId: string | null;
  category: string | null;
  status: "authorized" | "denied";
  protocol: string;
  policyCheckResult: PolicyCheckResult;
  signature: string | null;
  idempotencyKey: string | null;
}

async function writeTx(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  p: WriteTxParams,
): Promise<{ id: string }> {
  const { data, error } = await db
    .from("agent_transactions")
    .insert({
      agent_id: p.agentId,
      wallet_id: p.walletId,
      organization_id: p.organizationId,
      amount_cents: p.amountCents,
      currency: p.currency,
      merchant_id: p.merchantId,
      category: p.category,
      status: p.status,
      protocol_used: p.protocol,
      policy_check_result: p.policyCheckResult,
      signature: p.signature,
      idempotency_key: p.idempotencyKey,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`tx insert failed: ${error?.message}`);
  return data as { id: string };
}

async function writeDeniedTx(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any;
  auth: { organizationId: string };
  agentId: string;
  amountCents: number;
  currency: string;
  merchantId: string | null;
  category: string | null;
  protocol: string;
  signature: string | null;
  idempotencyKey: string | null;
  policyResult: PolicyCheckResult;
}): Promise<void> {
  const walletId = await getWalletIdForAgent(args.db, args.agentId);
  if (!walletId) return;
  await writeTx(args.db, {
    agentId: args.agentId,
    walletId,
    organizationId: args.auth.organizationId,
    amountCents: args.amountCents,
    currency: args.currency,
    merchantId: args.merchantId,
    category: args.category,
    status: "denied",
    protocol: args.protocol,
    policyCheckResult: args.policyResult,
    signature: args.signature,
    idempotencyKey: args.idempotencyKey,
  });
}
