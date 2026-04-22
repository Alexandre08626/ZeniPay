// Shared helper: look up (idempotency key) or create a topup_intents row.
// Kept out of the provider files so every source uses the same logic.

import { getAgentsDb } from "../../supabase-client";
import type { Currency, TopupIntent } from "../types";

export interface ForRetryParams {
  organizationId: string;
  fundingSourceId: string;
  amountCents: number;
  currency: Currency;
  provider: string;
  idempotencyKey?: string;
}

export interface ForRetryResult {
  intent: TopupIntent;
  replayed: boolean;
}

export async function topupIntentForRetry(p: ForRetryParams): Promise<ForRetryResult> {
  const db = getAgentsDb();

  if (p.idempotencyKey) {
    const { data: existing } = await db
      .from("topup_intents")
      .select("*")
      .eq("organization_id", p.organizationId)
      .eq("idempotency_key", p.idempotencyKey)
      .maybeSingle();
    if (existing) return { intent: existing as TopupIntent, replayed: true };
  }

  const { data, error } = await db
    .from("topup_intents")
    .insert({
      organization_id: p.organizationId,
      funding_source_id: p.fundingSourceId,
      amount_cents: p.amountCents,
      currency: p.currency,
      provider: p.provider,
      status: "pending",
      idempotency_key: p.idempotencyKey ?? null,
    })
    .select()
    .single();
  if (error || !data) throw new Error(`topup_intent insert failed: ${error?.message}`);
  return { intent: data as TopupIntent, replayed: false };
}
