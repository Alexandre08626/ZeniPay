// Phase 2 treasury types. Mirrors the agents.* tables added in
// 20260421000003_agents_bank_foundation.sql.

export type Currency = "USD" | "CAD" | "EUR" | "USDC";

export type TreasuryStatus = "active" | "frozen" | "closed";

export interface OrgTreasury {
  id: string;
  organization_id: string;
  default_currency: Currency;
  credit_limit_cents: number;
  credit_used_cents: number;
  status: TreasuryStatus;
  created_at: string;
  updated_at: string;
}

export interface TreasuryBalance {
  id: string;
  treasury_id: string;
  organization_id: string;
  currency: Currency;
  balance_cents: number;
  pending_cents: number;
  usd_equivalent_cents: number;
  external_ref: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrgTreasuryTotals {
  organization_id: string;
  treasury_id: string;
  total_balance_cents_usd: number;
  credit_limit_cents: number;
  credit_used_cents: number;
  credit_available_cents: number;
  last_updated_at: string;
}

export type FundingSourceType =
  | "finix_card"
  | "zenipay_merchant_wallet"
  | "wire_ach"
  | "sepa"
  | "usdc_wallet"
  | "ramp_credit";

export type FundingSourceStatus =
  | "pending_verification"
  | "verified"
  | "disabled"
  | "failed_verification";

export interface FundingSource {
  id: string;
  organization_id: string;
  type: FundingSourceType;
  nickname: string;
  details: Record<string, unknown>;
  external_ref: string | null;
  verified_at: string | null;
  status: FundingSourceStatus;
  is_default: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type TopupIntentStatus = "pending" | "settled" | "failed" | "reversed";

export interface TopupIntent {
  id: string;
  organization_id: string;
  funding_source_id: string | null;
  amount_cents: number;
  currency: Currency;
  provider: string;
  external_ref: string | null;
  status: TopupIntentStatus;
  idempotency_key: string | null;
  settled_transfer_id: string | null;
  raw_webhook_payload: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface BookTransferResult {
  transfer_id: string;
  from_new_balance: number | null;
  to_new_balance: number | null;
  replayed: boolean;
}
