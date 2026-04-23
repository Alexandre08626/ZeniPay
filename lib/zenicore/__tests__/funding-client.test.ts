// Unit tests for FundingClient.
//
// We mock the minimal shape of supabase-js we consume: `.rpc(name, args)`
// returning `{ data, error }`. Every test asserts (a) the right wrapper
// is called, (b) the args are mapped correctly (especially amount → micro),
// and (c) errors / edge states from the wrappers surface cleanly.

import { describe, it, expect } from 'vitest';
import { FundingClient, FundingError } from '../funding-client';
import { toMicro, fromMicro } from '../types';
import type { SupabaseClient } from '@supabase/supabase-js';

type RpcCall = { name: string; args: Record<string, unknown> };
type RpcResult = { data: unknown; error: { message: string } | null };

function mockSupabase(handler: (call: RpcCall) => RpcResult): {
  client: SupabaseClient;
  calls: RpcCall[];
} {
  const calls: RpcCall[] = [];
  const client = {
    rpc: (name: string, args: Record<string, unknown>) => {
      const call = { name, args };
      calls.push(call);
      const result = handler(call);
      return Promise.resolve(result);
    },
  } as unknown as SupabaseClient;
  return { client, calls };
}

describe('FundingClient.registerCardSource', () => {
  it('calls zc_register_funding_source with card rail', async () => {
    const { client, calls } = mockSupabase(() => ({ data: 'fs_123', error: null }));
    const c = new FundingClient(client);
    const id = await c.registerCardSource({
      organizationId: 'org_abc',
      currency: 'USD',
      label: 'Main corp card',
      finixPaymentInstrumentId: 'PI_xyz',
      finixIdentityId: 'ID_xyz',
      finixLast4: '4242',
      createdBy: 'user_1',
    });
    expect(id).toBe('fs_123');
    expect(calls).toHaveLength(1);
    expect(calls[0].name).toBe('zc_register_funding_source');
    expect(calls[0].args.p_rail).toBe('card');
    expect(calls[0].args.p_organization_id).toBe('org_abc');
    expect(calls[0].args.p_currency).toBe('USD');
    expect(calls[0].args.p_finix_payment_instrument_id).toBe('PI_xyz');
    expect(calls[0].args.p_finix_last4).toBe('4242');
    expect(calls[0].args.p_is_primary).toBe(false);
    expect(calls[0].args.p_metadata).toEqual({});
  });

  it('propagates wrapper errors as FundingError', async () => {
    const { client } = mockSupabase(() => ({ data: null, error: { message: 'unique_violation' } }));
    const c = new FundingClient(client);
    await expect(
      c.registerCardSource({
        organizationId: 'org_abc',
        currency: 'USD',
        label: 'x',
        finixPaymentInstrumentId: 'PI_x',
        finixIdentityId: 'ID_x',
        finixLast4: '0000',
        createdBy: 'u',
      }),
    ).rejects.toThrow(FundingError);
  });
});

describe('FundingClient.verifyFundingSource', () => {
  it('returns previous status from wrapper', async () => {
    const { client, calls } = mockSupabase(() => ({ data: 'pending_verification', error: null }));
    const c = new FundingClient(client);
    const prev = await c.verifyFundingSource('fs_1', 'user_2');
    expect(prev).toBe('pending_verification');
    expect(calls[0].name).toBe('zc_verify_funding_source');
    expect(calls[0].args.p_funding_source_id).toBe('fs_1');
    expect(calls[0].args.p_actor).toBe('user_2');
  });
});

describe('FundingClient.listFundingSources', () => {
  it('returns rows unchanged', async () => {
    const { client } = mockSupabase(() => ({
      data: [{ id: 'fs_1', rail: 'card', label: 'main' }],
      error: null,
    }));
    const c = new FundingClient(client);
    const rows = await c.listFundingSources('org_1');
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('fs_1');
  });

  it('returns [] when wrapper returns null', async () => {
    const { client } = mockSupabase(() => ({ data: null, error: null }));
    const c = new FundingClient(client);
    const rows = await c.listFundingSources('org_empty');
    expect(rows).toEqual([]);
  });
});

