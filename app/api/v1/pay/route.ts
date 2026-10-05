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
import { createHash } from "crypto";
import { errorResponse, serverError } from "../agents/_lib/errors";
import { tooManyFailures, recordFailure, clientIp } from "@/modules/zenipay/services/rate-limit";

const VALID_CURRENCIES = ["USD", "CAD", "EUR", "USDC"] as const;

// Brute-force protection (PAN / CVV / expiry guessing): only failed charges
// count, per IP and per card (hashed — the PAN is never stored).
const FAIL_WINDOW_MS = 10 * 60_000;
const MAX_FAILS_IP   = 5;
const MAX_FAILS_CARD = 5;
// Card lookup / CVV / expiry failures all collapse into ONE generic answer
// so the endpoint can't be used as an oracle to validate card data.
const CARD_VERIFY_CODES = new Set(["card_not_found", "cvv_mismatch", "expiry_mismatch"]);

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

    const ip = clientIp(req.headers);
    const cardHash = createHash("sha256").update(`zp-v1-pay:${card_number_full}`).digest("hex").slice(0, 32);
    const failKeys = [`v1pay:ip:${ip}`, `v1pay:card:${cardHash}`];
    const [blkIp, blkCard] = await Promise.all([
      tooManyFailures(failKeys[0], MAX_FAILS_IP, FAIL_WINDOW_MS),
      tooManyFailures(failKeys[1], MAX_FAILS_CARD, FAIL_WINDOW_MS),
    ]);
    if (blkIp || blkCard) {
      return NextResponse.json(
        { error: { code: "rate_limited", message: "Too many attempts. Please try again later." } },
        { status: 429 },
      );
    }

    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return errorResponse("server_error", "supabase_env_missing");
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

    // zenicards schema isn't PostgREST-exposed — route through the
    // public.zcards_charge_card SECURITY DEFINER wrapper (migration
    // 20260422184457_zenicore_zenicards_public_wrappers).
    const { data, error } = await supabase.rpc("zcards_charge_card", {
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
    const row = (data as Array<{
      success: boolean;
      transaction_id: string | null;
      zenicore_tx_group: string | null;
      fee_charged_units: number | null;
      net_to_merchant_units: number | null;
      error_code: string | null;
      error_message: string | null;
    }>)?.[0];
    if (!row) return errorResponse("server_error", "charge_card returned no row");

    // RPC returns { success, transaction_id, zenicore_tx_group, fee_charged_units,
    //                net_to_merchant_units, error_code, error_message }
    if (!row.success) {
      await recordFailure(failKeys, FAIL_WINDOW_MS);
      if (CARD_VERIFY_CODES.has(String(row.error_code))) {
        return errorResponse("unprocessable", "Card declined.", { charge_error_code: "card_declined" });
      }
      const code = typeof row.error_code === "string" ? row.error_code : "charge_failed";
      const msg  = typeof row.error_message === "string" ? row.error_message : "Charge rejected.";
      // Map common codes to the nearest HTTP bucket.
      const httpCode =
        code === "merchant_not_found" ? "not_found" as const :
        code === "insufficient_funds" || code === "card_paused" || code === "card_canceled" ? "unprocessable" as const :
        code === "merchant_not_allowed" ? "forbidden" as const :
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
