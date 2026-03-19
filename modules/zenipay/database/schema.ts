// ZeniPay Database Schema — Production Grade
// All tables managed via Supabase / Postgres

export const ZENIPAY_TABLES = {
  payments:          "zenipay_payments",
  transactions:      "zenipay_transactions",
  ledger:            "zenipay_ledger",
  walletBalances:    "zenipay_wallet_balances",
  payouts:           "zenipay_payouts",
  commissions:       "zenipay_commissions",
  invoices:          "zenipay_invoices",
  payLinks:          "zenipay_pay_links",
  accountingEntries: "zenipay_accounting_entries",
  journalEntries:    "zenipay_journal_entries",
  chartOfAccounts:   "zenipay_chart_of_accounts",
  webhookEvents:     "zenipay_webhook_events",
  auditLogs:         "zenipay_audit_logs",
  idempotencyKeys:   "zenipay_idempotency_keys",
} as const;

// ─── Wallet types ────────────────────────────────────────────────────────────
export type WalletType = "platform" | "agent" | "influencer" | "supplier";

// ─── Payment ─────────────────────────────────────────────────────────────────
export interface ZeniPayment {
  id: string;
  idempotency_key?: string;
  booking_id?: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  amount: number;           // cents or full USD — stored as float
  currency: string;
  status: "pending" | "succeeded" | "failed" | "refunded" | "canceled";
  gateway: "finix";
  gateway_payment_instrument_id?: string;
  gateway_transfer_id?: string;
  gateway_response?: Record<string, unknown>;
  description?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ─── Ledger entry (append-only, never modify) ─────────────────────────────
export type LedgerEventType =
  | "customer_payment"
  | "platform_fee"
  | "agent_commission"
  | "influencer_commission"
  | "supplier_allocation"
  | "payout_execution"
  | "refund"
  | "processor_fee"
  | "manual_adjustment";

export interface ZeniLedgerEntry {
  id: string;
  payment_id?: string;
  payout_id?: string;
  event_type: LedgerEventType;
  wallet_type: WalletType;
  direction: "credit" | "debit";
  amount: number;
  currency: string;
  reference?: string;
  note?: string;
  created_at: string;
  created_by?: string;
}

// ─── Wallet balance (derived from ledger, cached for perf) ────────────────
export interface ZeniWalletBalance {
  wallet_type: WalletType;
  available: number;
  pending: number;
  paid_out: number;
  currency: string;
  last_updated: string;
}

// ─── Payout ───────────────────────────────────────────────────────────────
export interface ZeniPayout {
  id: string;
  idempotency_key?: string;
  recipient_type: "agent" | "influencer" | "supplier" | "other";
  recipient_id?: string;
  recipient_name: string;
  from_wallet: WalletType;
  amount: number;
  currency: string;
  method: "ach" | "wire" | "instant" | "check";
  status: "pending" | "processing" | "paid" | "failed" | "canceled";
  reference?: string;
  note?: string;
  scheduled_for?: string;
  executed_at?: string;
  created_at: string;
  created_by?: string;
}

// ─── Commission record ────────────────────────────────────────────────────
export interface ZeniCommission {
  id: string;
  payment_id: string;
  recipient_type: "agent" | "influencer" | "platform";
  recipient_id?: string;
  recipient_name: string;
  rate: number;        // e.g. 0.70 for 70%
  amount: number;
  currency: string;
  status: "pending" | "paid";
  paid_at?: string;
  created_at: string;
}

// ─── Invoice ─────────────────────────────────────────────────────────────
export interface ZeniInvoice {
  id: string;
  payment_id?: string;
  booking_id?: string;
  customer_name: string;
  customer_email: string;
  customer_address?: string;
  items: Array<{ description: string; quantity: number; unit_price: number; total: number }>;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  status: "draft" | "sent" | "paid" | "overdue" | "void";
  due_date?: string;
  paid_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ─── Pay Link ─────────────────────────────────────────────────────────────
export interface ZeniPayLink {
  id: string;
  payment_id: string;
  amount: number;
  currency: string;
  description: string;
  customer_name?: string;
  customer_email?: string;
  type: "trip" | "deposit" | "balance" | "custom";
  status: "active" | "paid" | "expired" | "cancelled";
  expires_at?: string;
  created_at: string;
}

// ─── Double-entry accounting ─────────────────────────────────────────────
export interface ZeniAccountingEntry {
  id: string;
  payment_id?: string;
  payout_id?: string;
  ledger_entry_id?: string;
  account_code: string;
  account_name: string;
  entry_type: "debit" | "credit";
  amount: number;
  currency: string;
  description: string;
  period: string;           // "YYYY-MM"
  created_at: string;
}

export interface ZeniJournalEntry {
  id: string;
  ref: string;
  description: string;
  lines: Array<{ account_code: string; account_name: string; debit: number; credit: number }>;
  created_at: string;
  created_by?: string;
}

export interface ZeniChartAccount {
  code: string;
  name: string;
  type: "Asset" | "Liability" | "Equity" | "Income" | "Expense";
  parent_code?: string;
  is_active: boolean;
}

// ─── Webhook event ────────────────────────────────────────────────────────
export interface ZeniWebhookEvent {
  id: string;
  gateway: string;
  event_type: string;
  payload: Record<string, unknown>;
  processed: boolean;
  processed_at?: string;
  error?: string;
  created_at: string;
}

// ─── Audit log ────────────────────────────────────────────────────────────
export interface ZeniAuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  user_id?: string;
  changes?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}

// ─── Idempotency key ─────────────────────────────────────────────────────
export interface ZeniIdempotencyKey {
  key: string;
  operation: string;
  result: Record<string, unknown>;
  created_at: string;
  expires_at: string;
}
