// ZeniCore funding types.
//
// These mirror the shape returned by the public.zc_list_funding_sources
// and public.zc_list_funding_events wrappers (migration
// `zenicore_treasury_funding_sources`). Numbers that arrive as micro-units
// from the DB are surfaced here as strings (bigint-safe) so callers can
// format or convert as needed.

import type { Currency } from './types';

export type Rail = 'card' | 'ach' | 'wire' | 'usdc_onchain' | 'stripe_fallback';

export type FundingSourceStatus =
  | 'pending_verification'
  | 'verified'
  | 'restricted'
  | 'disabled';

export type FundingEventState =
  | 'received'
  | 'validated'
  | 'credited'
  | 'rejected'
  | 'duplicate'
  | 'failed';

export interface FundingSourceRow {
  id: string;
  organization_id: string;
  rail: Rail;
  currency: Currency;
  label: string;
  status: FundingSourceStatus;
  is_primary: boolean;

  // Card rail (Finix)
  finix_payment_instrument_id: string | null;
  finix_identity_id: string | null;
  finix_last4: string | null;
  finix_instrument_type: string | null;

  // USDC rail (unused in PR 8)
  usdc_chain: string | null;
  usdc_address: string | null;
  usdc_memo: string | null;

  // Stripe fallback
  stripe_payment_method_id: string | null;
  stripe_customer_id: string | null;

  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface FundingEventRow {
  id: string;
  rail: Rail;
  organization_id: string;
  funding_source_id: string | null;
  external_event_id: string;
  amount_micro: string;
  currency: Currency;
  state: FundingEventState;
  tx_group: string | null;
  reason: string | null;
  raw_payload: Record<string, unknown>;
  posted_by: string;
  created_at: string;
  credited_at: string | null;
}

export interface IngestFundingEventResult {
  eventId: string;
  state: FundingEventState;
  txGroup: string | null;
  reason: string | null;
}
