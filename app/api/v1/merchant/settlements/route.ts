// GET /api/v1/merchant/settlements
// List historical Finix settlements for the merchant.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { listSettlements } from "@/lib/finix/settlement-client";

export async function GET(req: NextRequest) {
  const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get("limit") ?? "50") || 50, 1), 200);
  try {
    const r = await listSettlements(limit);
    return NextResponse.json({
      settlements: (r.data ?? []).map((s) => ({
        id: s.id,
        state: s.state,
        total_amount_cents: s.total_amount,
        currency: s.currency,
        created_at: s.created_at,
        transferred_at: s.transferred_at,
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "unreachable" }, { status: 502 });
  }
}
