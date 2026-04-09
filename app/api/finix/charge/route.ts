export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createPaymentInstrument, createTransfer, generateFraudSessionId } from "@/lib/finix/client";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/finix/config";

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * POST /api/finix/charge
 * Creates a Finix Transfer with fraud_session_id + idempotency
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      instrumentId: providedInstrumentId,
      cardNumber, expiryMonth, expiryYear, cvc, name,
      amountCents, currency = "USD",
      fraudSessionId: providedFraudSessionId,
      idempotencyKey: providedIdempotencyKey,
      description, tags = {},
    } = body;

    if (!amountCents || amountCents < 1) {
      return NextResponse.json({ error: "amountCents is required and must be > 0" }, { status: 400 });
    }

    let instrumentId = providedInstrumentId;
    let instrumentDetails: Record<string, unknown> = {};

    if (!instrumentId) {
      if (!cardNumber || !expiryMonth || !expiryYear || !cvc) {
        return NextResponse.json({ error: "Either instrumentId or card details required" }, { status: 400 });
      }
      const instRes = await createPaymentInstrument({
        cardNumber, expiryMonth: parseInt(expiryMonth), expiryYear: parseInt(expiryYear),
        cvc, name: name || "ZeniPay Customer",
      });
      if (instRes.status >= 400) {
        return NextResponse.json({ error: "Failed to create payment instrument", details: instRes.data }, { status: instRes.status });
      }
      instrumentId = (instRes.data as Record<string, unknown>).id;
      instrumentDetails = instRes.data as Record<string, unknown>;
    }

    const fraudSessionId = providedFraudSessionId || generateFraudSessionId();
    const idempotencyKey = providedIdempotencyKey || crypto.randomUUID();

    const transferRes = await createTransfer({
      instrumentId, amountCents, currency, fraudSessionId, idempotencyKey,
      tags: { ...tags, source: "zenipay" }, description,
    });

    const transferData = transferRes.data;

    // Log to Supabase
    const supabase = getSupabase();
    await supabase.from("finix_payment_logs").insert({
      transfer_id: transferData.id || null,
      state: transferData.state || "UNKNOWN",
      amount_cents: amountCents, currency,
      fraud_session_id: fraudSessionId, idempotency_key: idempotencyKey,
      instrument_id: instrumentId,
      failure_code: transferData.failure_code || null,
      failure_message: transferData.failure_message || null,
      tags, raw_response: transferData,
      created_at: new Date().toISOString(),
    }).then((res) => { if (res.error) console.error("[finix/charge] Supabase log error:", res.error.message); });

    return NextResponse.json({
      success: transferData.state === "SUCCEEDED" || transferData.state === "PENDING",
      transfer_id: transferData.id, state: transferData.state,
      amount: amountCents, currency,
      fraud_session_id: fraudSessionId, idempotency_key: idempotencyKey,
      instrument_id: instrumentId, instrument: instrumentDetails,
      failure_code: transferData.failure_code || null,
      failure_message: transferData.failure_message || null,
    });
  } catch (err) {
    console.error("[finix/charge] Error:", err);
    return NextResponse.json({ error: "Payment processing failed", message: String(err) }, { status: 500 });
  }
}
