// POST /api/v1/pay — public closed-loop charge endpoint.
//
// Card-present verification: caller sends the full PAN + CVV + expiry.
// zenicards.charge_card() does:
//   1. Luhn + BIN + expiry + CVV hash check via verify_card_present
//   2. Balance check on the card's zenicore account (auto-pull from agent
//      wallet if underfunded, per the migration design)
//   3. Settlement debit to the merchant's zenicore_payout_account
//   4. Fee split (flat + bps) to zenipay_reserve
//
// Unauthenticated — card ownership is the auth. Idempotency is honored via
// the optional `idempotency_key`; replaying the same key returns the prior
// response (the RPC carries the dedup logic).

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { errorResponse, serverError } from "../agents/_lib/errors";

const VALID_CURRENCIES = ["USD", "CAD", "EUR", "USDC"] as const;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const card_number_full = String(body?.card_number_full ?? "").replace(/\s+/g, "");
    const cvv_plaintext    = String(body?.cvv_plaintext ?? "").trim();
    const expiry_month     = Number(body?.expiry_month);
    const expiry_year      = Number(body?.expiry_year);
    const merchant_slug    = String(body?.merchant_slug ?? "").trim();
    const amount_units     = Number(body?.amount_units);
    const currency         = String(body?.currency ?? "").trim().toUpperCase();
    const description      = String(body?.description ?? "");
    const idempotency_key  = body?.idempotency_key ? String(body.idempotency_key) : null;

    if (!/^\d{13,19}$/.test(card_number_full))
      return errorResponse("bad_request", "card_number_full must be 13–19 digits");
    if (!/^\d{3,4}$/.test(cvv_plaintext))
      return errorResponse("bad_request", "cvv must be 3–4 digits");
    if (!Number.isInteger(expiry_month) || expiry_month < 1 || expiry_month > 12)
      return errorResponse("bad_request", "expiry_month must be 1–12");
    if (!Number.isInteger(expiry_year) || expiry_year < 2000 || expiry_year > 2100)
      return errorResponse("bad_request", "expiry_year must be 4-digit year");
    if (!merchant_slug)
      return errorResponse("bad_request", "merchant_slug required");
    if (!Number.isFinite(amount_units) || amount_units <= 0)
      return errorResponse("bad_request", "amount_units must be positive");
    if (!VALID_CURRENCIES.includes(currency as typeof VALID_CURRENCIES[number]))
      return errorResponse("bad_request", `currency must be one of ${VALID_CURRENCIES.join(", ")}`);

    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return errorResponse("server_error", "supabase_env_missing");
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).schema("zenicards").rpc("charge_card", {
      p_card_number_full: card_number_full,
      p_cvv_plaintext: cvv_plaintext,
      p_expiry_month: expiry_month,
      p_expiry_year: expiry_year,
      p_merchant_slug: merchant_slug,
      p_amount_units: amount_units,
      p_currency: currency,
      p_description: description,
      p_idempotency_key: idempotency_key,
    });
    if (error) return errorResponse("server_error", error.message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = (data as any[])?.[0];
    if (!row) return errorResponse("server_error", "charge_card returned no row");

    // RPC returns { success, transaction_id, zenicore_tx_group, fee_charged_units,
    //                net_to_merchant_units, error_code, error_message }
    if (!row.success) {
      const code = typeof row.error_code === "string" ? row.error_code : "charge_failed";
      const msg  = typeof row.error_message === "string" ? row.error_message : "Charge rejected.";
      // Map common codes to the nearest HTTP bucket.
      const httpCode =
        code === "card_not_found" || code === "merchant_not_found" ? "not_found" as const :
        code === "insufficient_funds" || code === "card_paused" || code === "card_canceled" ? "unprocessable" as const :
        code === "cvv_mismatch" || code === "expiry_mismatch" || code === "merchant_not_allowed" ? "forbidden" as const :
        "bad_request" as const;
      return errorResponse(httpCode, msg, { charge_error_code: code });
    }

    return NextResponse.json({
      success: true,
      transaction_id: row.transaction_id,
      zenicore_tx_group: row.zenicore_tx_group,
      fee_charged_units: row.fee_charged_units,
      net_to_merchant_units: row.net_to_merchant_units,
      currency,
    });
  } catch (e) { return serverError(e); }
}
