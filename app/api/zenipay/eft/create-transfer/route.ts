// POST /api/zenipay/eft/create-transfer
//
// Customer-facing EFT/ACH inbound for the public pay link
// (/pay/[id]). Different from /api/v1/merchant/funding/ach (which is
// the merchant funding their OWN treasury). Here a CUSTOMER pays a
// MERCHANT by bank transfer instead of card.
//
// Flow:
//   1. Validate amount + bank fields. Cap at $2,500 per Finix
//      production agreement.
//   2. Create a Finix BANK_ACCOUNT payment instrument for the
//      customer (raw account_number/routing_number go to Finix and
//      are NEVER persisted on our side — we keep last4 only).
//   3. Create a Finix transfer (operation_key=SALE) that debits the
//      customer's bank account.
//   4. Record a zenipay_payments row with payment_method='eft',
//      eft_status='pending'. The Finix webhook flips it to
//      'succeeded' when SALE_SUCCEEDED lands (3-5 business days).
//   5. Return { paymentId, transferId, state, eftStatus, last4 } to
//      the pay-link UI so it can show the right "we'll let you know
//      once funds clear" message.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { createBankAccountInstrument, createACHDebit } from "@/lib/finix/ach-client";

const MAX_EFT_AMOUNT = 2500;        // dollars
const MIN_EFT_AMOUNT = 1;           // $1 floor — Finix minimum
const ALLOWED_CURRENCIES = new Set(["CAD", "USD"]);

interface Body {
  pay_link_id?: string;
  merchant_id?: string;
  amount?: number | string;
  currency?: string;
  customer_name?: string;
  customer_email?: string;
  account_holder?: string;
  routing_number?: string;
  account_number?: string;
  account_type?: "checking" | "savings";
  description?: string;
  idempotency_key?: string;
}

function err(code: string, message: string, status: number, detail?: unknown) {
  const b: { error: { code: string; message: string; detail?: unknown } } = { error: { code, message } };
  if (detail !== undefined) b.error.detail = detail;
  return NextResponse.json(b, { status });
}

