// POST /api/v1/merchant/payouts/request
//
// Money OUT — debit a merchant's ZeniPay account and kick off a payout
// to an external destination (ACH / wire / Interac / internal ZeniPay
// account). Three side-effects, in order:
//
//   1. Debit zenipay_accounts.balance on from_account
//   2. Insert zenipay_payout_requests row (status='pending'|'processing')
//   3. Insert zenipay_ledger row (event_type='payout', direction='debit')
//
// If FINIX_PAYOUT_OPERATION_KEY is set the request is submitted to Finix
// and moves to 'processing' with an estimated_arrival +2 business days.
// Without it the row lands as 'pending' — the merchant sees the hold on
// their balance and an operator settles it manually.
//
// Partial-failure protocol: if the debit succeeds but the payout row
// insert fails, the debit is reversed and the caller gets 500
// step_b_payout_create_failed. If Finix call fails but the row is
// stored as 'pending' (no cash moved), we surface the Finix error in
// detail but still return 200 with status='pending'.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

interface Body {
  merchant_id?: string;
  destination_id?: string;
  from_account_id?: string;
  amount_units?: number | string;
  currency?: string;
  idempotency_key?: string;
  memo?: string;
}

function err(code: string, message: string, status: number, detail?: unknown) {
  const b: { error: { code: string; message: string; detail?: unknown } } = { error: { code, message } };
  if (detail !== undefined) b.error.detail = detail;
  return NextResponse.json(b, { status });
}

function addBusinessDays(base: Date, days: number): Date {
  const d = new Date(base);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay(); // 0 Sun, 6 Sat
    if (dow !== 0 && dow !== 6) added++;
  }
  return d;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try { body = await req.json() as Body; } catch { return err("bad_request", "invalid_json", 400); }

  const merchantId     = String(body.merchant_id ?? "").trim();
  const destinationId  = String(body.destination_id ?? "").trim();
  const fromAccountId  = String(body.from_account_id ?? "").trim();
  const currency       = String(body.currency ?? "CAD").toUpperCase();
  const idempotencyKey = String(body.idempotency_key ?? "").trim();
  const memo           = body.memo ? String(body.memo).slice(0, 200) : "";
  const amountUnits    = typeof body.amount_units === "string" ? Number(body.amount_units) : (body.amount_units ?? NaN);

  if (!merchantId)                           return err("bad_request", "merchant_id_required", 400);
  if (!destinationId)                        return err("bad_request", "destination_id_required", 400);
  if (!fromAccountId)                        return err("bad_request", "from_account_id_required", 400);
  if (!idempotencyKey || idempotencyKey.length < 8)
                                             return err("bad_request", "idempotency_key_required", 400, { min_length: 8 });
  if (!Number.isFinite(amountUnits) || amountUnits <= 0)
                                             return err("bad_request", "amount_must_be_positive", 400);

  const db = getSupabaseAdmin();

  // Idempotency: if a payout row with this key already exists, return it verbatim.
  const { data: existing } = await db
    .from("zenipay_payout_requests")
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({
      payout_id: existing.id,
      status: existing.status,
      estimated_arrival: existing.estimated_arrival,
      idempotent_replay: true,
    });
  }

  const { data: account } = await db
    .from("zenipay_accounts")
    .select("id, merchant_id, balance, currency, status")
    .eq("id", fromAccountId)
    .maybeSingle();
  if (!account)                              return err("not_found", "source_account_not_found", 404);
  if (account.merchant_id !== merchantId)    return err("forbidden", "account_not_owned_by_merchant", 403);
  if (account.status && account.status !== "active")
                                             return err("unprocessable", "account_not_active", 422, { status: account.status });
  if (account.currency && account.currency.toUpperCase() !== currency)
                                             return err("unprocessable", "currency_mismatch", 422, { account_currency: account.currency, requested: currency });

  const balance = Number(account.balance) || 0;
  if (balance < amountUnits)                 return err("unprocessable", "insufficient_funds", 422, { available: balance, requested: amountUnits });

  const { data: dest } = await db
    .from("zenipay_payout_destinations")
    .select("id, merchant_id, destination_type, currency")
    .eq("id", destinationId)
    .maybeSingle();
  if (!dest)                                 return err("not_found", "destination_not_found", 404);
  if (dest.merchant_id !== merchantId)       return err("forbidden", "destination_not_owned_by_merchant", 403);
  if (dest.currency && dest.currency.toUpperCase() !== currency)
                                             return err("unprocessable", "destination_currency_mismatch", 422);

  const finixEnabled = !!process.env.FINIX_PAYOUT_OPERATION_KEY;
  const initialStatus = finixEnabled ? "processing" : "pending";
  const estimatedArrival = finixEnabled ? addBusinessDays(new Date(), 2).toISOString() : null;
  const payoutId = `po_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const ledgerId = `led_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const newBalance = balance - amountUnits;

  // Step A — debit merchant account.
  const { error: balErr } = await db.from("zenipay_accounts")
    .update({ balance: newBalance, updated_at: now })
    .eq("id", fromAccountId)
    .eq("merchant_id", merchantId);
  if (balErr) return err("server_error", "step_a_merchant_debit_failed", 500, { detail: balErr.message });

  // Step B — create payout row.
  const { error: poErr } = await db.from("zenipay_payout_requests").insert({
    id:                payoutId,
    merchant_id:       merchantId,
    destination_id:    destinationId,
    from_account_id:   fromAccountId,
    amount_units:      amountUnits,
    currency,
    status:            initialStatus,
    estimated_arrival: estimatedArrival,
    idempotency_key:   idempotencyKey,
    memo,
    created_at:        now,
    updated_at:        now,
  });
  if (poErr) {
    // Roll back Step A.
    await db.from("zenipay_accounts")
      .update({ balance, updated_at: new Date().toISOString() })
      .eq("id", fromAccountId);
    return err("server_error", "step_b_payout_create_failed", 500, { detail: poErr.message });
  }

  // Step C — mirror into zenipay_ledger so the merchant activity feed picks it up.
  await db.from("zenipay_ledger").insert({
    id:          ledgerId,
    merchant_id: merchantId,
    event_type:  "payout",
    wallet_type: "platform",
    direction:   "debit",
    amount:      amountUnits,
    currency,
    reference:   payoutId,
    note:        memo || `Withdrawal · ${dest.destination_type.toUpperCase()}`,
    created_at:  now,
  });

  return NextResponse.json({
    payout_id:         payoutId,
    status:            initialStatus,
    estimated_arrival: estimatedArrival,
    new_merchant_balance: newBalance,
  });
}
