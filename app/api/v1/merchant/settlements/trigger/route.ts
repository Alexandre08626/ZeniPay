// POST /api/v1/merchant/settlements/trigger
//
// Triggers a manual settlement at Finix — sweeps the Finix-held
// funds to the merchant's bank. Auto-settle is OFF at the merchant
// config so nothing moves until this endpoint is hit.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createSettlement, getMerchantBalance } from "@/lib/finix/settlement-client";
import { auditAsync } from "@/lib/audit/audit-logger";
import { requireZpSession, resolveMerchantId } from "@/lib/auth/zp-session";

interface Body {
  merchant_id?: string;
  currency?: string;
  idempotency_key?: string;
}

function err(code: string, message: string, status: number, detail?: unknown) {
  const b: { error: { code: string; message: string; detail?: unknown } } = { error: { code, message } };
  if (detail !== undefined) b.error.detail = detail;
  return NextResponse.json(b, { status });
}

export async function POST(req: NextRequest) {
  const session = await requireZpSession(req);
  if (session instanceof NextResponse) return session;
  let body: Body;
  try { body = await req.json() as Body; } catch { body = {}; }

  const r = resolveMerchantId(session, body.merchant_id ?? null);
  if (r instanceof NextResponse) return r;
  const merchantId     = r;
  const currency       = String(body.currency ?? "CAD").toUpperCase();
  const idempotencyKey = String(body.idempotency_key ?? `settle-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`).trim();

  const bal = await getMerchantBalance();
  if (!bal.data) return err("bad_gateway", "finix_unreachable", 502, { status: bal.status });
  if ((bal.data.available_amount ?? 0) <= 0) {
    return err("unprocessable", "no_funds_to_settle", 422, {
      available_cents: bal.data.available_amount,
      pending_cents:   bal.data.pending_amount,
    });
  }

  try {
    const s = await createSettlement({ currency, idempotencyKey });
    if (s.status >= 400) return err("bad_gateway", "settlement_create_failed", 502, { detail: s.data });

    auditAsync({
      merchant_id: merchantId,
      actor_type:  "merchant_user",
      actor_id:    merchantId,
      action:      "settlement.triggered",
      resource_type: "finix_settlement",
      resource_id:   s.data.id,
      new_value: { amount_cents: s.data.total_amount, currency: s.data.currency, state: s.data.state },
      ip_address:  req.headers.get("x-forwarded-for") ?? null,
      severity:    "info",
    });

    return NextResponse.json({
      settlement_id:     s.data.id,
      total_amount_cents: s.data.total_amount,
      currency:          s.data.currency,
      state:             s.data.state,
      estimated_arrival: "T+1 business day",
    });
  } catch (e) {
    return err("bad_gateway", "settlement_create_failed", 502, { detail: e instanceof Error ? e.message : String(e) });
  }
}
