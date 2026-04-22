// Core card-authorization decision engine.
//
// Called by:
//   - POST /api/v1/agents/_webhooks/stripe-issuing (real flow)
//   - POST /api/v1/agents/_dev/simulate-authorization (demo/E2E)
//
// Contract:
//   * Must respond in <1500ms p95 (Stripe cutoff 2000ms)
//   * NEVER computes velocity on-the-fly — only reads pre-computed
//     anomaly_signals. If signals are too stale, declines with
//     `signals_not_ready` rather than blocking.
//   * Writes one card_authorizations row + (on approve) one
//     agent_transactions row that debits the agent wallet via the
//     Phase 1 wallet-engine.

import { getAgentsDb } from "../supabase-client";
import { debitWallet, WalletError } from "../wallet-engine";
import { logEvent } from "../audit-log";
import type { PolicyCheckResult } from "../types";
import { evaluate as evalApprovalPolicy, type ApprovalPolicyRow } from "../approvals/policy-evaluator";
import { createRequest as createApprovalRequest, findUsableApproval } from "../approvals/request-manager";

export type CardDecision =
  | "approved"
  | "declined_policy"
  | "declined_balance"
  | "declined_merchant"
  | "declined_velocity"
  | "declined_fraud"
  | "pending_approval";

export interface AuthorizeInput {
  cardId: string;              // agents.issued_cards.id (internal)
  externalAuthId?: string;     // Stripe's iauth_... if present
  amountCents: number;
  currency: string;
  merchantName?: string;
  merchantCategory?: string;   // MCC
  merchantNetworkId?: string;
  merchantCountry?: string;
  idempotencyKey?: string;
  occurredAt?: string;         // ISO; default NOW()
}

export interface AuthorizeResult {
  decision: CardDecision;
  approved: boolean;
  reason: string;
  card_authorization_id: string;
  latency_ms: number;
  signals_age_seconds: number | null;
  transaction_id?: string;
}

/** Max staleness for velocity signals before we decline. 2 hours. */
const SIGNALS_MAX_AGE_S = 2 * 60 * 60;

interface CardRow {
  id: string;
  organization_id: string;
  agent_id: string | null;
  status: "requested" | "active" | "paused" | "canceled" | "expired";
  spending_controls: Record<string, unknown>;
  ledger_wallet_id: string | null;
  issuer_provider: string;
  external_card_id: string | null;
  deleted_at: string | null;
}

