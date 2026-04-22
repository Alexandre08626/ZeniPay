// ZeniPay merchant wallet → Agents treasury. Pulls USD from the org's
// connected zenipay_merchants row (public schema) into agents treasury.
// Synchronous. Only consults the merchant record whose id is stored in
// the funding source's details.merchant_id; the API layer verifies the
// caller owns that merchant row before routing here.

import { getAgentsDb } from "../../supabase-client";
import { fundTreasury } from "../treasury";
import { topupIntentForRetry } from "./topup-intents";
import type { FundingSourceProvider, InitiateFundingParams, InitiateFundingResult } from "./interface";

export const zenipayMerchantProvider: FundingSourceProvider = {
  type: "zenipay_merchant_wallet",
  enabled: true,
  async initiate(p: InitiateFundingParams): Promise<InitiateFundingResult> {
    const merchantId = String(p.source.details.merchant_id ?? "");
    if (!merchantId) throw new Error("zenipay_merchant source missing details.merchant_id");

    const db = getAgentsDb();

    const intent = await topupIntentForRetry({
      organizationId: p.organizationId,
      fundingSourceId: p.source.id,
      amountCents: p.amountCents,
      currency: p.currency,
      provider: "zenipay_merchant",
      idempotencyKey: p.idempotencyKey,
    });
    if (intent.replayed && intent.intent.status === "settled" && intent.intent.settled_transfer_id) {
      return { settled: true, transfer_id: intent.intent.settled_transfer_id, org_balance_cents: -1 };
    }

    // Read + debit the merchant's balance. We use service-role direct UPDATE
    // with an optimistic check (WHERE balance >= amount_needed) to avoid a
    // lost-update race without introducing row locks.
    const amountDollars = p.amountCents / 100;
    // The merchant row lives in public.zenipay_merchants. Our agents-scoped
    // client is bound to the agents schema — use a fresh client for public.
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const publicDb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

    const { data: before } = await publicDb
      .from("zenipay_merchants")
      .select("balance")
      .eq("id", merchantId)
      .maybeSingle();
    const current = Number(before?.balance ?? 0);
    if (current < amountDollars) {
      await db
        .from("topup_intents")
        .update({ status: "failed", raw_webhook_payload: { reason: "insufficient_merchant_balance", current } })
        .eq("id", intent.intent.id);
      throw new Error(`merchant ${merchantId} balance ${current} < requested ${amountDollars}`);
    }
    const { data: after, error: debitErr } = await publicDb
      .from("zenipay_merchants")
      .update({ balance: current - amountDollars, updated_at: new Date().toISOString() })
      .eq("id", merchantId)
      .eq("balance", current)   // optimistic lock
      .select("balance")
      .maybeSingle();
    if (debitErr || !after) throw new Error(`merchant debit failed: ${debitErr?.message ?? "race — retry"}`);

    const booked = await fundTreasury({
      organizationId: p.organizationId,
      amountCents: p.amountCents,
      currency: p.currency,
      note: `zenipay_merchant ${merchantId}`,
      idempotencyKey: intent.intent.id,
      actor: p.actor ?? null,
    });

    await db
      .from("topup_intents")
      .update({
        status: "settled",
        external_ref: merchantId,
        settled_transfer_id: booked.transfer_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", intent.intent.id);

    return {
      settled: true,
      transfer_id: booked.transfer_id,
      org_balance_cents: Number(booked.to_new_balance ?? 0),
    };
  },
};
