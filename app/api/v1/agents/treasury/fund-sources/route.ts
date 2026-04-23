// GET  /api/v1/agents/treasury/fund-sources
//    → funding sources registered for the caller's org (any rail).
//
// POST /api/v1/agents/treasury/fund-sources
//    Body: { label, currency, finix_tokenization_result: {
//      payment_instrument_id, identity_id, last4, brand? } }
//
//    Registers a new card-rail funding source using the output of the
//    client-side Finix.js tokenization. The card has already been validated
//    by Finix at tokenize-time, so the backend just stores the reference.
//    Returns { funding_source_id, status: 'pending_verification' } — call
//    POST .../[id]/verify to flip it to 'verified' before charging.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "../../_lib/auth";
import { errorResponse, serverError } from "../../_lib/errors";
import { createClient } from "@supabase/supabase-js";
import { FundingClient, FundingError } from "@/lib/zenicore/funding-client";
import type { Currency } from "@/lib/zenicore/types";

function service() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (!auth) return errorResponse("unauthorized", "unauthorized");

    const supabase = service();
    if (!supabase) return errorResponse("server_error", "supabase_env_missing");

    const fc = new FundingClient(supabase);
    const sources = await fc.listFundingSources(auth.organizationId);
    return NextResponse.json({ funding_sources: sources });
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (!auth) return errorResponse("unauthorized", "unauthorized");

    const body = (await req.json().catch(() => ({}))) as {
      label?: string;
      currency?: Currency;
      is_primary?: boolean;
      finix_tokenization_result?: {
        payment_instrument_id?: string;
        identity_id?: string;
        last4?: string;
        brand?: string;
        instrument_type?: string;
      };
      metadata?: Record<string, unknown>;
    };

    const label = (body.label ?? "").trim();
    const currency = (body.currency ?? "CAD") as Currency;
    const tok = body.finix_tokenization_result ?? {};
    const instrumentId = (tok.payment_instrument_id ?? "").trim();
    const identityId = (tok.identity_id ?? "").trim();
    const last4 = (tok.last4 ?? "").trim();

    if (label.length < 2) {
      return errorResponse("bad_request", "label_required", { field: "label", min: 2 });
    }
    if (!["CAD", "USD", "EUR", "USDC"].includes(currency)) {
      return errorResponse("bad_request", "unsupported_currency", { allowed: ["CAD", "USD", "EUR", "USDC"] });
    }
    if (!instrumentId.startsWith("PI")) {
      return errorResponse("bad_request", "finix_payment_instrument_required", { field: "finix_tokenization_result.payment_instrument_id" });
    }
    if (!identityId) {
      return errorResponse("bad_request", "finix_identity_required", { field: "finix_tokenization_result.identity_id" });
    }
    if (!/^\d{4}$/.test(last4)) {
      return errorResponse("bad_request", "finix_last4_required", { field: "finix_tokenization_result.last4" });
    }

    const supabase = service();
    if (!supabase) return errorResponse("server_error", "supabase_env_missing");

    const fc = new FundingClient(supabase);
    const createdBy = auth.userId ?? auth.apiKeyId ?? "system";

    try {
      const id = await fc.registerCardSource({
        organizationId: auth.organizationId,
        currency,
        label,
        finixPaymentInstrumentId: instrumentId,
        finixIdentityId: identityId,
        finixLast4: last4,
        finixInstrumentType: tok.instrument_type ?? "card",
        createdBy,
        isPrimary: body.is_primary === true,
        metadata: { ...(body.metadata ?? {}), brand: tok.brand ?? null },
      });
      return NextResponse.json({ funding_source_id: id, status: "pending_verification" });
    } catch (err) {
      if (err instanceof FundingError) {
        return errorResponse("unprocessable", err.message);
      }
      throw err;
    }
  } catch (e) {
    return serverError(e);
  }
}