export async function authorizeCardSpend(input: AuthorizeInput): Promise<AuthorizeResult> {
  const t0 = Date.now();
  const db = getAgentsDb();
  const checks: PolicyCheckResult["checks"] = [];

  // Idempotency replay — if we've already decided on this external auth, return
  // the cached decision without re-running the engine.
  if (input.idempotencyKey) {
    const { data: prior } = await db
      .from("card_authorizations")
      .select("id, decision, decision_reason, transaction_id")
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle();
    if (prior) {
      const reason = (prior.decision_reason as Record<string, unknown>)?.reason as string ?? "idempotent_replay";
      return {
        decision: prior.decision as CardDecision,
        approved: prior.decision === "approved",
        reason,
        card_authorization_id: prior.id,
        latency_ms: Date.now() - t0,
        signals_age_seconds: null,
        transaction_id: prior.transaction_id ?? undefined,
      };
    }
  }

  // 1. Load the card + its policy-relevant fields.
  const { data: card } = await db
    .from("issued_cards")
    .select("id, organization_id, agent_id, status, spending_controls, ledger_wallet_id, issuer_provider, external_card_id, deleted_at")
    .eq("id", input.cardId)
    .maybeSingle();

  if (!card || (card as CardRow).deleted_at) {
    return finalize(db, {
      cardId: input.cardId, organizationId: "", input, decision: "declined_policy",
      reason: "card_not_found", checks: [{ rule: "policy_active", pass: false, detail: "card not found" }],
      t0, signalsAgeSeconds: null, agentId: null, walletId: null,
    });
  }
  const c = card as CardRow;
  checks.push({ rule: "policy_active", pass: true });

  if (c.status !== "active") {
    return finalize(db, {
      cardId: c.id, organizationId: c.organization_id, input, decision: "declined_policy",
      reason: `card_${c.status}`,
      checks: [{ rule: "policy_active", pass: false, detail: `card status is ${c.status}` }],
      t0, signalsAgeSeconds: null, agentId: c.agent_id, walletId: c.ledger_wallet_id,
    });
  }

  // 2. Resolve the wallet that funds this card.
  let walletId = c.ledger_wallet_id;
  if (!walletId && c.agent_id) {
    const { data: w } = await db.from("agent_wallets").select("id").eq("agent_id", c.agent_id).maybeSingle();
    walletId = w?.id ?? null;
  }
  if (!walletId) {
    return finalize(db, {
      cardId: c.id, organizationId: c.organization_id, input, decision: "declined_balance",
      reason: "no_funding_wallet",
      checks: [{ rule: "wallet_balance", pass: false, detail: "no ledger wallet bound to card" }],
      t0, signalsAgeSeconds: null, agentId: c.agent_id, walletId: null,
    });
  }

  const { data: wallet } = await db
    .from("agent_wallets")
    .select("id, balance_cents, currency")
    .eq("id", walletId)
    .maybeSingle();
  if (!wallet) {
    return finalize(db, {
      cardId: c.id, organizationId: c.organization_id, input, decision: "declined_balance",
      reason: "wallet_not_found", checks: [{ rule: "wallet_balance", pass: false }],
      t0, signalsAgeSeconds: null, agentId: c.agent_id, walletId,
    });
  }

  // 3. Policy checks from spending_controls.
  const sc = c.spending_controls as Record<string, unknown>;
  const blockedMcc = asStringArray(sc.blocked_mcc);
  const allowedMcc = asStringArray(sc.allowed_mcc);
  const allowedCountries = asStringArray(sc.allowed_countries);
  const allowedMerchants = asStringArray(sc.allowed_merchants);
  const blockedMerchants = asStringArray(sc.blocked_merchants);
  const perTxCap = asNumber(sc.per_tx_cap_cents);

  if (input.merchantCategory && blockedMcc.length > 0 && blockedMcc.includes(input.merchantCategory)) {
    return finalize(db, {
      cardId: c.id, organizationId: c.organization_id, input, decision: "declined_merchant",
      reason: "mcc_blocked",
      checks: [{ rule: "merchant_blacklist", pass: false, detail: `MCC ${input.merchantCategory} blocked` }],
      t0, signalsAgeSeconds: null, agentId: c.agent_id, walletId,
    });
  }
  if (allowedMcc.length > 0 && input.merchantCategory && !allowedMcc.includes(input.merchantCategory)) {
    return finalize(db, {
      cardId: c.id, organizationId: c.organization_id, input, decision: "declined_merchant",
      reason: "mcc_not_allowed",
      checks: [{ rule: "allowed_categories", pass: false, detail: `MCC ${input.merchantCategory} not in allowlist` }],
      t0, signalsAgeSeconds: null, agentId: c.agent_id, walletId,
    });
  }
  if (allowedCountries.length > 0 && input.merchantCountry && !allowedCountries.includes(input.merchantCountry)) {
    return finalize(db, {
      cardId: c.id, organizationId: c.organization_id, input, decision: "declined_merchant",
      reason: "country_not_allowed",
      checks: [{ rule: "merchant_whitelist", pass: false, detail: `country ${input.merchantCountry}` }],
      t0, signalsAgeSeconds: null, agentId: c.agent_id, walletId,
    });
  }
  if (blockedMerchants.length > 0 && input.merchantName && blockedMerchants.includes(input.merchantName)) {
    return finalize(db, {
      cardId: c.id, organizationId: c.organization_id, input, decision: "declined_merchant",
      reason: "merchant_blocked",
      checks: [{ rule: "merchant_blacklist", pass: false, detail: input.merchantName }],
      t0, signalsAgeSeconds: null, agentId: c.agent_id, walletId,
    });
  }
  if (allowedMerchants.length > 0 && input.merchantName && !allowedMerchants.includes(input.merchantName)) {
    return finalize(db, {
      cardId: c.id, organizationId: c.organization_id, input, decision: "declined_merchant",
      reason: "merchant_not_in_allowlist",
      checks: [{ rule: "merchant_whitelist", pass: false, detail: input.merchantName }],
      t0, signalsAgeSeconds: null, agentId: c.agent_id, walletId,
    });
  }
  if (perTxCap != null && input.amountCents > perTxCap) {
    return finalize(db, {
      cardId: c.id, organizationId: c.organization_id, input, decision: "declined_policy",
      reason: "over_per_tx_cap",
      checks: [{ rule: "per_tx_cap", pass: false, detail: `${input.amountCents} > ${perTxCap}` }],
      t0, signalsAgeSeconds: null, agentId: c.agent_id, walletId,
    });
  }

  // 4. Velocity via pre-computed anomaly_signals (read-only; no aggregation).
  const { data: signal } = await db
    .from("anomaly_signals")
    .select("value, baseline, z_score, computed_at")
    .eq("scope_type", "card")
    .eq("scope_ref", c.id)
    .eq("metric", "daily_spend_cents")
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let signalsAgeSeconds: number | null = null;
  if (signal?.computed_at) {
    signalsAgeSeconds = Math.round((Date.now() - new Date(signal.computed_at as string).getTime()) / 1000);
  }
  // If signals exist but are stale beyond the cutoff, decline — we refuse to
  // authorize without recent velocity data for agent cards. (No-signals orgs
  // just pass through; they're brand-new cards that the hourly cron hasn't
  // observed yet.)
  if (signalsAgeSeconds != null && signalsAgeSeconds > SIGNALS_MAX_AGE_S) {
    return finalize(db, {
      cardId: c.id, organizationId: c.organization_id, input, decision: "declined_velocity",
      reason: "signals_not_ready",
      checks: [{ rule: "daily_cap", pass: false, detail: `signals stale (${signalsAgeSeconds}s)` }],
      t0, signalsAgeSeconds, agentId: c.agent_id, walletId,
    });
  }
  const zScore = signal?.z_score != null ? Number(signal.z_score) : null;
  if (zScore != null && zScore > 6) {
    return finalize(db, {
      cardId: c.id, organizationId: c.organization_id, input, decision: "declined_fraud",
      reason: "velocity_zscore_exceeded",
      checks: [{ rule: "daily_cap", pass: false, detail: `z=${zScore.toFixed(2)}` }],
      t0, signalsAgeSeconds, agentId: c.agent_id, walletId,
    });
  }

  // 5. Balance check (pre-debit).
  if (Number(wallet.balance_cents) < input.amountCents) {
    return finalize(db, {
      cardId: c.id, organizationId: c.organization_id, input, decision: "declined_balance",
      reason: "insufficient_balance",
      checks: [{ rule: "wallet_balance", pass: false, detail: `${wallet.balance_cents} < ${input.amountCents}` }],
      t0, signalsAgeSeconds, agentId: c.agent_id, walletId,
    });
  }

  // 5b. Approval policies — between balance-OK and the wallet debit.
  //     Cheap read (indexed on organization_id + active + priority); target <200ms.
  const approvalOutcome = await checkApprovalRequirement({
    db, organizationId: c.organization_id, cardId: c.id,
    amountCents: input.amountCents, currency: input.currency,
    merchantCategory: input.merchantCategory, merchantName: input.merchantName,
    merchantCountry: input.merchantCountry, anomalyScore: zScore,
    occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
    agentId: c.agent_id,
  });
  if (approvalOutcome.needs_approval) {
    return finalize(db, {
      cardId: c.id, organizationId: c.organization_id, input, decision: "pending_approval",
      reason: `approval_pending:${approvalOutcome.reason}`,
      checks: [...checks, { rule: "policy_active", pass: true, detail: `approval_request=${approvalOutcome.approval_request_id ?? "n/a"}` }],
      t0, signalsAgeSeconds, agentId: c.agent_id, walletId,
      approvalRequestId: approvalOutcome.approval_request_id,
    });
  }

  try {
    await debitWallet(walletId!, input.amountCents);
  } catch (err) {
    const reason = err instanceof WalletError ? err.code : "wallet_debit_failed";
    return finalize(db, {
      cardId: c.id, organizationId: c.organization_id, input, decision: "declined_balance",
      reason, checks: [{ rule: "wallet_balance", pass: false, detail: String(err) }],
      t0, signalsAgeSeconds, agentId: c.agent_id, walletId,
    });
  }

  // 6. Write agent_transactions + card_authorizations.
  const { data: tx } = await db
    .from("agent_transactions")
    .insert({
      agent_id: c.agent_id,
      wallet_id: walletId,
      organization_id: c.organization_id,
      amount_cents: input.amountCents,
      currency: input.currency,
      merchant_id: input.merchantName ?? null,
      category: input.merchantCategory ?? null,
      status: "authorized",
      protocol_used: "card_issuing_v1",
      policy_check_result: {
        approved: true, reason: "approved",
        checks: [...checks, { rule: "wallet_balance", pass: true }],
      },
      idempotency_key: input.idempotencyKey ?? null,
    })
    .select("id")
    .single();

  return finalize(db, {
    cardId: c.id, organizationId: c.organization_id, input, decision: "approved",
    reason: "approved",
    checks: [...checks, { rule: "wallet_balance", pass: true }],
    t0, signalsAgeSeconds, agentId: c.agent_id, walletId,
    transactionId: tx?.id ?? null,
  });
}

