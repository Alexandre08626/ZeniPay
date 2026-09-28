export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Settlement reconciliation (token-protected, ZP_DIAG_TOKEN).
// GET  = dry run: how each approved Finix settlement splits per merchant,
//        and what's already booked.
// POST = apply: reverse settlements booked on the wrong merchant by the old
//        handler (single row `led_settle_<id>`), then book per-merchant shares.

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { listSettlements } from "@/lib/finix/settlement-client";
import { computeAllocation, applySettlement } from "@/lib/zenipay/settlement-allocation";

function authed(req: NextRequest) {
  const token = process.env.ZP_DIAG_TOKEN || "";
  const given = req.headers.get("x-diag-token") || "";
  return !!token && given.length === token.length && timingSafeEqual(Buffer.from(given), Buffer.from(token));
}

async function run(apply: boolean) {
  const db = getSupabaseAdmin();
  const { data: settlements } = await listSettlements(50);
  const approved = (settlements || []).filter((s: any) => ["APPROVED", "SUCCEEDED"].includes(String(s.status || s.state || "").toUpperCase()));
  const report: unknown[] = [];
  for (const s of approved.reverse()) { // oldest first
    const sid = String(s.id);
    const { data: booked } = await db.from("zenipay_ledger").select("id, merchant_id, amount, event_type")
      .like("id", `led_settle_${sid}%`);
    const legacy = (booked || []).find((r: any) => r.id === `led_settle_${sid}`);
    const plan = await computeAllocation(db, { id: sid, total_amount: Number((s as any).total_amount), created_at: String((s as any).created_at) });
    const entry: Record<string, unknown> = {
      settlement: sid, created_at: (s as any).created_at, total: Number((s as any).total_amount) / 100,
      already_booked: booked, plan,
    };
    if (apply) {
      if (legacy) {
        const fixId = `led_fix_${sid}`;
        const { data: fx } = await db.from("zenipay_ledger").select("id").eq("id", fixId).maybeSingle();
        if (!fx) {
          await db.from("zenipay_ledger").insert({
            id: fixId, payment_id: null, merchant_id: legacy.merchant_id, event_type: "settlement_correction",
            wallet_type: "platform", direction: "credit", amount: legacy.amount, currency: "CAD", reference: sid,
            note: `Correction: settlement ${sid} was booked on the wrong merchant (shared Finix account)`,
            created_at: new Date().toISOString(),
          });
        }
        entry.reversed_legacy = { merchant: legacy.merchant_id, amount: legacy.amount };
      }
      entry.applied = await applySettlement(db, { id: sid, total_amount: Number((s as any).total_amount), currency: (s as any).currency, created_at: String((s as any).created_at) });
    }
    report.push(entry);
  }
  return report;
}

export async function GET(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ dry_run: true, settlements: await run(false) });
}

export async function POST(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ applied: true, settlements: await run(true) });
}
