export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createTransfer, generateFraudSessionId } from "@/lib/finix/client";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/finix/config";

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * POST /api/finix/charge
 * Creates a Finix Transfer with fraud_session_id + idempotency.
 * Requires a pre-tokenized instrumentId (from Finix.js client-side tokenization).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      instrumentId,
      amountCents, currency = "USD",
      fraudSessionId: providedFraudSessionId,
      idempotencyKey: providedIdempotencyKey,
      description, tags = {},
    } = body;

    if (!amountCents || amountCents < 1) {
      return NextResponse.json({ error: "amountCents is required and must be > 0" }, { status: 400 });
    }

    if (!instrumentId) {
      return NextResponse.json({ error: "instrumentId is required (tokenize via Finix.js client-side)" }, { status: 400 });
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
      instrument_id: instrumentId,
      failure_code: transferData.failure_code || null,
      failure_message: transferData.failure_message || null,
    });
  } catch (err) {
    console.error("[finix/charge] Error:", err);
    return NextResponse.json({ error: "Payment processing failed", message: String(err) }, { status: 500 });
  }
}