// ---------------------------------------------------------------------------

interface FinalizeInput {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any;
}

interface FinalizeArgs {
  cardId: string;
  organizationId: string;
  input: AuthorizeInput;
  decision: CardDecision;
  reason: string;
  checks: PolicyCheckResult["checks"];
  t0: number;
  signalsAgeSeconds: number | null;
  agentId: string | null;
  walletId: string | null;
  transactionId?: string | null;
  approvalRequestId?: string | null;
}

async function finalize(
  db: FinalizeInput["db"],
  a: FinalizeArgs,
): Promise<AuthorizeResult> {
  const latencyMs = Date.now() - a.t0;
  const decisionReason = {
    policy_check: a.checks.every((c) => c.pass) ? "pass" : "fail",
    reason: a.reason,
    checks: a.checks,
    latency_ms: latencyMs,
    signals_age_seconds: a.signalsAgeSeconds,
    approval_request_id: a.approvalRequestId ?? null,
    version: "v1",
  };

  let cardAuthId = "";
  if (a.cardId && a.organizationId) {
    const { data } = await db
      .from("card_authorizations")
      .insert({
        card_id: a.cardId,
        organization_id: a.organizationId,
        amount_cents: a.input.amountCents,
        currency: a.input.currency,
        merchant_name: a.input.merchantName ?? null,
        merchant_category: a.input.merchantCategory ?? null,
        merchant_network_id: a.input.merchantNetworkId ?? null,
        merchant_country: a.input.merchantCountry ?? null,
        external_auth_id: a.input.externalAuthId ?? null,
        decision: a.decision,
        decision_reason: decisionReason,
        transaction_id: a.transactionId ?? null,
        approval_request_id: a.approvalRequestId ?? null,
        idempotency_key: a.input.idempotencyKey ?? null,
        occurred_at: a.input.occurredAt ?? new Date().toISOString(),
      })
      .select("id")
      .single();
    cardAuthId = data?.id ?? "";
  }

  if (a.organizationId) {
    void logEvent({
      organizationId: a.organizationId,
      actorType: "system",
      actorId: null,
      eventType: a.decision === "approved" ? "card.authorization.approved" : "card.authorization.declined",
      payload: {
        card_id: a.cardId, card_authorization_id: cardAuthId,
        amount_cents: a.input.amountCents, currency: a.input.currency,
        decision: a.decision, reason: a.reason, latency_ms: latencyMs,
      },
    });
  }

  return {
    decision: a.decision,
    approved: a.decision === "approved",
    reason: a.reason,
    card_authorization_id: cardAuthId,
    latency_ms: latencyMs,
    signals_age_seconds: a.signalsAgeSeconds,
    transaction_id: a.transactionId ?? undefined,
  };
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x) => typeof x === "string") as string[] : [];
}
function asNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

