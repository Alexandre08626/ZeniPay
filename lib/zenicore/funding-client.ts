// FundingClient — typed wrapper over the ZeniCore funding RPCs.
//
// Same pattern as ZeniCoreClient: the `zenicore` schema isn't exposed to
// PostgREST, so we call the `public.zc_*_funding_*` SECURITY DEFINER
// wrappers. Amounts are passed as micro-unit strings to survive bigint
// precision across the PostgREST boundary.
//
// Wrappers consumed:
//   public.zc_register_funding_source(...) RETURNS TEXT (funding_source_id)
//   public.zc_verify_funding_source(p_funding_source_id, p_actor) RETURNS TEXT
//   public.zc_list_funding_sources(p_organization_id) RETURNS TABLE(...)
//   public.zc_ingest_funding_event(...) RETURNS TABLE(event_id, state,
//                                                     tx_group, reason)
//   public.zc_list_funding_events(p_organization_id, p_limit) RETURNS TABLE(...)

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Currency } from './types';
import { toMicro } from './types';
import type {
  Rail,
  FundingSourceRow,
  FundingEventRow,
  FundingEventState,
  IngestFundingEventResult,
} from './funding-types';

export class FundingClient {
  constructor(private supabase: SupabaseClient) {}

  async registerCardSource(params: {
    organizationId: string;
    currency: Currency;
    label: string;
    finixPaymentInstrumentId: string;
    finixIdentityId: string;
    finixLast4: string;
    finixInstrumentType?: string;
    createdBy: string;
    isPrimary?: boolean;
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    const { data, error } = await this.supabase.rpc('zc_register_funding_source', {
      p_organization_id: params.organizationId,
      p_rail: 'card' as Rail,
      p_currency: params.currency,
      p_label: params.label,
      p_created_by: params.createdBy,
      p_finix_payment_instrument_id: params.finixPaymentInstrumentId,
      p_finix_identity_id: params.finixIdentityId,
      p_finix_last4: params.finixLast4,
      p_finix_instrument_type: params.finixInstrumentType ?? 'card',
      p_is_primary: params.isPrimary ?? false,
      p_metadata: params.metadata ?? {},
    });
    if (error) throw new FundingError('registerCardSource', error.message, error);
    return data as string;
  }

  async verifyFundingSource(fundingSourceId: string, actor: string): Promise<string> {
    const { data, error } = await this.supabase.rpc('zc_verify_funding_source', {
      p_funding_source_id: fundingSourceId,
      p_actor: actor,
    });
    if (error) throw new FundingError('verifyFundingSource', error.message, error);
    return data as string;
  }

  async listFundingSources(organizationId: string): Promise<FundingSourceRow[]> {
    const { data, error } = await this.supabase.rpc('zc_list_funding_sources', {
      p_organization_id: organizationId,
    });
    if (error) throw new FundingError('listFundingSources', error.message, error);
    return (data ?? []) as FundingSourceRow[];
  }

  async ingestFundingEvent(params: {
    rail: Rail;
    organizationId: string;
    fundingSourceId: string | null;
    externalEventId: string;
    amount: number | string;
    currency: Currency;
    rawPayload: Record<string, unknown>;
    postedBy?: string;
  }): Promise<IngestFundingEventResult> {
    const { data, error } = await this.supabase.rpc('zc_ingest_funding_event', {
      p_rail: params.rail,
      p_organization_id: params.organizationId,
      p_funding_source_id: params.fundingSourceId,
      p_external_event_id: params.externalEventId,
      p_amount_micro: toMicro(params.amount).toString(),
      p_currency: params.currency,
      p_raw_payload: params.rawPayload,
      p_posted_by: params.postedBy ?? 'system',
    });
    if (error) throw new FundingError('ingestFundingEvent', error.message, error);
    const row = (data as Array<{
      event_id: string;
      state: FundingEventState;
      tx_group: string | null;
      reason: string | null;
    }>)?.[0];
    if (!row) throw new FundingError('ingestFundingEvent', 'empty_result');
    return {
      eventId: row.event_id,
      state: row.state,
      txGroup: row.tx_group,
      reason: row.reason,
    };
  }

  async listFundingEvents(organizationId: string, limit = 50): Promise<FundingEventRow[]> {
    const { data, error } = await this.supabase.rpc('zc_list_funding_events', {
      p_organization_id: organizationId,
      p_limit: limit,
    });
    if (error) throw new FundingError('listFundingEvents', error.message, error);
    return (data ?? []) as FundingEventRow[];
  }
}

export class FundingError extends Error {
  constructor(public op: string, message: string, public cause?: unknown) {
    super(`[funding:${op}] ${message}`);
    this.name = 'FundingError';
  }
}
