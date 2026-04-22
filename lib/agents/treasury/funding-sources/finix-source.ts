// FinixCard funding source. Reads the existing Finix gateway (read-only
// import from modules/zenipay/gateways/finix.ts). Synchronous: we post a
// transfer to Finix using a tokenized instrument attached to the funding
// source row; on approved state, we call book_transfer to credit the
// treasury. No card data touches our server — the instrument was tokenized
// client-side via Finix.js during source registration.

import { fundTreasury } from "../treasury";
import { topupIntentForRetry } from "./topup-intents";
import { createTransfer } from "../../../../modules/zenipay/gateways/finix";
import type { FundingSourceProvider, InitiateFundingParams, InitiateFundingResult } from "./interface";

export const finixCardProvider: FundingSourceProvider = {
  type: "finix_card",
  enabled: true,
  async initiate(params: InitiateFundingParams): Promise<InitiateFundingResult> {
    const instrumentId = String(params.source.details.instrument_id ?? "");
    if (!instrumentId) throw new Error("finix_card source missing details.instrument_id");
    const merchantId = process.env.FINIX_MERCHANT_ID ?? "";
    if (!merchantId) throw new Error("FINIX_MERCHANT_ID not configured");

    // Reserve a topup intent first so retries are idempotent even if the
    // provider succeeds but our DB write fails.
    const intent = await topupIntentForRetry({
      organizationId: params.organizationId,
      fundingSourceId: params.source.id,
      amountCents: params.amountCents,
      currency: params.currency,
      provider: "finix",
      idempotencyKey: params.idempotencyKey,
    });
    if (intent.replayed && intent.intent.status === "settled" && intent.intent.settled_transfer_id) {
      return {
        settled: true,
        transfer_id: intent.intent.settled_transfer_id,
        org_balance_cents: -1,
      };
    }

    // Charge via Finix (live — the merchant product is already in prod mode).
    const transfer = await createTransfer({
      merchantId,
      instrumentId,
      amountCents: params.amountCents,
      currency: params.currency,
      description: `ZeniPay Agents treasury top-up ${intent.intent.id}`,
      idempotencyKey: intent.intent.id,
      tags: { purpose: "agents_treasury_topup", org: params.organizationId, intent: intent.intent.id },
    });
    if (transfer.state !== "SUCCEEDED" && transfer.state !== "PENDING") {
      await markIntentFailed(intent.intent.id, transfer);
      throw new Error(`finix transfer ${transfer.transferId} state ${transfer.state}`);
    }

    // Book into treasury (idempotent via p_idempotency_key = intent.id).
    const booked = await fundTreasury({
      organizationId: params.organizationId,
      amountCents: params.amountCents,
      currency: params.currency,
      note: `finix ${transfer.transferId}`,
      idempotencyKey: intent.intent.id,
      actor: params.actor ?? null,
    });

    await markIntentSettled(intent.intent.id, transfer.transferId, booked.transfer_id);

    return {
      settled: true,
      transfer_id: booked.transfer_id,
      org_balance_cents: Number(booked.to_new_balance ?? 0),
    };
  },
};

// Local helpers — avoid introducing a new top-level module just for intent
// bookkeeping; this is provider-specific enough to live next to the caller.
async function markIntentSettled(intentId: string, externalRef: string, settledTransferId: string): Promise<void> {
  const { getAgentsDb } = await import("../../supabase-client");
  const db = getAgentsDb();
  await db
    .from("topup_intents")
    .update({
      status: "settled",
      external_ref: externalRef,
      settled_transfer_id: settledTransferId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", intentId);
}

async function markIntentFailed(intentId: string, transfer: unknown): Promise<void> {
  const { getAgentsDb } = await import("../../supabase-client");
  const db = getAgentsDb();
  await db
    .from("topup_intents")
    .update({
      status: "failed",
      raw_webhook_payload: transfer as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    })
    .eq("id", intentId);
}
