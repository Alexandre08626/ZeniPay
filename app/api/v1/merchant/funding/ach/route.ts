// POST /api/v1/merchant/funding/ach
//
// Inbound ACH funding. Creates a Finix bank-account instrument for
// the payer, fires an ACH debit, and records a pending row in
// zenipay_funding_requests. The webhook (finix-to-zenicore) credits
// the org treasury via zc_fund_treasury when SALE_SUCCEEDED lands.
//
// NEVER logs the raw account_number or routing_number — only the
// Finix masked representation (`•••• 1234`) is persisted.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { createACHDebit, createBankAccountInstrument } from "@/lib/finix/ach-client";
import { auditAsync } from "@/lib/audit/audit-logger";
import { requireZpSession, resolveMerchantId } from "@/lib/auth/zp-session";

interface Body {
  merchant_id?: string;
  account_holder?: string;
  routing_number?: string;
  account_number?: string;
  account_type?: "checking" | "savings";
  amount_units?: number | string;
  currency?: string;
  idempotency_key?: string;
  memo?: string;
  statement_descriptor?: string;
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
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d;
}

export async function POST(req: NextRequest) {
  const session = requireZpSession(req);
  if (session instanceof NextResponse) return session;
  let body: Body;
  try { body = await req.json() as Body; } catch { return err("bad_request", "invalid_json", 400); }

  const r = resolveMerchantId(session, body.merchant_id ?? null);
  if (r instanceof NextResponse) return r;
  const merchantId     = r;
  const accountHolder  = String(body.account_holder ?? "").trim();
  const routingNumber  = String(body.routing_number ?? "").replace(/\s/g, "");
  const accountNumber  = String(body.account_number ?? "").replace(/\s/g, "");
  const accountType    = String(body.account_type ?? "checking").toLowerCase();
  const currency       = String(body.currency ?? "USD").toUpperCase();
  const idempotencyKey = String(body.idempotency_key ?? "").trim();
  const memo           = body.memo ? String(body.memo).slice(0, 200) : null;
  const amountUnits    = typeof body.amount_units === "string" ? Number(body.amount_units) : (body.amount_units ?? NaN);

  if (!accountHolder || accountHolder.length < 2) return err("bad_request", "account_holder_required", 400);
  if (!/^\d{6,12}$/.test(routingNumber))     return err("bad_request", "routing_number_invalid", 400);
  if (!/^\d{4,20}$/.test(accountNumber))     return err("bad_request", "account_number_invalid", 400);
  if (!["checking", "savings"].includes(accountType)) return err("bad_request", "account_type_invalid", 400);
  if (!idempotencyKey || idempotencyKey.length < 8)
                                             return err("bad_request", "idempotency_key_required", 400, { min_length: 8 });
  if (!Number.isFinite(amountUnits) || amountUnits <= 0)
                                             return err("bad_request", "amount_must_be_positive", 400);

  const amountCents = Math.round(amountUnits * 100);
  const db = getSupabaseAdmin();

  // Idempotency: if a funding row with this key already exists, return it.
  const { data: existing } = await db
    .from("zenipay_funding_requests")
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({
      success:           true,
      transfer_id:       existing.finix_transfer_id,
      status:            existing.status,
      estimated_arrival: existing.estimated_arrival,
      idempotent_replay: true,
    });
  }

  // 1. create Finix bank-account instrument
  let instrumentId: string;
  try {
    const inst = await createBankAccountInstrument({
      account_holder: accountHolder,
      account_number: accountNumber,
      routing_number: routingNumber,
      account_type:   accountType.toUpperCase() as "CHECKING" | "SAVINGS",
      country:        currency === "CAD" ? "CAN" : "USA",
    });
    if (inst.status >= 400 || !inst.data?.id) {
      return err("bad_gateway", "instrument_create_failed", 502, { detail: inst.data });
    }
    instrumentId = inst.data.id;
  } catch (e) {
    return err("bad_gateway", "instrument_create_failed", 502, { detail: e instanceof Error ? e.message : String(e) });
  }

  // 2. fire the ACH debit
  let transferId: string;
  let transferState: string;
  try {
    const t = await createACHDebit({
      payment_instrument_id: instrumentId,
      amount_cents:          amountCents,
      currency,
      statement_descriptor:  body.statement_descriptor ?? "ZeniPay",
      idempotency_id:        idempotencyKey,
      memo:                  memo ?? undefined,
    });
    if (t.status >= 400 || !t.data?.id) {
      return err("bad_gateway", "ach_debit_failed", 502, { detail: t.data });
    }
    transferId    = t.data.id;
    transferState = t.data.state;
  } catch (e) {
    return err("bad_gateway", "ach_debit_failed", 502, { detail: e instanceof Error ? e.message : String(e) });
  }

  const estimatedArrival = addBusinessDays(new Date(), 3).toISOString();
  const mappedStatus: "pending" | "processing" =
    /succeed|success/i.test(transferState) ? "processing" : "pending";

  const rowId = `fund_${crypto.randomUUID()}`;
  const { error: insErr } = await db.from("zenipay_funding_requests").insert({
    id:                  rowId,
    merchant_id:         merchantId,
    source_type:         "ach",
    amount_units:        amountUnits,
    currency,
    status:              mappedStatus,
    finix_transfer_id:   transferId,
    payer_name:          accountHolder,
    routing_number:      `•••• ${routingNumber.slice(-3)}`,  // masked — we never persist the raw value
    account_type:        accountType,
    estimated_arrival:   estimatedArrival,
    idempotency_key:     idempotencyKey,
    memo,
  });
  if (insErr) {
    return err("server_error", "funding_row_insert_failed", 500, { detail: insErr.message });
  }

  auditAsync({
    merchant_id: merchantId,
    actor_type:  "merchant_user",
    actor_id:    merchantId,
    action:      "funding.ach_requested",
    resource_type: "zenipay_funding_requests",
    resource_id:   rowId,
    new_value: { amount_units: amountUnits, currency, transfer_id: transferId },
    ip_address:  req.headers.get("x-forwarded-for") ?? null,
    user_agent:  req.headers.get("user-agent") ?? null,
    severity:    "info",
  });

  return NextResponse.json({
    success:           true,
    funding_id:        rowId,
    transfer_id:       transferId,
    status:            mappedStatus,
    estimated_arrival: estimatedArrival,
  });
}
