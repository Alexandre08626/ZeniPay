// POST /api/v1/agents/treasury/fund/card
//   Body: { funding_source_id, amount_units, currency, idempotency_key? }
//   Header: Idempotency-Key (preferred over body value)
//
// Hot path for Money IN via Finix Card SALE. Flow:
//   1. Resolve funding_source — must be rail='card', status='verified',
//      and belong to the caller's org.
//   2. Charge the Finix payment instrument via Finix /transfers SALE. We
//      tag the transfer with zenipay_purpose='agents_treasury_fund' +
//      organization_id + funding_source_id so the webhook can route the
//      SUCCEEDED event to the funding ingestor (PART 3).
//   3. If Finix returns SUCCEEDED synchronously, credit the treasury
//      immediately via zc_ingest_funding_event. Returns {tx_group,
//      event_id}.
//   4. If Finix returns PENDING, return success with pending=true; the
//      webhook will credit the treasury when the final SUCCEEDED arrives.
//   5. If Finix returns FAILED (or throws), log a 'failed' funding_event
//      so the history page shows the decline and return 402.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "../../../_lib/auth";
import { errorResponse, serverError } from "../../../_lib/errors";
import { createClient } from "@supabase/supabase-js";
import { FundingClient } from "@/lib/zenicore/funding-client";
import { createTransfer } from "@/modules/zenipay/gateways/finix";
import type { Currency } from "@/lib/zenicore/types";

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (!auth) return errorResponse("unauthorized", "unauthorized");

    const body = (await req.json().catch(() => ({}))) as {
      funding_source_id?: string;
      amount_units?: number | string;
      currency?: Currency;
      idempotency_key?: string;
    };

    const headerKey = req.headers.get("idempotency-key");
    const idempotencyKey = (headerKey ?? body.idempotency_key ?? "").toString().trim();
    const fundingSourceId = (body.funding_source_id ?? "").toString().trim();
    const rawAmount = body.amount_units;
    const currency = (body.currency ?? "CAD") as Currency;

    if (!fundingSourceId) return errorResponse("bad_request", "funding_source_id_required");
    if (!idempotencyKey || idempotencyKey.length < 8) {
      return errorResponse("bad_request", "idempotency_key_required", { min_length: 8 });
    }
    const amountNumber = typeof rawAmount === "string" ? Number(rawAmount) : (rawAmount ?? NaN);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      return errorResponse("bad_request", "amount_units_must_be_positive");
    }
    if (!["CAD", "USD", "EUR"].includes(currency)) {
      return errorResponse("bad_request", "unsupported_currency", { allowed: ["CAD", "USD", "EUR"] });
    }

    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return errorResponse("server_error", "supabase_env_missing");
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

    const fc = new FundingClient(supabase);

    const sources = await fc.listFundingSources(auth.organizationId);
    const src = sources.find((s) => s.id === fundingSourceId);
    if (!src) return errorResponse("forbidden", "funding_source_not_owned_by_org");
    if (src.rail !== "card") return errorResponse("unprocessable", "funding_source_not_card_rail");
    if (src.status !== "verified") {
      return errorResponse("unprocessable", "funding_source_not_verified", { current_status: src.status });
    }
    if (src.currency !== currency) {
      return errorResponse("unprocessable", "funding_source_currency_mismatch", {
        funding_source_currency: src.currency,
        requested_currency: currency,
      });
    }
    if (!src.finix_payment_instrument_id) {
      return errorResponse("unprocessable", "funding_source_missing_finix_instrument");
    }

    const merchantId = process.env.FINIX_MERCHANT_ID;
    if (!merchantId) return errorResponse("server_error", "finix_merchant_id_missing");

    const amountCents = Math.round(amountNumber * 100);
    const postedBy = auth.userId ?? auth.apiKeyId ?? "system";

    let transfer: Awaited<ReturnType<typeof createTransfer>>;
    try {
      transfer = await createTransfer({
        merchantId,
        instrumentId: src.finix_payment_instrument_id,
        amountCents,
        currency,
        description: `ZeniPay treasury fund`,
        tags: {
          zenipay_organization_id: auth.organizationId,
          zenipay_funding_source_id: fundingSourceId,
          zenipay_purpose: "agents_treasury_fund",
        },
        idempotencyKey,
      });
    } catch (finixErr) {
      // Surface the decline to the funding log + history, then return 402.
      const message = finixErr instanceof Error ? finixErr.message : String(finixErr);
      try {
        await fc.ingestFundingEvent({
          rail: "card",
          organizationId: auth.organizationId,
          fundingSourceId,
          externalEventId: `finix_fail_${idempotencyKey}`,
          amount: amountNumber,
          currency,
          rawPayload: { finix_error: message, idempotency_key: idempotencyKey },
          postedBy,
        });
      } catch { /* best-effort log */ }
      return errorResponse("unprocessable", "finix_transfer_failed", { detail: message });
    }

    const state = (transfer.state || "").toUpperCase();

    if (state === "SUCCEEDED") {
      // Credit the treasury synchronously so the UI can confirm instantly.
      const result = await fc.ingestFundingEvent({
        rail: "card",
        organizationId: auth.organizationId,
        fundingSourceId,
        externalEventId: transfer.transferId,
        amount: amountNumber,
        currency,
        rawPayload: transfer.raw as Record<string, unknown>,
        postedBy,
      });
      return NextResponse.json({
        success: true,
        pending: false,
        finix_transfer_id: transfer.transferId,
        finix_state: state,
        event_id: result.eventId,
        tx_group: result.txGroup,
        funding_state: result.state,
        reason: result.reason,
      });
    }

    if (state === "PENDING") {
      // Webhook will credit once Finix settles (5-30s typical).
      return NextResponse.json({
        success: true,
        pending: true,
        finix_transfer_id: transfer.transferId,
        finix_state: state,
        three_ds_redirect_url: transfer.threeDSRedirectUrl ?? null,
      });
    }

    // FAILED or unknown — log and return 402.
    try {
      await fc.ingestFundingEvent({
        rail: "card",
        organizationId: auth.organizationId,
        fundingSourceId,
        externalEventId: transfer.transferId || `finix_fail_${idempotencyKey}`,
        amount: amountNumber,
        currency,
        rawPayload: { state, raw: transfer.raw, idempotency_key: idempotencyKey },
        postedBy,
      });
    } catch { /* best-effort log */ }
    return errorResponse("unprocessable", "finix_transfer_not_succeeded", { finix_state: state });
  } catch (e) {
    return serverError(e);
  }
}
