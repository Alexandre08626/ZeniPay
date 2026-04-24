// PR 9 — Interac e-Transfer wrappers (Canadian rail, CAD only).
//
// Finix exposes Interac through the same `/transfers` endpoint with a
// BANK_ACCOUNT_TRANSFER operation. For the hosted flow, we create the
// transfer with an instrument Finix hosts and surface the Interac
// payment URL that we forward to the payer (email or deep-link). The
// transfer goes PENDING → SUCCEEDED when the payer completes the
// transfer in their bank portal; webhook credits the treasury.
//
// IMPORTANT: if the Finix environment we hit doesn't support Interac
// yet, the API returns `422 not_enabled`. The route handler wraps this
// in a clean `interac_not_enabled` error so the UI can render a
// "coming soon" banner instead of 500-ing.

import { finixRequest } from "./client";
import { FINIX_CONFIG } from "./config";

export interface InteracRequestInput {
  payer_name: string;
  payer_email: string;
  amount_cents: number;
  memo?: string;
  idempotency_id: string;
}

export interface InteracRequestResponse {
  id: string;
  state: "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELED" | string;
  amount: number;
  currency: string;
  // Present on successful hosted-transfer creation. Finix has rotated
  // the exact field name; cover both legacy (`hosted_url`) and new
  // (`checkout_url`, `url`).
  checkout_url?: string | null;
  hosted_url?: string | null;
  url?: string | null;
  created_at: string;
}

export interface ParsedInteracResponse extends InteracRequestResponse {
  payment_url: string | null;
}

function firstUrl(r: InteracRequestResponse): string | null {
  return r.checkout_url ?? r.hosted_url ?? r.url ?? null;
}

export async function createInteracRequest(
  input: InteracRequestInput,
): Promise<{ status: number; data: ParsedInteracResponse }> {
  const body = {
    merchant: FINIX_CONFIG.merchantId,
    amount: input.amount_cents,
    currency: "CAD",
    operation_key: "SALE",
    idempotency_id: input.idempotency_id,
    payment_method: "INTERAC",
    buyer_identity: {
      first_name: input.payer_name.split(/\s+/)[0] ?? input.payer_name,
      last_name:  input.payer_name.split(/\s+/).slice(1).join(" ") || "—",
      email:      input.payer_email.trim().toLowerCase(),
    },
    tags: {
      source: "zenipay",
      idempotency_key: input.idempotency_id,
      rail: "interac",
      ...(input.memo ? { memo: input.memo.slice(0, 100) } : {}),
    },
  };
  const res = await finixRequest<InteracRequestResponse>({
    method: "POST",
    path: "/transfers",
    body,
  });
  return {
    status: res.status,
    data: { ...res.data, payment_url: firstUrl(res.data) },
  };
}

export async function getInteracRequest(transferId: string): Promise<{ status: number; data: ParsedInteracResponse }> {
  const res = await finixRequest<InteracRequestResponse>({
    method: "GET",
    path: `/transfers/${transferId}`,
  });
  return { status: res.status, data: { ...res.data, payment_url: firstUrl(res.data) } };
}