// ---------------------------------------------------------------------------
// Approval policy check — indexed single-query read + optional insert.
// Contract: must complete <200ms so Stripe's 1500ms p95 budget is preserved.
// ---------------------------------------------------------------------------
interface ApprovalCheckInput {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any;
  organizationId: string;
  cardId: string;
  amountCents: number;
  currency: string;
  merchantCategory?: string;
  merchantName?: string;
  merchantCountry?: string;
  anomalyScore: number | null;
  occurredAt: Date;
  agentId: string | null;
}

interface ApprovalCheckOutcome {
  needs_approval: boolean;
  reason: string;
  approval_request_id: string | null;
}

async function checkApprovalRequirement(i: ApprovalCheckInput): Promise<ApprovalCheckOutcome> {
  // Retry-bypass: if the agent already got a matching approval inside the
  // 5-min / ±10% window, auto-pass without asking again.
  const usable = await findUsableApproval({
    organizationId: i.organizationId,
    cardId: i.cardId,
    merchantName: i.merchantName,
    amountCents: i.amountCents,
  });
  if (usable) {
    await logEvent({
      organizationId: i.organizationId,
      actorType: "system",
      eventType: "approval.used_for_retry",
      payload: { request_id: usable.id, card_id: i.cardId, amount_cents: i.amountCents },
    });
    return { needs_approval: false, reason: "approval_reused_within_window", approval_request_id: usable.id };
  }

  // Load active policies for this org (indexed on organization_id, priority).
  const { data } = await i.db
    .from("approval_policies")
    .select("id, organization_id, name, trigger_type, trigger_config, approver_type, approver_config, timeout_seconds, default_action, active, priority")
    .eq("organization_id", i.organizationId)
    .eq("active", true)
    .order("priority", { ascending: true });
  const policies = (data ?? []) as ApprovalPolicyRow[];

  const evalResult = evalApprovalPolicy(
    {
      amountCents: i.amountCents,
      currency: i.currency,
      merchantCategory: i.merchantCategory,
      merchantName: i.merchantName,
      merchantCountry: i.merchantCountry,
      occurredAt: i.occurredAt,
      anomalyScore: i.anomalyScore,
    },
    policies,
  );
  if (!evalResult.requires_approval) {
    return { needs_approval: false, reason: "no_policy_matched", approval_request_id: null };
  }

  // Create the request. Atomicity note: if authorize.ts crashes right after
  // this insert but before writing card_authorizations, the request will be
  // orphan-pending; the hourly TTL cron expires it safely.
  const req = await createApprovalRequest({
    organizationId: i.organizationId,
    policyId: evalResult.matched_policy_id!,
    subjectType: "card_authorization",
    subjectRef: i.cardId,
    requestedByAgentId: i.agentId,
    requestedAmountCents: i.amountCents,
    requestedCurrency: i.currency,
    context: {
      card_id: i.cardId,
      merchant: i.merchantName,
      merchant_category: i.merchantCategory,
      merchant_country: i.merchantCountry,
      anomaly_score: i.anomalyScore,
      required_signatures: evalResult.required_signatures,
    },
    timeoutSeconds: evalResult.timeout_seconds || 900,
  });
  return { needs_approval: true, reason: evalResult.reason, approval_request_id: req.id };
}