describe('FundingClient.ingestFundingEvent', () => {
  const shape = (state: string, txGroup: string | null = null, reason: string | null = null) => [{
    event_id: 'evt_1',
    state,
    tx_group: txGroup,
    reason,
  }];

  it('converts dollar amount to micro-unit string', async () => {
    const { client, calls } = mockSupabase(() => ({ data: shape('credited', 'tx_1'), error: null }));
    const c = new FundingClient(client);
    await c.ingestFundingEvent({
      rail: 'card',
      organizationId: 'org_1',
      fundingSourceId: 'fs_1',
      externalEventId: 'TR_abc',
      amount: 100,
      currency: 'USD',
      rawPayload: { foo: 'bar' },
    });
    expect(calls[0].name).toBe('zc_ingest_funding_event');
    expect(calls[0].args.p_amount_micro).toBe('100000000'); // 100 * 1e6
    expect(calls[0].args.p_rail).toBe('card');
    expect(calls[0].args.p_external_event_id).toBe('TR_abc');
    expect(calls[0].args.p_posted_by).toBe('system');
  });

  it('handles fractional dollars without float drift', async () => {
    const { client, calls } = mockSupabase(() => ({ data: shape('credited', 'tx_2'), error: null }));
    const c = new FundingClient(client);
    await c.ingestFundingEvent({
      rail: 'card',
      organizationId: 'org_1',
      fundingSourceId: 'fs_1',
      externalEventId: 'TR_b',
      amount: '19.99',
      currency: 'USD',
      rawPayload: {},
    });
    expect(calls[0].args.p_amount_micro).toBe('19990000');
  });

  it('returns rejected state with reason', async () => {
    const { client } = mockSupabase(() => ({
      data: shape('rejected', null, 'invalid_funding_source_org_mismatch'),
      error: null,
    }));
    const c = new FundingClient(client);
    const r = await c.ingestFundingEvent({
      rail: 'card',
      organizationId: 'org_1',
      fundingSourceId: 'fs_wrong',
      externalEventId: 'TR_c',
      amount: 50,
      currency: 'USD',
      rawPayload: {},
    });
    expect(r.state).toBe('rejected');
    expect(r.txGroup).toBeNull();
    expect(r.reason).toBe('invalid_funding_source_org_mismatch');
  });

  it('returns duplicate state on replay', async () => {
    const { client } = mockSupabase(() => ({
      data: shape('duplicate', 'tx_first', 'external_event_id_already_credited'),
      error: null,
    }));
    const c = new FundingClient(client);
    const r = await c.ingestFundingEvent({
      rail: 'card',
      organizationId: 'org_1',
      fundingSourceId: 'fs_1',
      externalEventId: 'TR_replay',
      amount: 25,
      currency: 'USD',
      rawPayload: {},
    });
    expect(r.state).toBe('duplicate');
    expect(r.txGroup).toBe('tx_first');
    expect(r.reason).toBe('external_event_id_already_credited');
  });

  it('throws when wrapper returns empty result', async () => {
    const { client } = mockSupabase(() => ({ data: [], error: null }));
    const c = new FundingClient(client);
    await expect(
      c.ingestFundingEvent({
        rail: 'card',
        organizationId: 'org_1',
        fundingSourceId: null,
        externalEventId: 'TR_x',
        amount: 10,
        currency: 'USD',
        rawPayload: {},
      }),
    ).rejects.toThrow(FundingError);
  });
});

describe('FundingClient.listFundingEvents', () => {
  it('defaults limit to 50', async () => {
    const { client, calls } = mockSupabase(() => ({ data: [], error: null }));
    const c = new FundingClient(client);
    await c.listFundingEvents('org_1');
    expect(calls[0].args.p_limit).toBe(50);
  });

  it('respects explicit limit', async () => {
    const { client, calls } = mockSupabase(() => ({ data: [], error: null }));
    const c = new FundingClient(client);
    await c.listFundingEvents('org_1', 5);
    expect(calls[0].args.p_limit).toBe(5);
  });
});

describe('toMicro/fromMicro roundtrip for funding amounts', () => {
  // Sanity: the FundingClient relies on toMicro for its dollars→micro
  // conversion. Regressions on toMicro would silently under- or over-credit
  // a treasury, so we freeze the common denominations here.
  const cases: Array<{ input: number | string; micro: string; display: string }> = [
    { input: 100,       micro: '100000000',  display: '100.00' },
    { input: '100.00',  micro: '100000000',  display: '100.00' },
    { input: 19.99,     micro: '19990000',   display: '19.99' },
    { input: '0.50',    micro: '500000',     display: '0.50' },
    { input: 0,         micro: '0',          display: '0.00' },
    { input: '1234567.89', micro: '1234567890000', display: '1234567.89' },
  ];
  for (const c of cases) {
    it(`${c.input} → ${c.micro} → ${c.display}`, () => {
      const m = toMicro(c.input);
      expect(m.toString()).toBe(c.micro);
      expect(fromMicro(m)).toBe(c.display);
    });
  }
});
