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
      // Two accepted shapes:
      //   1. finix_token — raw TK_... from Finix.js tokenization (common
      //      client path). We exchange it for a PI using the platform
      //      identity (FINIX_MERCHANT_IDENTITY_ID).
      //   2. finix_tokenization_result — already-resolved PI + identity +
      //      last4 (for server-to-server or pre-exchanged cases).
      finix_token?: string;
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

    if (label.length < 2) {
      return errorResponse("bad_request", "label_required", { field: "label", min: 2 });
    }
    if (!["CAD", "USD", "EUR", "USDC"].includes(currency)) {
      return errorResponse("bad_request", "unsupported_currency", { allowed: ["CAD", "USD", "EUR", "USDC"] });
    }

    // Resolve PI + identity + last4 — either via token exchange or directly.
    let instrumentId = "";
    let identityId = "";
    let last4 = "";
    let brand: string | null = null;
    let instrumentType = "card";

    const token = (body.finix_token ?? "").trim();
    if (token.startsWith("TK")) {
      const exchanged = await exchangeFinixToken(token);
      if ("error" in exchanged) {
        return errorResponse("unprocessable", exchanged.error, exchanged.detail);
      }
      instrumentId = exchanged.instrumentId;
      identityId = exchanged.identityId;
      last4 = exchanged.last4;
      brand = exchanged.brand;
      instrumentType = exchanged.instrumentType;
    } else {
      const tok = body.finix_tokenization_result ?? {};
      instrumentId = (tok.payment_instrument_id ?? "").trim();
      identityId = (tok.identity_id ?? "").trim();
      last4 = (tok.last4 ?? "").trim();
      brand = tok.brand ?? null;
      instrumentType = tok.instrument_type ?? "card";
      if (!instrumentId.startsWith("PI")) {
        return errorResponse("bad_request", "finix_token_or_instrument_required", {
          hint: "send either finix_token (TK_...) or finix_tokenization_result.payment_instrument_id (PI_...)",
        });
      }
      if (!identityId) {
        return errorResponse("bad_request", "finix_identity_required", { field: "finix_tokenization_result.identity_id" });
      }
      if (!/^\d{4}$/.test(last4)) {
        return errorResponse("bad_request", "finix_last4_required", { field: "finix_tokenization_result.last4" });
      }
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
        finixInstrumentType: instrumentType,
        createdBy,
        isPrimary: body.is_primary === true,
        metadata: { ...(body.metadata ?? {}), brand },
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

// ---------------------------------------------------------------------------
// Exchange a Finix.js TK token for a persistent PI payment_instrument. The
// client side never sees raw card data — Finix.js tokenizes in-page and
// hands back a TK that we exchange here using the platform identity.

async function exchangeFinixToken(token: string): Promise<
  | { instrumentId: string; identityId: string; last4: string; brand: string | null; instrumentType: string }
  | { error: string; detail?: unknown }
> {
  const identityId = process.env.FINIX_MERCHANT_IDENTITY_ID || "";
  const user = process.env.FINIX_API_USERNAME || "";
  const pass = process.env.FINIX_API_PASSWORD || "";
  const base = process.env.FINIX_ENV === "production"
    ? "https://finix.live-payments-api.com"
    : "https://finix.sandbox-payments-api.com";
  if (!identityId) return { error: "finix_identity_not_configured" };
  if (!user || !pass) return { error: "finix_credentials_not_configured" };

  const res = await fetch(`${base}/payment_instruments`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${user}:${pass}`).toString("base64"),
      "Content-Type": "application/json",
      "Finix-Version": "2022-02-01",
    },
    body: JSON.stringify({ type: "TOKEN", token, identity: identityId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?._embedded?.errors?.[0]?.message || data?.message || `HTTP ${res.status}`;
    return { error: "finix_token_exchange_failed", detail: msg };
  }
  const pi = data.id as string | undefined;
  if (!pi || !pi.startsWith("PI")) {
    return { error: "finix_token_exchange_bad_response", detail: data };
  }
  return {
    instrumentId: pi,
    identityId,
    last4: (data.last_four as string | undefined) ?? "0000",
    brand: (data.brand as string | undefined) ?? null,
    instrumentType: (data.instrument_type as string | undefined) ?? "card",
  };
}
