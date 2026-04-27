// GET /api/v1/admin/revenue
//
// Aggregated revenue view across ALL ZeniPay revenue streams:
//   - platform_fee_collected ledger rows (2.9% + $0.30 per card
//     payment, skimmed in process-payment/route.ts and credited to
//     ZeniPay corporate merchant_id=acc_1774740862294).
//   - zenipay_yield_accruals (house share of merchant savings yield,
//     populated by the daily yield-accrual cron).
//
// Returns { accruals, fees, summary } so /admin/wallet/revenue can
// surface the two streams side-by-side without making the client
// re-aggregate.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

const ADMIN_EMAILS = new Set([
  "zenipay@zeniva.ca",
  "info@zeniva.ca",
  "alexandreblais26@gmail.com",
]);

const ZENIPAY_CORP_MERCHANT = "acc_1774740862294";

function authorized(req: NextRequest): boolean {
  const email = (req.headers.get("x-admin-email") ?? "").trim().toLowerCase();
  return !!email && ADMIN_EMAILS.has(email);
}

interface AccrualRow {
  id: string;
  merchant_id: string | null;
  accrual_date: string;
  gross_amount: number | string | null;
  platform_amount: number | string | null;
  client_amount: number | string | null;
  currency: string | null;
  paid_out?: boolean | null;
}

interface FeeRow {
  id: string;
  payment_id: string | null;
  amount: number | string | null;
  currency: string | null;
  note: string | null;
  reference: string | null;
  created_at: string;
}

function num(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function startOfMonthIso(): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin();

  const [accrualsRes, feesRes] = await Promise.all([
    db.from("zenipay_yield_accruals")
      .select("id, merchant_id, accrual_date, gross_amount, platform_amount, client_amount, currency, paid_out")
      .order("accrual_date", { ascending: false })
      .limit(500),
    db.from("zenipay_ledger")
      .select("id, payment_id, amount, currency, note, reference, created_at")
      .eq("merchant_id", ZENIPAY_CORP_MERCHANT)
      .eq("event_type", "platform_fee_collected")
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const accruals = ((accrualsRes.data ?? []) as AccrualRow[]);
  const fees = ((feesRes.data ?? []) as FeeRow[]);

  const monthIso = startOfMonthIso();

  const feesAllTime  = fees.reduce((s, r) => s + num(r.amount), 0);
  const feesThisMonth = fees
    .filter((r) => r.created_at >= monthIso)
    .reduce((s, r) => s + num(r.amount), 0);

  const yieldAllTime  = accruals.reduce((s, r) => s + num(r.platform_amount), 0);
  const yieldThisMonth = accruals
    .filter((r) => (r.accrual_date || "") >= monthIso.slice(0, 10))
    .reduce((s, r) => s + num(r.platform_amount), 0);

  return NextResponse.json({
    accruals,
    fees,
    summary: {
      fees_this_month:  feesThisMonth,
      fees_all_time:    feesAllTime,
      yield_this_month: yieldThisMonth,
      yield_all_time:   yieldAllTime,
      total_revenue_all_time: feesAllTime + yieldAllTime,
      currency: "CAD",
    },
  });
}
