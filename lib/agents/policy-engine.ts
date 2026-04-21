// Policy engine. validateTransaction is a pure function over a policy + usage
// snapshot; the side-effectful DB lookups are in loadPolicyContext. Separating
// them keeps the rule logic trivially unit-testable without a DB mock.

import { getAgentsDb } from "./supabase-client";
import type { AgentPolicy, AgentWallet, PolicyCheckResult } from "./types";

export interface ValidateTransactionInput {
  wallet: AgentWallet;
  policy: AgentPolicy | null;
  amountCents: number;
  merchantId: string | null;
  category: string | null;
  timestamp: Date;
  monthToDateSpendCents: number;
  dayToDateSpendCents: number;
}

export interface PolicyContext {
  wallet: AgentWallet;
  policy: AgentPolicy | null;
  monthToDateSpendCents: number;
  dayToDateSpendCents: number;
}

/**
 * Pure rule evaluator. Returns the full checklist, not just pass/fail — the
 * detail goes into agent_transactions.policy_check_result for audit.
 */
export function validateTransaction(
  input: ValidateTransactionInput,
): PolicyCheckResult {
  const checks: PolicyCheckResult["checks"] = [];
  const { policy, wallet, amountCents, merchantId, category, timestamp } = input;

  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    return {
      approved: false,
      reason: "amount_invalid",
      checks: [{ rule: "per_tx_cap", pass: false, detail: `invalid amount: ${amountCents}` }],
    };
  }

  // Wallet balance is always checked — independent of any policy.
  const balanceOk = wallet.balance_cents >= amountCents;
  checks.push({
    rule: "wallet_balance",
    pass: balanceOk,
    detail: balanceOk ? undefined : `balance ${wallet.balance_cents} < ${amountCents}`,
  });

  if (!policy) {
    // No policy = wallet-balance check is the only gate.
    return finalize(checks, balanceOk ? "approved" : "insufficient_balance");
  }

  if (!policy.active) {
    checks.push({ rule: "policy_active", pass: false, detail: "policy is disabled" });
    return finalize(checks, "policy_inactive");
  }
  checks.push({ rule: "policy_active", pass: true });

  if (policy.per_tx_cap_cents != null) {
    const pass = amountCents <= policy.per_tx_cap_cents;
    checks.push({
      rule: "per_tx_cap",
      pass,
      detail: pass ? undefined : `${amountCents} > cap ${policy.per_tx_cap_cents}`,
    });
  }

  if (policy.daily_cap_cents != null) {
    const projected = input.dayToDateSpendCents + amountCents;
    const pass = projected <= policy.daily_cap_cents;
    checks.push({
      rule: "daily_cap",
      pass,
      detail: pass ? undefined : `projected daily ${projected} > cap ${policy.daily_cap_cents}`,
    });
  }

  if (policy.monthly_budget_cents != null) {
    const projected = input.monthToDateSpendCents + amountCents;
    const pass = projected <= policy.monthly_budget_cents;
    checks.push({
      rule: "monthly_budget",
      pass,
      detail: pass ? undefined : `projected month ${projected} > budget ${policy.monthly_budget_cents}`,
    });
  }

  if (policy.merchant_blacklist.length > 0 && merchantId) {
    const pass = !policy.merchant_blacklist.includes(merchantId);
    checks.push({
      rule: "merchant_blacklist",
      pass,
      detail: pass ? undefined : `${merchantId} is blacklisted`,
    });
  }

  if (policy.merchant_whitelist.length > 0) {
    const pass = merchantId != null && policy.merchant_whitelist.includes(merchantId);
    checks.push({
      rule: "merchant_whitelist",
      pass,
      detail: pass ? undefined : `${merchantId ?? "<none>"} not in whitelist`,
    });
  }

  if (policy.allowed_categories.length > 0) {
    const pass = category != null && policy.allowed_categories.includes(category);
    checks.push({
      rule: "allowed_categories",
      pass,
      detail: pass ? undefined : `category ${category ?? "<none>"} not allowed`,
    });
  }

  if (policy.time_window_start != null && policy.time_window_end != null) {
    const pass = isInUtcTimeWindow(timestamp, policy.time_window_start, policy.time_window_end);
    checks.push({
      rule: "time_window",
      pass,
      detail: pass ? undefined : `${timestamp.toISOString()} outside ${policy.time_window_start}-${policy.time_window_end} UTC`,
    });
  }

  const approved = checks.every((c) => c.pass);
  return finalize(checks, approved ? "approved" : firstFailReason(checks));
}

function finalize(checks: PolicyCheckResult["checks"], reason: string): PolicyCheckResult {
  return { approved: checks.every((c) => c.pass), reason, checks };
}

function firstFailReason(checks: PolicyCheckResult["checks"]): string {
  const failed = checks.find((c) => !c.pass);
  return failed ? failed.rule : "unknown";
}

/**
 * Time window applies in UTC and supports wraparound (e.g. 22:00 → 06:00).
 */
export function isInUtcTimeWindow(
  t: Date,
  startHms: string,
  endHms: string,
): boolean {
  const mins = t.getUTCHours() * 60 + t.getUTCMinutes();
  const start = hmsToMinutes(startHms);
  const end = hmsToMinutes(endHms);
  if (start === end) return true;
  if (start < end) return mins >= start && mins < end;
  // wraparound window (end < start): valid when after start OR before end
  return mins >= start || mins < end;
}

function hmsToMinutes(hms: string): number {
  const [h, m] = hms.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

// ---------------------------------------------------------------------------
// DB integration — loads context then calls the pure evaluator.
// ---------------------------------------------------------------------------

export async function loadPolicyContext(
  walletId: string,
  now: Date = new Date(),
): Promise<PolicyContext> {
  const db = getAgentsDb();
  const [{ data: wallet }, { data: policy }] = await Promise.all([
    db.from("agent_wallets").select("*").eq("id", walletId).maybeSingle(),
    db.from("agent_policies").select("*").eq("wallet_id", walletId).maybeSingle(),
  ]);
  if (!wallet) throw new Error(`wallet_not_found: ${walletId}`);

  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const [{ data: mtd }, { data: dtd }] = await Promise.all([
    db
      .from("agent_transactions")
      .select("amount_cents")
      .eq("wallet_id", walletId)
      .in("status", ["authorized", "captured"])
      .gte("created_at", startOfMonth.toISOString()),
    db
      .from("agent_transactions")
      .select("amount_cents")
      .eq("wallet_id", walletId)
      .in("status", ["authorized", "captured"])
      .gte("created_at", startOfDay.toISOString()),
  ]);

  const sum = (rows: Array<{ amount_cents: number }> | null): number =>
    (rows ?? []).reduce((s, r) => s + Number(r.amount_cents), 0);

  return {
    wallet: wallet as AgentWallet,
    policy: (policy ?? null) as AgentPolicy | null,
    monthToDateSpendCents: sum(mtd as Array<{ amount_cents: number }>),
    dayToDateSpendCents: sum(dtd as Array<{ amount_cents: number }>),
  };
}
