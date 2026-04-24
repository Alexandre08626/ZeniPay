// GET /api/v1/merchant/finix-balance
//
// Reads the Finix merchant account balance — the funds Finix is
// holding after card settlements, before they've been swept to the
// bank via a Settlement. Powers the "Finix balance" tile on
// /app/overview.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getMerchantBalance } from "@/lib/finix/settlement-client";

export async function GET() {
  const r = await getMerchantBalance();
  if (!r.data) {
    return NextResponse.json({ error: "finix_unreachable", status: r.status }, { status: 502 });
  }
  return NextResponse.json({
    available_cents: r.data.available_amount,
    pending_cents:   r.data.pending_amount,
    currency:        r.data.currency,
    merchant_id:     r.data.merchant_id,
  });
}
