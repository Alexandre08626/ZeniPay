// Virtual USD wallet for Phase 1. Balances live in agents.agent_wallets.
// Phase 2 will bridge to USDC / Finix settlement via finix_balance_ref.
//
// Concurrency model: Postgres performs the balance check inside a single
// UPDATE ... WHERE ... RETURNING statement, which is atomic per row. That's
// enough for Phase 1. If we ever split writes across multiple statements
// we'll need SELECT ... FOR UPDATE or advisory locks.

import { getAgentsDb } from "./supabase-client";
import type { AgentWallet } from "./types";

export class WalletError extends Error {
  constructor(public code: WalletErrorCode, message: string) {
    super(message);
    this.name = "WalletError";
  }
}

export type WalletErrorCode =
  | "wallet_not_found"
  | "insufficient_balance"
  | "invalid_amount"
  | "db_error";

export interface CreateWalletParams {
  agentId: string;
  organizationId: string;
  currency?: string;
  initialBalanceCents?: number;
}

export async function createWallet(
  params: CreateWalletParams,
): Promise<AgentWallet> {
  const db = getAgentsDb();
  const { data, error } = await db
    .from("agent_wallets")
    .insert({
      agent_id: params.agentId,
      organization_id: params.organizationId,
      currency: params.currency ?? "USD",
      balance_cents: params.initialBalanceCents ?? 0,
    })
    .select()
    .single();
  if (error || !data) {
    throw new WalletError("db_error", error?.message ?? "failed to create wallet");
  }
  return data as AgentWallet;
}

export async function getBalance(walletId: string): Promise<number> {
  const db = getAgentsDb();
  const { data, error } = await db
    .from("agent_wallets")
    .select("balance_cents")
    .eq("id", walletId)
    .maybeSingle();
  if (error) throw new WalletError("db_error", error.message);
  if (!data) throw new WalletError("wallet_not_found", walletId);
  return Number(data.balance_cents);
}

export async function getWallet(walletId: string): Promise<AgentWallet> {
  const db = getAgentsDb();
  const { data, error } = await db
    .from("agent_wallets")
    .select("*")
    .eq("id", walletId)
    .maybeSingle();
  if (error) throw new WalletError("db_error", error.message);
  if (!data) throw new WalletError("wallet_not_found", walletId);
  return data as AgentWallet;
}

/**
 * Atomically deduct `amountCents` from the wallet. Fails if balance would go
 * negative. Returns the new balance.
 */
export async function debitWallet(
  walletId: string,
  amountCents: number,
  _txId?: string,
): Promise<number> {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new WalletError("invalid_amount", `amount must be positive integer cents, got ${amountCents}`);
  }
  const db = getAgentsDb();
  // Atomic: decrement only if balance >= amount. Returns zero rows if the
  // predicate fails, which we interpret as insufficient balance.
  const { data, error } = await db.rpc("agent_wallet_debit", {
    p_wallet_id: walletId,
    p_amount_cents: amountCents,
  });
  if (error) {
    // Fallback: if the RPC doesn't exist yet (migration not shipped), emulate.
    if (/function .* does not exist/i.test(error.message)) {
      return debitWalletFallback(walletId, amountCents);
    }
    throw new WalletError("db_error", error.message);
  }
  const newBalance = Array.isArray(data) ? data[0]?.new_balance_cents : (data as { new_balance_cents?: number })?.new_balance_cents;
  if (newBalance == null) {
    throw new WalletError("insufficient_balance", `wallet ${walletId}: insufficient balance for ${amountCents}`);
  }
  return Number(newBalance);
}

async function debitWalletFallback(walletId: string, amountCents: number): Promise<number> {
  const db = getAgentsDb();
  const { data: before, error: readErr } = await db
    .from("agent_wallets")
    .select("balance_cents")
    .eq("id", walletId)
    .maybeSingle();
  if (readErr) throw new WalletError("db_error", readErr.message);
  if (!before) throw new WalletError("wallet_not_found", walletId);
  const current = Number(before.balance_cents);
  if (current < amountCents) {
    throw new WalletError("insufficient_balance", `balance ${current} < requested ${amountCents}`);
  }
  const next = current - amountCents;
  const { data, error } = await db
    .from("agent_wallets")
    .update({ balance_cents: next })
    .eq("id", walletId)
    .eq("balance_cents", current) // optimistic lock
    .select("balance_cents")
    .maybeSingle();
  if (error) throw new WalletError("db_error", error.message);
  if (!data) throw new WalletError("insufficient_balance", "concurrent update lost the race; retry");
  return Number(data.balance_cents);
}

export async function creditWallet(
  walletId: string,
  amountCents: number,
  _source?: string,
): Promise<number> {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new WalletError("invalid_amount", `amount must be positive integer cents, got ${amountCents}`);
  }
  const db = getAgentsDb();
  const current = await getBalance(walletId);
  const { data, error } = await db
    .from("agent_wallets")
    .update({ balance_cents: current + amountCents })
    .eq("id", walletId)
    .select("balance_cents")
    .maybeSingle();
  if (error) throw new WalletError("db_error", error.message);
  if (!data) throw new WalletError("wallet_not_found", walletId);
  return Number(data.balance_cents);
}
