// POST /api/v1/internal/yield-payout-tick
//
// Monthly yield payout cron. Auth via x-yield-cron-secret header.
// Sums each enrollment's unpaid accruals, credits the customer
// account, marks accruals paid, writes a payout row.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

interface EnrollmentRow {
  id: string;
  merchant_id: string;
  account_id: string | null;
  account_type: "merchant" | "personal" | "treasury" | "agent_wallet";
  status: string;
}
interface AccrualRow {
  id: string;
  enrollment_id: string;
  client_amount: number;
  currency: string;
  accrual_date: string;
}

function authorized(req: NextRequest): boolean {
  const accepted = [process.env.YIELD_CRON_SECRET, process.env.CRON_SECRET].filter(Boolean) as string[];
  if (accepted.length === 0) return false;
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.replace(/^Bearer\s+/i, "");
  const got = req.headers.get("x-yield-cron-secret") ?? bearer;
  return !!got && accepted.includes(got);
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin();
  const now = new Date().toISOString();
  // Process even cancelled / paused enrollments — pending accruals
  // earned while active still need to land.
  const { data: enrollments } = await db
    .from("zenipay_yield_enrollments")
    .select("id, merchant_id, account_id, account_type, status");

  let payoutsProcessed = 0;
  let totalPaid = 0;

  for (const e of (enrollments ?? []) as EnrollmentRow[]) {
    const { data: pending } = await db
      .from("zenipay_yield_accruals")
      .select("id, enrollment_id, client_amount, currency, accrual_date")
      .eq("enrollment_id", e.id)
      .eq("paid_out", false);
    const accruals = (pending ?? []) as AccrualRow[];
    if (accruals.length === 0) continue;

    const total = accruals.reduce((s, a) => s + Number(a.client_amount), 0);
    if (total <= 0) continue;

    const currency = accruals[0].currency;
    const periodFrom = accruals.reduce((min, a) => (a.accrual_date < min ? a.accrual_date : min), accruals[0].accrual_date);
    const periodTo   = accruals.reduce((max, a) => (a.accrual_date > max ? a.accrual_date : max), accruals[0].accrual_date);

    // Credit the client account.
    if (e.account_id) {
      if (e.account_type === "merchant") {
        const { data: acct } = await db.from("zenipay_accounts").select("balance").eq("id", e.account_id).maybeSingle();
        const newBal = Number(acct?.balance ?? 0) + total;
        await db.from("zenipay_accounts").update({ balance: newBal, updated_at: now }).eq("id", e.account_id);
        // best-effort ledger row using manual_adjustment (no 'yield_credit' enum yet)
        await db.from("zenipay_ledger").insert({
          id: `led_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          merchant_id: e.merchant_id,
          event_type: "manual_adjustment",
          wallet_type: "platform",
          direction: "credit",
          amount: total,
          currency,
          reference: e.id,
          note: `ZeniPay Yield · ${periodFrom} → ${periodTo}`,
          created_at: now,
        });
      } else if (e.account_type === "personal") {
        const { data: acct } = await db.from("zenipay_personal_accounts").select("balance").eq("id", e.account_id).maybeSingle();
        const newBal = Number(acct?.balance ?? 0) + total;
        await db.from("zenipay_personal_accounts").update({ balance: newBal, updated_at: now }).eq("id", e.account_id);
        await db.from("zenipay_personal_transactions").insert({
          id: `ptx_${crypto.randomUUID()}`,
          merchant_id: e.merchant_id,
          account_id: e.account_id,
          type: "income",
          amount: total,
          currency,
          description: `ZeniPay Yield · ${periodFrom} → ${periodTo}`,
          category: "yield",
        });
      }
      // treasury + agent_wallet currently audit-only — money lives in
      // ZeniCore and needs a wrapper RPC; left for a follow-up.
    }

    const payoutId = `ypay_${crypto.randomUUID()}`;
    await db.from("zenipay_yield_payouts").insert({
      id: payoutId,
      enrollment_id: e.id,
      merchant_id: e.merchant_id,
      amount: total,
      currency,
      period_from: periodFrom,
      period_to: periodTo,
      accruals_count: accruals.length,
      status: "completed",
    });

    await db.from("zenipay_yield_accruals")
      .update({ paid_out: true, paid_at: now })
      .eq("enrollment_id", e.id)
      .eq("paid_out", false);

    payoutsProcessed += 1;
    totalPaid += total;
  }

  try {
    await db.from("zenipay_audit_log").insert({
      actor_type: "system",
      actor_id: "yield_cron",
      action: "yield.monthly_payout",
      resource_type: "zenipay_yield_payouts",
      resource_id: now.slice(0, 10),
      new_value: { payouts_processed: payoutsProcessed, total_paid: totalPaid },
      severity: "info",
    });
  } catch { /* ignore */ }

  return NextResponse.json({
    payouts_processed: payoutsProcessed,
    total_paid_out: Math.round(totalPaid * 1_000_000) / 1_000_000,
  });
}
