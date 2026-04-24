// PR 9 — ACH inbound wrappers.
//
// Flow: create a bank-account payment instrument for the payer, then
// create an ACH debit transfer that pulls the funds into our Finix
// merchant account. Webhook SALE_SUCCEEDED credits the org treasury
// via zc_fund_treasury in /api/webhooks/finix-to-zenicore.
//
// SECURITY: we never log `account_number` or `bank_code` anywhere.
// Finix returns a masked `masked_account_number` on the instrument;
// that's the only form we persist or surface on the UI.

import { finixRequest } from "./client";
import { FINIX_CONFIG } from "./config";

export interface BankAccountInstrumentInput {
  account_holder: string;
  account_number: string;
  routing_number: string;   // "bank_code" in Finix terminology
  account_type: "CHECKING" | "SAVINGS";
  currency?: string;        // unused by the instrument but kept for symmetry
  country?: string;         // "USA" or "CAN"; defaults to "USA"
}

export interface BankAccountInstrument {
  id: string;
  masked_account_number: string;
  bank_code: string;
  name: string;
  state: string;
}

/** Creates a bank-account payment instrument Finix can debit later. */
export async function createBankAccountInstrument(
  input: BankAccountInstrumentInput,
): Promise<{ status: number; data: BankAccountInstrument }> {
  const body = {
    type: "BANK_ACCOUNT",
    identity: FINIX_CONFIG.identityId,
    account_type: input.account_type,
    account_number: input.account_number,
    bank_code: input.routing_number,
    name: input.account_holder,
    country: input.country ?? "USA",
  };
  return finixRequest<BankAccountInstrument>({
    method: "POST",
    path: "/payment_instruments",
    body,
  });
}

export interface ACHDebitInput {
  payment_instrument_id: string;
  amount_cents: number;
  currency?: string;
  statement_descriptor?: string;
  idempotency_id: string;
  memo?: string;
}

export interface ACHDebitResponse {
  id: string;
  state: "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELED" | string;
  amount: number;
  currency: string;
  ready_to_settle_at: string | null;
  created_at: string;
}

/** Pulls funds from the client's bank via ACH.  Idempotent. */
export async function createACHDebit(
  input: ACHDebitInput,
): Promise<{ status: number; data: ACHDebitResponse }> {
  const body: Record<string, unknown> = {
    merchant: FINIX_CONFIG.merchantId,
    source: input.payment_instrument_id,
    amount: input.amount_cents,
    currency: input.currency ?? "USD",
    operation_key: "SALE",
    idempotency_id: input.idempotency_id,
    tags: {
      source: "zenipay",
      idempotency_key: input.idempotency_id,
      ach: "true",
      ...(input.memo ? { memo: input.memo.slice(0, 100) } : {}),
    },
  };
  if (input.statement_descriptor) {
    body.statement_descriptor = input.statement_descriptor.slice(0, 20);
  }
  return finixRequest<ACHDebitResponse>({
    method: "POST",
    path: "/transfers",
    body,
  });
}

/** Check the state of an ACH debit — used by the verify endpoint. */
export async function getACHDebit(transferId: string): Promise<{ status: number; data: ACHDebitResponse }> {
  return finixRequest<ACHDebitResponse>({
    method: "GET",
    path: `/transfers/${transferId}`,
  });
}
