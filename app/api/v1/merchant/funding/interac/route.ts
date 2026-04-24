// POST /api/v1/merchant/funding/interac
//
// Creates an Interac e-Transfer request and returns the Finix-hosted
// payment URL the merchant forwards to the payer. CAD only.
// When the payer completes the transfer, webhook credits the treasury.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { createInteracRequest } from "@/lib/finix/interac-client";
import { auditAsync } from "@/lib/audit/audit-logger";

interface Body {
  merchant_id?: string;
  payer_name?: string;
  payer_email?: string;
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

export async function POST(req: NextRequest) {
  let body: Body;
  try { body = await req.json() as Body; } catch { return err("bad_request", "invalid_json", 400); }

  const merchantId     = String(body.merchant_id ?? "").trim();
  const payerName      = String(body.payer_name ?? "").trim();
  const payerEmail     = String(body.payer_email ?? "").trim().toLowerCase();
  const currency       = String(body.currency ?? "CAD").toUpperCase();
  const idempotencyKey = String(body.idempotency_key ?? "").trim();
  const memo           = body.memo ? String(body.memo).slice(0, 200) : null;
  const amountUnits    = typeof body.amount_units === "string" ? Number(body.amount_units) : (body.amount_units ?? NaN);

  if (!merchantId)                           return err("bad_request", "merchant_id_required", 400);
  if (payerName.length < 2)                  return err("bad_request", "payer_name_required", 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payerEmail))
                                             return err("bad_request", "payer_email_invalid", 400);
  if (currency !== "CAD")                    return err("bad_request", "interac_is_cad_only", 400);
  if (!idempotencyKey || idempotencyKey.length < 8)
                                             return err("bad_request", "idempotency_key_required", 400, { min_length: 8 });
  if (!Number.isFinite(amountUnits) || amountUnits <= 0)
                                             return err("bad_request", "amount_must_be_positive", 400);

  const amountCents = Math.round(amountUnits * 100);
  const db = getSupabaseAdmin();

  // Idempotency replay.
  const { data: existing } = await db
    .from("zenipay_funding_requests")
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({
      success:           true,
      funding_id:        existing.id,
      transfer_id:       existing.finix_transfer_id,
      payment_url:       existing.payment_url,
      status:            existing.status,
      idempotent_replay: true,
    });
  }

  // Fire the Interac request at Finix.
  let transferId: string;
  let paymentUrl: string | null;
  try {
    const r = await createInteracRequest({
      payer_name:      payerName,
      payer_email:     payerEmail,
      amount_cents:    amountCents,
      idempotency_id:  idempotencyKey,
      memo:            memo ?? undefined,
    });
    if (r.status >= 400 || !r.data?.id) {
      const msg = JSON.stringify(r.data ?? {}).slice(0, 200);
      if (/not_enabled|not enabled|unsupported/i.test(msg)) {
        return err("unprocessable", "interac_not_enabled", 422, {
          detail: "Interac is not enabled on this Finix merchant yet.",
        });
      }
      return err("bad_gateway", "interac_create_failed", 502, { detail: msg });
    }
    transferId = r.data.id;
    paymentUrl = r.data.payment_url;
  } catch (e) {
    return err("bad_gateway", "interac_create_failed", 502, { detail: e instanceof Error ? e.message : String(e) });
  }

  const rowId = `fund_${crypto.randomUUID()}`;
  const { error: insErr } = await db.from("zenipay_funding_requests").insert({
    id:                rowId,
    merchant_id:       merchantId,
    source_type:       "interac",
    amount_units:      amountUnits,
    currency:          "CAD",
    status:            "pending",
    finix_transfer_id: transferId,
    payment_url:       paymentUrl,
    payer_name:        payerName,
    payer_email:       payerEmail,
    idempotency_key:   idempotencyKey,
    memo,
  });
  if (insErr) return err("server_error", "funding_row_insert_failed", 500, { detail: insErr.message });

  auditAsync({
    merchant_id: merchantId,
    actor_type:  "merchant_user",
    actor_id:    merchantId,
    action:      "funding.interac_requested",
    resource_type: "zenipay_funding_requests",
    resource_id:   rowId,
    new_value: { amount_units: amountUnits, currency: "CAD", transfer_id: transferId, payer_email: payerEmail },
    ip_address:  req.headers.get("x-forwarded-for") ?? null,
    severity:    "info",
  });

  return NextResponse.json({
    success:      true,
    funding_id:   rowId,
    transfer_id:  transferId,
    payment_url:  paymentUrl,
    status:       "pending",
  });
}
