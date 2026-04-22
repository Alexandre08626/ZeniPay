// ZeniCoreClient — typed wrapper over the zenicore.* Postgres RPCs.
//
// Supabase Postgres functions confirmed against prod:
//   zenicore.fund_treasury(p_organization_id, p_amount_micro, p_currency,
//     p_source_ref, p_idempotency_key, p_posted_by) RETURNS TEXT
//
//   zenicore.distribute_to_agent(p_organization_id, p_agent_id, p_amount_micro,
//     p_currency, p_idempotency_key, p_posted_by) RETURNS TEXT
//
//   zenicore.hold_for_card_auth(p_agent_id, p_card_id, p_amount_micro,
//     p_currency, p_merchant_ref, p_auth_ref, p_idempotency_key, p_posted_by)
//     RETURNS TEXT — throws SQLSTATE 22000 on insufficient funds.
//
//   zenicore.settle_card_auth(p_card_id, p_amount_micro, p_currency,
//     p_merchant_ref, p_auth_ref, p_fee_micro, p_idempotency_key, p_posted_by)
//     RETURNS TEXT
//
//   zenicore.verify_chain_integrity(p_start_at TIMESTAMPTZ DEFAULT NULL)
//     RETURNS TABLE(total_entries, verified_entries, first_break_at, first_break_id)

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Currency, ZeniCoreAccount, OrgBalanceSnapshot,
  ChainIntegrityResult, OwnerType,
} from './types';
import { toMicro } from './types';

export class ZeniCoreClient {
  constructor(private supabase: SupabaseClient) {}

  async fundTreasury(p: {
    organizationId: string; amount: number | string; currency: Currency;
    sourceRef: string; idempotencyKey: string; postedBy: string;
  }): Promise<{ txGroupId: string }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.supabase as any).schema('zenicore').rpc('fund_treasury', {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.supabase as any).schema('zenicore').rpc('distribute_to_agent', {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.supabase as any).schema('zenicore').rpc('hold_for_card_auth', {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.supabase as any).schema('zenicore').rpc('settle_card_auth', {
      p_card_id: p.cardId,
      p_amount_micro: toMicro(p.amount).toString(),
      p_currency: p.currency, p_merchant_ref: p.merchantRef, p_auth_ref: p.authRef,
      p_fee_micro: toMicro(p.feeAmount).toString(),
      p_idempotency_key: p.idempotencyKey, p_posted_by: p.postedBy,
    });
    if (error) throw new ZeniCoreError('settleCardAuth', error.message, error);
    return { txGroupId: data as string };
  }

  async getAccountBalance(p: { ownerType: OwnerType; ownerRef: string; currency: Currency }): Promise<ZeniCoreAccount | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.supabase as any).schema('zenicore').from('accounts')
      .select('*')
      .eq('owner_type', p.ownerType).eq('owner_ref', p.ownerRef).eq('currency', p.currency)
      .maybeSingle();
    if (error) throw new ZeniCoreError('getAccountBalance', error.message, error);
    return data as ZeniCoreAccount | null;
  }

  async getOrgSnapshot(organizationId: string): Promise<OrgBalanceSnapshot[]> {
    // The org_balance_snapshot view aggregates per-currency balances across
    // treasury + agents + cards for one org. Returns an empty array if the
    // org has no zenicore activity yet.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.supabase as any).schema('zenicore').from('org_balance_snapshot')
      .select('*').eq('organization_id', organizationId);
    if (error) throw new ZeniCoreError('getOrgSnapshot', error.message, error);
    return (data ?? []) as OrgBalanceSnapshot[];
  }

  async verifyChainIntegrity(startAt?: Date): Promise<ChainIntegrityResult> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.supabase as any).schema('zenicore').rpc('verify_chain_integrity',
      { p_start_at: startAt?.toISOString() ?? null });
    if (error) throw new ZeniCoreError('verifyChainIntegrity', error.message, error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = (data as any[])?.[0];
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