export async function POST(req: NextRequest) {
  let body: Body;
  try { body = (await req.json()) as Body; }
  catch { return err("bad_request", "invalid_json", 400); }

  const payLinkId      = String(body.pay_link_id ?? "").trim();
  const merchantId     = String(body.merchant_id ?? "").trim();
  const amountStr      = String(body.amount ?? "").trim();
  const currency       = String(body.currency ?? "CAD").toUpperCase();
  const customerName   = String(body.customer_name ?? "").trim();
  const customerEmail  = String(body.customer_email ?? "").trim().toLowerCase();
  const accountHolder  = String(body.account_holder ?? customerName).trim();
  const routingNumber  = String(body.routing_number ?? "").replace(/\D/g, "");
  const accountNumber  = String(body.account_number ?? "").replace(/\D/g, "");
  const accountType    = (body.account_type === "savings" ? "SAVINGS" : "CHECKING") as "CHECKING" | "SAVINGS";
  const description    = String(body.description ?? "").trim();
  const idempotencyKey = String(body.idempotency_key ?? "").trim() || `eft_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  // ── Input validation ────────────────────────────────────────────────
  const amount = Number(amountStr);
  if (!Number.isFinite(amount) || amount <= 0) return err("bad_request", "amount_invalid", 400);
  if (amount < MIN_EFT_AMOUNT) return err("bad_request", "amount_too_low", 400, { minimum: MIN_EFT_AMOUNT });
  if (amount > MAX_EFT_AMOUNT) {
    return err(
      "bad_request",
      `Bank transfers are capped at $${MAX_EFT_AMOUNT.toLocaleString()} per transaction. Use a card for larger amounts.`,
      400,
      { maximum: MAX_EFT_AMOUNT },
    );
  }
  if (!ALLOWED_CURRENCIES.has(currency)) return err("bad_request", "currency_unsupported", 400);
  if (!payLinkId) return err("bad_request", "pay_link_id_required", 400);
  if (!merchantId) return err("bad_request", "merchant_id_required", 400);
  if (accountHolder.length < 2) return err("bad_request", "account_holder_required", 400);
  if (routingNumber.length < 8 || routingNumber.length > 9) {
    return err("bad_request", "routing_number_invalid", 400, { hint: "8 digits for Canada (transit + institution), 9 for US (ABA)." });
  }
  if (accountNumber.length < 4 || accountNumber.length > 17) {
    return err("bad_request", "account_number_invalid", 400);
  }

  const supabase = getSupabaseAdmin();
  const country = currency === "CAD" ? "CAN" : "USA";
  const last4 = accountNumber.slice(-4);

  // ── Idempotency: short-circuit if we've seen this key ───────────────
  const { data: prior } = await supabase
    .from("zenipay_payments")
    .select("id, status, eft_status, gateway_transfer_id")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (prior) {
    return NextResponse.json({
      paymentId:  prior.id,
      transferId: prior.gateway_transfer_id,
      state:      prior.status,
      eftStatus:  prior.eft_status,
      last4,
      idempotent: true,
    });
  }

  // ── 1. Create Finix bank-account instrument ─────────────────────────
  let instrumentId: string;
  try {
    const inst = await createBankAccountInstrument({
      account_holder: accountHolder,
      account_number: accountNumber,
      routing_number: routingNumber,
      account_type:   accountType,
      country,
      currency,
    });
    if (inst.status >= 400 || !inst.data?.id) {
      return err("gateway_error", "instrument_create_failed", 502, { status: inst.status });
    }
    instrumentId = inst.data.id;
  } catch (e) {
    return err("gateway_error", "instrument_create_failed", 502, { detail: e instanceof Error ? e.message : String(e) });
  }

  // ── 2. Create the ACH debit transfer ────────────────────────────────
  const amountCents = Math.round(amount * 100);
  let transferId: string;
  let transferState: string;
  try {
    const transfer = await createACHDebit({
      payment_instrument_id: instrumentId,
      amount_cents:          amountCents,
      currency,
      idempotency_id:        idempotencyKey,
      memo:                  description || `Pay link ${payLinkId}`,
      statement_descriptor:  "ZENIPAY",
    });
    if (transfer.status >= 400 || !transfer.data?.id) {
      return err("gateway_error", "transfer_create_failed", 502, { status: transfer.status });
    }
    transferId    = transfer.data.id;
    transferState = transfer.data.state;
  } catch (e) {
    return err("gateway_error", "transfer_create_failed", 502, { detail: e instanceof Error ? e.message : String(e) });
  }

  // ── 3. Persist ──────────────────────────────────────────────────────
  // ZeniPay payment-id pattern matches the card flow (ZNV-XXXXXXXX).
  const paymentId = `ZNV-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
  const eftStatus = transferState === "SUCCEEDED" ? "succeeded"
                  : transferState === "FAILED"    ? "failed"
                  :                                  "pending";
  const status    = eftStatus === "succeeded" ? "succeeded"
                  : eftStatus === "failed"    ? "failed"
                  :                              "pending";
  const now = new Date().toISOString();

  const { error: insErr } = await supabase.from("zenipay_payments").insert({
    id:                    paymentId,
    payment_link_id:       payLinkId,
    merchant_id:           merchantId,
    amount,
    currency,
    description:           description || null,
    customer_name:         customerName || null,
    customer_email:        customerEmail || null,
    status,
    gateway:               "finix",
    gateway_transfer_id:   transferId,
    gateway_instrument_id: instrumentId,
    payment_method:        "eft",
    bank_last4:            last4,
    eft_status:            eftStatus,
    idempotency_key:       idempotencyKey,
    created_at:            now,
    updated_at:            now,
  });
  if (insErr) {
    console.error("[eft/create-transfer] payment insert failed:", insErr.message);
    // The transfer is already at Finix — return success so the customer
    // doesn't double-pay. We'll reconcile via webhook.
  }

  return NextResponse.json({
    paymentId,
    transferId,
    state: status,
    eftStatus,
    last4,
    settlement_estimate_business_days: 5,
  });
}
