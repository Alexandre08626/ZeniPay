// ZeniPay Ledger Service — Append-only financial ledger
// NEVER modify existing entries. Always append new ones.

import { createClient } from "@supabase/supabase-js";
import type { LedgerEventType, WalletType, ZeniLedgerEntry, ZeniWalletBalance } from "../database/schema";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

// ─── Append a ledger entry ────────────────────────────────────────────────
export async function appendLedger(entry: Omit<ZeniLedgerEntry, "id" | "created_at">): Promise<string> {
  const supabase = getSupabase();
  const id = `led_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const { error } = await supabase.from("zenipay_ledger").insert({
    ...entry,
    id,
    created_at: new Date().toISOString(),
  });
  if (error) throw new Error(`Ledger append failed: ${error.message}`);
  return id;
}

// ─── Append payment distribution (called after successful payment) ─────────
// Travel agent involved: Agent 70%, Zeniva 30%
// Lina books alone: Zeniva 70%, Agent 30%
// For now: 100% → Platform wallet (admin distributes manually)
export async function recordPaymentReceived(opts: {
  paymentId: string;
  amount: number;
  currency: string;
  agentCode?: string;
}): Promise<void> {
  const { paymentId, amount, currency } = opts;

  // Credit 100% to Platform wallet
  await appendLedger({
    payment_id: paymentId,
    event_type: "customer_payment",
    wallet_type: "platform",
    direction: "credit",
    amount,
    currency,
    reference: paymentId,
    note: "Customer payment — full amount to Platform Wallet",
  });

  // Also write double-entry accounting record
  await appendAccountingEntry({
    paymentId,
    amount,
    currency,
  });
}

// ─── Record payout execution ──────────────────────────────────────────────
export async function recordPayoutExecution(opts: {
  payoutId: string;
  fromWallet: WalletType;
  amount: number;
  currency: string;
  recipientName: string;
  reference?: string;
}): Promise<void> {
  const { payoutId, fromWallet, amount, currency, recipientName, reference } = opts;

  await appendLedger({
    payout_id: payoutId,
    event_type: "payout_execution",
    wallet_type: fromWallet,
    direction: "debit",
    amount,
    currency,
    reference: reference || payoutId,
    note: `Payout to ${recipientName}`,
  });
}

// ─── Fetch wallet balances (derived from ledger) ──────────────────────────
export async function getWalletBalances(): Promise<Record<WalletType, ZeniWalletBalance>> {
  const supabase = getSupabase();

  const defaults: Record<WalletType, ZeniWalletBalance> = {
    platform:   { wallet_type: "platform",   available: 0, pending: 0, paid_out: 0, currency: "USD", last_updated: new Date().toISOString() },
    agent:      { wallet_type: "agent",       available: 0, pending: 0, paid_out: 0, currency: "USD", last_updated: new Date().toISOString() },
    influencer: { wallet_type: "influencer",  available: 0, pending: 0, paid_out: 0, currency: "USD", last_updated: new Date().toISOString() },
    supplier:   { wallet_type: "supplier",    available: 0, pending: 0, paid_out: 0, currency: "USD", last_updated: new Date().toISOString() },
  };

  try {
    // Compute balances directly from zenipay_ledger (source of truth)
    const { data: ledgerRows } = await supabase
      .from("zenipay_ledger")
      .select("wallet_type, direction, amount");

    if (ledgerRows && ledgerRows.length > 0) {
      for (const row of ledgerRows) {
        const wt = (row.wallet_type || "platform") as WalletType;
        if (wt in defaults) {
          const amt = Number(row.amount) || 0;
          if (row.direction === "credit") {
            defaults[wt].available += amt;
          } else if (row.direction === "debit") {
            defaults[wt].paid_out += amt;
            defaults[wt].available -= amt;
          }
        }
      }
    }
  } catch {
    // Supabase not configured yet — return $0
  }

  return defaults;
}

// ─── Get recent ledger entries ─────────────────────────────────────────────
export async function getRecentLedger(limit = 20): Promise<ZeniLedgerEntry[]> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from("zenipay_ledger")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data as ZeniLedgerEntry[];
  } catch {
    return [];
  }
}

// ─── Double-entry accounting on payment ──────────────────────────────────
async function appendAccountingEntry(opts: {
  paymentId: string;
  amount: number;
  currency: string;
}): Promise<void> {
  const supabase = getSupabase();
  const period = new Date().toISOString().slice(0, 7); // YYYY-MM
  const entries = [
    {
      id: `acc_${Date.now()}_1`,
      payment_id: opts.paymentId,
      account_code: "1000",
      account_name: "ZeniPay Platform Wallet",
      entry_type: "debit",
      amount: opts.amount,
      currency: opts.currency,
      description: `Customer payment ${opts.paymentId}`,
      period,
      created_at: new Date().toISOString(),
    },
    {
      id: `acc_${Date.now()}_2`,
      payment_id: opts.paymentId,
      account_code: "4000",
      account_name: "Travel Revenue",
      entry_type: "credit",
      amount: opts.amount,
      currency: opts.currency,
      description: `Customer payment ${opts.paymentId}`,
      period,
      created_at: new Date().toISOString(),
    },
  ];

  try {
    await supabase.from("zenipay_accounting_entries").insert(entries);
  } catch {
    // Non-fatal — ledger is the source of truth
  }
}

// ─── Idempotency ─────────────────────────────────────────────────────────
export async function checkIdempotency(key: string): Promise<Record<string, unknown> | null> {
  const supabase = getSupabase();
  try {
    const { data } = await supabase
      .from("zenipay_idempotency_keys")
      .select("result, expires_at")
      .eq("key", key)
      .single();
    if (data && new Date(data.expires_at) > new Date()) {
      return data.result as Record<string, unknown>;
    }
  } catch { /* not found */ }
  return null;
}

export async function saveIdempotency(key: string, operation: string, result: Record<string, unknown>): Promise<void> {
  const supabase = getSupabase();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  try {
    await supabase.from("zenipay_idempotency_keys").upsert({
      key, operation, result,
      created_at: new Date().toISOString(),
      expires_at: expiresAt,
    });
  } catch { /* non-fatal */ }
}

// ─── Audit log ────────────────────────────────────────────────────────────
export async function writeAuditLog(opts: {
  action: string;
  entityType: string;
  entityId: string;
  userId?: string;
  changes?: Record<string, unknown>;
}): Promise<void> {
  const supabase = getSupabase();
  try {
    await supabase.from("zenipay_audit_logs").insert({
      id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      action: opts.action,
      entity_type: opts.entityType,
      entity_id: opts.entityId,
      user_id: opts.userId,
      changes: opts.changes,
      created_at: new Date().toISOString(),
    });
  } catch { /* non-fatal */ }
}
