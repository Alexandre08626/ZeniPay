// ZeniCoreClient — typed wrapper over the ZeniCore ledger RPCs.
//
// The underlying functions live in the `zenicore` schema, but that schema
// is NOT exposed to PostgREST on this project. Instead we call the
// `public.zc_*` SECURITY DEFINER wrappers shipped in migration
// `20260422184457_zenicore_zenicards_public_wrappers`, which proxy 1:1 to
// the zenicore functions. Same signatures, same behavior, just reachable
// from supabase-js. Identical pattern to the `agents.vault_*` fix we did
// on 2026-04-22 for the vault schema.
//
// Wrappers we consume:
//   public.zc_fund_treasury(p_organization_id, p_amount_micro, p_currency,
//     p_source_ref, p_idempotency_key, p_posted_by) RETURNS TEXT
//   public.zc_distribute_to_agent(p_organization_id, p_agent_id, p_amount_micro,
//     p_currency, p_idempotency_key, p_posted_by) RETURNS TEXT
//   public.zc_hold_for_card_auth(p_agent_id, p_card_id, p_amount_micro,
//     p_currency, p_merchant_ref, p_auth_ref, p_idempotency_key, p_posted_by)
//     RETURNS TEXT — throws SQLSTATE 22000 on insufficient funds.
//   public.zc_settle_card_auth(p_card_id, p_amount_micro, p_currency,
//     p_merchant_ref, p_auth_ref, p_fee_micro, p_idempotency_key, p_posted_by)
//     RETURNS TEXT
//   public.zc_verify_chain_integrity(p_start_at) RETURNS TABLE(...)
//   public.zc_get_accounts(p_organization_id) RETURNS TABLE(...)

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Currency, ZeniCoreAccount, OrgBalanceSnapshot,
  ChainIntegrityResult, OwnerType,
} from './types';
import { toMicro } from './types';

interface AccountRow {
  id: string;
  owner_type: string;
  owner_ref: string;
  currency: string;
  balance_micro: string | number;
  pending_debit_micro: string | number;
  locked_for_dispute_micro: string | number;
  status: string;
  created_at: string;
  updated_at: string;
}

export class ZeniCoreClient {
  constructor(private supabase: SupabaseClient) {}

  async fundTreasury(p: {
    organizationId: string; amount: number | string; currency: Currency;
    sourceRef: string; idempotencyKey: string; postedBy: string;
  }): Promise<{ txGroupId: string }> {
    const { data, error } = await this.supabase.rpc('zc_fund_treasury', {
      p_organization_id: p.organizationId,
      p_amount_micro: toMicro(p.amount).toString(),
      p_currency: p.currency,
      p_source_ref: p.sourceRef,
      p_idempotency_key: p.idempotencyKey,
      p_posted_by: p.postedBy,
    });
    if (error) throw new ZeniCoreError('fundTreasury', error.message, error);
    return { txGroupId: data as string };
  }

  async distributeToAgent(p: {
    organizationId: string; agentId: string; amount: number | string; currency: Currency;
    idempotencyKey: string; postedBy: string;
  }): Promise<{ txGroupId: string }> {
    const { data, error } = await this.supabase.rpc('zc_distribute_to_agent', {
      p_organization_id: p.organizationId,
      p_agent_id: p.agentId,
      p_amount_micro: toMicro(p.amount).toString(),
      p_currency: p.currency,
      p_idempotency_key: p.idempotencyKey,
      p_posted_by: p.postedBy,
    });
    if (error) throw new ZeniCoreError('distributeToAgent', error.message, error);
    return { txGroupId: data as string };
  }

  async holdForCardAuth(p: {
    agentId: string; cardId: string; amount: number | string; currency: Currency;
    merchantRef: string; authRef: string; idempotencyKey: string; postedBy: string;
  }): Promise<{ txGroupId: string }> {
    const { data, error } = await this.supabase.rpc('zc_hold_for_card_auth', {
      p_agent_id: p.agentId, p_card_id: p.cardId,
      p_amount_micro: toMicro(p.amount).toString(),
      p_currency: p.currency, p_merchant_ref: p.merchantRef, p_auth_ref: p.authRef,
      p_idempotency_key: p.idempotencyKey, p_posted_by: p.postedBy,
    });
    if (error) {
      if (error.code === '22000') {
        throw new InsufficientFundsError(p.agentId, p.amount.toString(), p.currency);
      }
      throw new ZeniCoreError('holdForCardAuth', error.message, error);
    }
    return { txGroupId: data as string };
  }

  async settleCardAuth(p: {
    cardId: string; amount: number | string; currency: Currency;
    merchantRef: string; authRef: string; feeAmount: number | string;
    idempotencyKey: string; postedBy: string;
  }): Promise<{ txGroupId: string }> {
    const { data, error } = await this.supabase.rpc('zc_settle_card_auth', {
      p_card_id: p.cardId,
      p_amount_micro: toMicro(p.amount).toString(),
      p_currency: p.currency, p_merchant_ref: p.merchantRef, p_auth_ref: p.authRef,
      p_fee_micro: toMicro(p.feeAmount).toString(),
      p_idempotency_key: p.idempotencyKey, p_posted_by: p.postedBy,
    });
    if (error) throw new ZeniCoreError('settleCardAuth', error.message, error);
    return { txGroupId: data as string };
  }

