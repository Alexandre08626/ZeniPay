// PR 9 — Manual settlement wrappers.
//
// Finix holds funds in the merchant account until a Settlement is
// created (`POST /settlements`). Auto-settle is OFF at the Finix
// merchant config; these helpers power the "Transfer to bank" tile
// Alex triggers from /app/overview.

import { finixRequest } from "./client";
import { FINIX_CONFIG } from "./config";

export interface MerchantBalance {
  merchant_id: string;
  currency: string;
  available_amount: number;   // cents
  pending_amount: number;     // cents
}

/** Read the merchant's available + pending cash balance inside Finix. */
export async function getMerchantBalance(): Promise<{ status: number; data: MerchantBalance | null }> {
  const res = await finixRequest<{
    id: string;
    ready_to_settle_upon: string | null;
    currency: string;
    available_amount?: number;
    pending_amount?: number;
  }>({
    method: "GET",
    path: `/merchants/${FINIX_CONFIG.merchantId}`,
  });
  if (res.status >= 400) return { status: res.status, data: null };
  return {
    status: res.status,
    data: {
      merchant_id: FINIX_CONFIG.merchantId,
      currency: res.data.currency ?? "CAD",
      available_amount: Number(res.data.available_amount ?? 0),
      pending_amount:   Number(res.data.pending_amount ?? 0),
    },
  };
}

export interface SettlementResponse {
  id: string;
  state: "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "APPROVED" | string;
  total_amount: number;
  currency: string;
  created_at: string;
  transferred_at: string | null;
}

/** Trigger a manual settlement — sends Finix-held funds to the bank. */
export async function createSettlement(opts: { currency?: string; idempotencyKey: string }): Promise<{ status: number; data: SettlementResponse }> {
  return finixRequest<SettlementResponse>({
    method: "POST",
    path: `/identities/${FINIX_CONFIG.identityId}/settlements`,
    body: {
      currency: opts.currency ?? "CAD",
      tags: { source: "zenipay", idempotency_key: opts.idempotencyKey, manual: "true" },
    },
  });
}

export interface SettlementListResponse {
  _embedded?: { settlements?: SettlementResponse[] };
  page?: { limit: number; offset: number };
}

/** List historical settlements, newest first. */
export async function listSettlements(limit = 50): Promise<{ status: number; data: SettlementResponse[] }> {
  const res = await finixRequest<SettlementListResponse>({
    method: "GET",
    path: `/settlements?limit=${limit}&sort=created_at,desc`,
  });
  return { status: res.status, data: res.data._embedded?.settlements ?? [] };
}
