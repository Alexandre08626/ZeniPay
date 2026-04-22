// ZeniCore — the in-house double-entry ledger.
//
// Every balance the ZeniPay Agents product surfaces (treasury, agent wallet,
// virtual card) is an aggregate view over zenicore.accounts. Amounts are
// stored in MICRO units (1e-6 of the currency unit) to carry FX + fees
// without floating-point drift.
//
// The journal (zenicore.journal) is append-only. A database trigger refuses
// UPDATE/DELETE, and every row carries a SHA-256 chain hash over its
// predecessor — the `verify_chain_integrity` RPC walks the chain and tells
// us if any row has been tampered with out-of-band.

export type Micro = bigint;
export type Currency = 'USD' | 'CAD' | 'EUR' | 'USDC';
export type OwnerType =
  | 'zenipay_reserve' | 'org_treasury' | 'agent_wallet' | 'virtual_card'
  | 'external_inbound' | 'external_outbound' | 'fx_book' | 'fee_clearing' | 'disputed_funds';
export type AccountStatus = 'active' | 'frozen' | 'closing' | 'closed';

export interface ZeniCoreAccount {
  id: string;
  owner_type: OwnerType;
  owner_ref: string;
  currency: Currency;
  balance_micro: Micro;
  pending_debit_micro: Micro;
  locked_for_dispute_micro: Micro;
  status: AccountStatus;
  created_at: string;
  updated_at: string;
}

export type JournalDirection = 'debit' | 'credit';

export interface JournalEntry {
  id: string;
  tx_group: string;
  seq: number;
  posted_at: string;
  effective_at: string;
  account_id: string;
  direction: JournalDirection;
  amount_micro: Micro;
  currency: Currency;
  memo: string;
  ref_type: string | null;
  ref_id: string | null;
  posted_by: string;
  chain_hash: string;
  prev_chain_hash: string | null;
}

export type TxKind = 'fund_treasury' | 'distribute_to_agent' | 'card_auth_hold'
  | 'card_auth_settle' | 'card_auth_release' | 'fee_assessment' | 'fx_conversion'
  | 'dispute_freeze' | 'dispute_resolve';
export type TxStatus = 'pending' | 'posted' | 'reversed';

export interface TxGroup {
  id: string;
  kind: TxKind;
  status: TxStatus;
  organization_id: string | null;
  idempotency_key: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  posted_at: string | null;
  reversed_at: string | null;
  reversed_by_tx_group: string | null;
}

export interface OrgBalanceSnapshot {
  organization_id: string;
  currency: Currency;
  treasury_micro: Micro;
  agents_allocated_micro: Micro;
  cards_pending_micro: Micro;
  total_micro: Micro;
}

export interface ChainIntegrityResult {
  total_entries: number;
  verified_entries: number;
  first_break_at: string | null;
  first_break_id: string | null;
  is_intact: boolean;
}

export const MICRO_PER_UNIT: bigint = BigInt(1_000_000);

const BIG_ZERO: bigint = BigInt(0);
const BIG_ONE_POS: bigint = BigInt(1);
const BIG_ONE_NEG: bigint = BigInt(-1);

/** Convert a user-facing amount (e.g. 19.99 USD) into micro-units. */
export function toMicro(dollars: number | string): Micro {
  const str = typeof dollars === 'number' ? dollars.toFixed(6) : dollars;
  const [whole, frac = ''] = str.split('.');
  const fracPadded = (frac + '000000').slice(0, 6);
  const sign = whole.startsWith('-') ? BIG_ONE_NEG : BIG_ONE_POS;
  const wholeAbs = whole.replace('-', '');
  return sign * (BigInt(wholeAbs) * MICRO_PER_UNIT + BigInt(fracPadded));
}

/** Render a micro-unit bigint as a human string with trailing zero pruning. */
export function fromMicro(micro: Micro): string {
  const sign = micro < BIG_ZERO ? '-' : '';
  const abs = micro < BIG_ZERO ? -micro : micro;
  const whole = abs / MICRO_PER_UNIT;
  const frac = abs % MICRO_PER_UNIT;
  const fracStr = frac.toString().padStart(6, '0').replace(/0+$/, '') || '00';
  return `${sign}${whole}.${fracStr.length < 2 ? fracStr + '0' : fracStr}`;
}