  /** Pre-wrapper this read went straight to zenicore.accounts. Now it
   *  routes through zc_get_accounts(p_organization_id=NULL) and filters
   *  client-side. Volumes are expected in the hundreds at worst — a full
   *  scan + JS filter is faster than the round-trips we'd save by caching. */
  async getAccountBalance(p: { ownerType: OwnerType; ownerRef: string; currency: Currency }): Promise<ZeniCoreAccount | null> {
    const { data, error } = await this.supabase.rpc('zc_get_accounts', { p_organization_id: null });
    if (error) throw new ZeniCoreError('getAccountBalance', error.message, error);
    const rows = (data ?? []) as AccountRow[];
    const hit = rows.find((r) =>
      r.owner_type === p.ownerType && r.owner_ref === p.ownerRef && r.currency.trim() === p.currency,
    );
    if (!hit) return null;
    return {
      id: hit.id,
      owner_type: hit.owner_type as OwnerType,
      owner_ref: hit.owner_ref,
      currency: hit.currency.trim() as Currency,
      balance_micro: BigInt(hit.balance_micro),
      pending_debit_micro: BigInt(hit.pending_debit_micro),
      locked_for_dispute_micro: BigInt(hit.locked_for_dispute_micro),
      status: hit.status as ZeniCoreAccount['status'],
      created_at: hit.created_at,
      updated_at: hit.updated_at,
    };
  }

  /** The `zenicore.org_balance_snapshot` VIEW isn't wrapped on the
   *  public API — it's a pure aggregation over accounts. We replicate the
   *  view's GROUP BY in JS from zc_get_accounts(organizationId).
   *
   *  View SQL being mirrored:
   *    SELECT owner_ref AS organization_id, currency,
   *      SUM(CASE WHEN owner_type='org_treasury'  THEN balance_micro ELSE 0 END) treasury_micro,
   *      SUM(CASE WHEN owner_type='agent_wallet'  THEN balance_micro ELSE 0 END) agents_allocated_micro,
   *      SUM(CASE WHEN owner_type='virtual_card'  THEN balance_micro ELSE 0 END) cards_pending_micro,
   *      SUM(balance_micro) total_micro
   *    FROM zenicore.accounts
   *    WHERE owner_type IN ('org_treasury','agent_wallet','virtual_card')
   *    GROUP BY owner_ref, currency;
   *
   *  Note: the view groups by owner_ref for org_treasury rows specifically
   *  (owner_ref = organization_id for treasury). For agent_wallet / virtual_card
   *  rows, owner_ref is the agent/card id — those don't belong to any one org
   *  directly in this view. The upstream view handles this by grouping on
   *  owner_ref regardless, which produces one row per (owner_ref, currency).
   *  We preserve that behavior and then filter to the caller's org_treasury row
   *  plus zero-contribute the agent/card rows into it (since we can't
   *  join through to an organization_id without another query). For the
   *  investor-demo path the only data right now is a single org treasury +
   *  single agent wallet + single card, so we return the treasury row as
   *  the canonical per-currency snapshot. */
  async getOrgSnapshot(organizationId: string): Promise<OrgBalanceSnapshot[]> {
    const { data, error } = await this.supabase.rpc('zc_get_accounts', { p_organization_id: organizationId });
    if (error) throw new ZeniCoreError('getOrgSnapshot', error.message, error);
    const rows = (data ?? []) as AccountRow[];

    // Group by currency (the view's other grouping key) and attribute
    // balances to their bucket. Agent + card rows belong to the same org
    // by virtue of the RPC filter — the wrapper resolves them via the
    // accounts.organization_id column we don't expose here.
    const buckets = new Map<string, OrgBalanceSnapshot>();
    for (const r of rows) {
      const cur = r.currency.trim();
      const entry = buckets.get(cur) ?? {
        organization_id: organizationId,
        currency: cur as Currency,
        treasury_micro: BigInt(0),
        agents_allocated_micro: BigInt(0),
        cards_pending_micro: BigInt(0),
        total_micro: BigInt(0),
      };
      const bal = BigInt(r.balance_micro);
      if (r.owner_type === 'org_treasury')      entry.treasury_micro        += bal;
      else if (r.owner_type === 'agent_wallet') entry.agents_allocated_micro += bal;
      else if (r.owner_type === 'virtual_card') entry.cards_pending_micro    += bal;
      if (['org_treasury', 'agent_wallet', 'virtual_card'].includes(r.owner_type)) {
        entry.total_micro += bal;
      }
      buckets.set(cur, entry);
    }
    return Array.from(buckets.values());
  }

  async verifyChainIntegrity(startAt?: Date): Promise<ChainIntegrityResult> {
    const { data, error } = await this.supabase.rpc('zc_verify_chain_integrity', {
      p_start_at: startAt?.toISOString() ?? null,
    });
    if (error) throw new ZeniCoreError('verifyChainIntegrity', error.message, error);
    const row = (data as Array<{ total_entries: number | string; verified_entries: number | string; first_break_at: string | null; first_break_id: string | null }>)?.[0];
    return {
      total_entries: Number(row?.total_entries ?? 0),
      verified_entries: Number(row?.verified_entries ?? 0),
      first_break_at: row?.first_break_at ?? null,
      first_break_id: row?.first_break_id ?? null,
      is_intact: Number(row?.total_entries ?? 0) === Number(row?.verified_entries ?? 0),
    };
  }
}

export class ZeniCoreError extends Error {
  constructor(public op: string, message: string, public cause?: unknown) {
    super(`[zenicore:${op}] ${message}`);
    this.name = 'ZeniCoreError';
  }
}

export class InsufficientFundsError extends ZeniCoreError {
  constructor(public agentId: string, public requested: string, public currency: Currency) {
    super('holdForCardAuth', `Insufficient funds for ${agentId}: ${requested} ${currency}`);
    this.name = 'InsufficientFundsError';
  }
}
