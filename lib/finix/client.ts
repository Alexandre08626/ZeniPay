import { FINIX_CONFIG } from "./config";
import type { FinixTransferRequest, FinixTransferResponse, FinixPaymentInstrument } from "./types";

function authHeader(): string {
  return "Basic " + Buffer.from(`${FINIX_CONFIG.apiUsername}:${FINIX_CONFIG.apiPassword}`).toString("base64");
}

function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}

export function generateFraudSessionId(): string {
  return `fs_${crypto.randomUUID()}`;
}

interface FinixRequestOptions {
  method: string;
  path: string;
  body?: object;
  idempotencyKey?: string;
}

export async function finixRequest<T = Record<string, unknown>>(opts: FinixRequestOptions): Promise<{ status: number; data: T }> {
  const headers: Record<string, string> = {
    Authorization: authHeader(),
    "Content-Type": "application/json",
    "Finix-Version": FINIX_CONFIG.apiVersion,
  };


  const res = await fetch(`${FINIX_CONFIG.baseUrl}${opts.path}`, {
    method: opts.method,
    headers,
    ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
  });

  const data = await res.json() as T;
  return { status: res.status, data };
}

export async function getPaymentInstrument(instrumentId: string): Promise<{ status: number; data: FinixPaymentInstrument }> {
  return finixRequest<FinixPaymentInstrument>({
    method: "GET",
    path: `/payment_instruments/${instrumentId}`,
  });
}

export async function createTransfer(params: {
  instrumentId: string;
  amountCents: number;
  currency?: string;
  fraudSessionId: string;
  idempotencyKey?: string;
  tags?: Record<string, string>;
  description?: string;
}): Promise<{ status: number; data: FinixTransferResponse }> {
  const idempotencyKey = params.idempotencyKey || generateIdempotencyKey();

  const body: FinixTransferRequest = {
    merchant: FINIX_CONFIG.merchantId,
    amount: params.amountCents,
    currency: params.currency || "CAD",
    source: params.instrumentId,
    operation_key: "SALE",
    fraud_session_id: params.fraudSessionId,
    idempotency_id: idempotencyKey,
    tags: {
      ...params.tags,
      source: "zenipay",
      idempotency_key: idempotencyKey,
    },
    ...(params.description ? { statement_descriptor: params.description.slice(0, 20) } : {}),
  };

  return finixRequest<FinixTransferResponse>({
    method: "POST",
    path: "/transfers",
    body,

  });
}

export async function getTransfer(transferId: string): Promise<{ status: number; data: FinixTransferResponse }> {
  return finixRequest<FinixTransferResponse>({
    method: "GET",
    path: `/transfers/${transferId}`,
  });
}

export async function createReversal(transferId: string, amountCents?: number) {
  return finixRequest({
    method: "POST",
    path: `/transfers/${transferId}/reversals`,
    body: amountCents ? { amount: amountCents } : {},
    idempotencyKey: generateIdempotencyKey(),
  });
}
