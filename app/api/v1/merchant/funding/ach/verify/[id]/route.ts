// GET /api/v1/merchant/funding/ach/verify/[id]
// Status poll for a specific ACH funding request.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { getACHDebit } from "@/lib/finix/ach-client";

interface Ctx { params: Promise<{ id: string }> | { id: string }; }

export async function GET(req: NextRequest, ctx: Ctx) {
  const { id } = await Promise.resolve(ctx.params);
  const db = getSupabaseAdmin();

  const { data: row } = await db
    .from("zenipay_funding_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!row.finix_transfer_id) {
    return NextResponse.json({ row, finix: null });
  }

  try {
    const r = await getACHDebit(row.finix_transfer_id);
    return NextResponse.json({
      row,
      finix: {
        state: r.data?.state ?? "UNKNOWN",
        amount: r.data?.amount,
        currency: r.data?.currency,
        ready_to_settle_at: r.data?.ready_to_settle_at ?? null,
      },
    });
  } catch (e) {
    return NextResponse.json({ row, finix: { error: e instanceof Error ? e.message : "unreachable" } });
  }
}
