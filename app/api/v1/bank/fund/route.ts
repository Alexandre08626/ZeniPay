// POST /api/v1/bank/fund
// Body: { merchant_id, connection_id, amount_units, currency?, memo? }
//
// MX is a DATA provider — you can read balances and account/routing
// numbers, but MX doesn't move money. So funding works like this:
//   1. Pull the full account_number + routing_number from MX.
//   2. Create a Finix bank_account payment_instrument on the fly.
//   3. Fire a Finix ACH debit (SALE) against that instrument.
//   4. Insert a pending zenipay_funding_requests row so the merchant
//      UI shows the incoming wire, T+3 ETA.
//
// Returns 503 if Finix creds are missing. Returns 422 if the MX
// account doesn't expose routing/account numbers (some institutions
// don't — MX's verification layer handles some but not all).

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { getAccountDetail } from "@/lib/mx/mx-client";
import { createBankAccountInstrument, createACHDebit } from "@/lib/finix/ach-client";
import { auditAsync } from "@/lib/audit/audit-logger";
import { requireZpSession, resolveMerchantId } from "@/lib/auth/zp-session";

interface Body {
  merchant_id?: string;
  connection_id?: string;
  amount_units?: number | string;
  currency?: string;
  memo?: string;
}

function err(code: string, message: string, status: number, detail?: unknown) {
  return NextResponse.json({ error: { code, message, detail } }, { status });
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
  if (!process.env.FINIX_API_USERNAME || !process.env.FINIX_API_PASSWORD) {
    return err("service_unavailable", "payment_not_available", 503);
  }

  let body: Body;
  try { body = await req.json() as Body; } catch { return err("bad_request", "invalid_json", 400); }

  const r = resolveMerchantId(session, body.merchant_id ?? null);
  if (r instanceof NextResponse) return r;
  const merchantId   = r;
  const connectionId = String(body.connection_id ?? "").trim();
  const currency     = String(body.currency ?? "CAD").toUpperCase();
  const memo         = body.memo ? String(body.memo).slice(0, 200) : null;
  const amountUnits  = typeof body.amount_units === "string" ? Number(body.amount_units) : (body.amount_units ?? NaN);

  if (!connectionId) return err("bad_request", "connection_id_required", 400);
  if (!Number.isFinite(amountUnits) || amountUnits <= 0) return err("bad_request", "amount_must_be_positive", 400);

  const db = getSupabaseAdmin();
  const { data: conn } = await db
    .from("zenipay_bank_connections")
    .select("id, merchant_id, mx_user_guid, mx_account_guid, routing_number, account_number_last4, institution_name")
    .eq("id", connectionId)
    .eq("merchant_id", merchantId)
    .eq("status", "active")
    .maybeSingle();
  if (!conn) return err("not_found", "connection_not_found", 404);
  if (!conn.mx_user_guid || !conn.mx_account_guid) return err("unprocessable", "connection_missing_mx_ids", 422);

  // 1. Pull the full account_number + routing from MX.
  let acct;
  try {
    acct = await getAccountDetail(conn.mx_user_guid, conn.mx_account_guid);
  } catch (e) {
    return err("bad_gateway", "mx_account_fetch_failed", 502, e instanceof Error ? e.message : String(e));
  }
  if (!acct) return err("bad_gateway", "mx_account_not_found", 502);
  const routing = acct.routing_number ?? conn.routing_number ?? "";
  const accountNumber = acct.account_number ?? "";
  if (!routing || !accountNumber) return err("unprocessable", "account_not_verified", 422, {
    hint: "MX didn't return routing + account number for this institution. Try another bank or use the ACH form directly.",
  });

  // 2. Create Finix bank_account instrument.
  let instrumentId: string;
  try {
    const inst = await createBankAccountInstrument({
      account_holder: conn.institution_name ?? "Account holder",
      account_number: accountNumber,
      routing_number: routing,
      account_type: (acct.type ?? "CHECKING").toUpperCase() === "SAVINGS" ? "SAVINGS" : "CHECKING",
      country: currency === "CAD" ? "CAN" : "USA",
    });
    if (inst.status >= 400 || !inst.data?.id) {
      return err("bad_gateway", "finix_instrument_create_failed", 502, inst.data);
    }
    instrumentId = inst.data.id;
  } catch (e) {
    return err("bad_gateway", "finix_instrument_create_failed", 502, e instanceof Error ? e.message : String(e));
  }

  // 3. Fire the ACH debit.
  const idempotencyKey = `mxfund_${connectionId}_${Date.now()}`;
  let transferId: string;
  let transferState: string;
  try {
    const t = await createACHDebit({
      payment_instrument_id: instrumentId,
      amount_cents: Math.round(amountUnits * 100),
      currency,
      idempotency_id: idempotencyKey,
      memo: memo ?? undefined,
    });
    if (t.status >= 400 || !t.data?.id) {
      return err("bad_gateway", "finix_ach_debit_failed", 502, t.data);
    }
    transferId = t.data.id;
    transferState = t.data.state;
  } catch (e) {
    return err("bad_gateway", "finix_ach_debit_failed", 502, e instanceof Error ? e.message : String(e));
  }

  // 4. Insert a funding-request row so /app/overview + /app/wallets
  //    show the incoming ACH. Webhook completes it on SUCCEEDED.
  const estimatedArrival = addBusinessDays(new Date(), 3).toISOString();
  const rowId = `fund_${crypto.randomUUID()}`;
  await db.from("zenipay_funding_requests").insert({
    id: rowId,
    merchant_id: merchantId,
    source_type: "ach_mx",
    amount_units: amountUnits,
    currency,
    status: /succeed|success/i.test(transferState) ? "processing" : "pending",
    finix_transfer_id: transferId,
    payer_name: conn.institution_name ?? "MX bank",
    routing_number: `•••• ${routing.slice(-3)}`,
    account_type: (acct.type ?? "CHECKING").toLowerCase(),
    estimated_arrival: estimatedArrival,
    idempotency_key: idempotencyKey,
    memo,
  });

  auditAsync({
    merchant_id: merchantId,
    actor_type: "merchant_user",
    actor_id: merchantId,
    action: "bank.funded",
    resource_type: "zenipay_bank_connections",
    resource_id: connectionId,
    new_value: { amount_units: amountUnits, currency, transfer_id: transferId },
    severity: "info",
  });

  return NextResponse.json({
    success: true,
    status: "pending",
    funding_id: rowId,
    transfer_id: transferId,
    estimated_arrival: estimatedArrival,
  });
}
