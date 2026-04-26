// GET /api/v1/yield/status?merchant_id=...&account_id=...
//
// Snapshot of the merchant's yield state. If `account_id` is passed,
// scopes enrollment + earnings to that account. Otherwise returns
// rolled-up totals across every enrollment owned by the merchant.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { requireZpSession, resolveMerchantId } from "@/lib/auth/zp-session";

export async function GET(req: NextRequest) {
  const session = await requireZpSession(req);
  if (session instanceof NextResponse) return session;
  const r = resolveMerchantId(session, req.nextUrl.searchParams.get("merchant_id"));
  if (r instanceof NextResponse) return r;
  const merchantId = r;
  const accountId = req.nextUrl.searchParams.get("account_id")?.trim() || null;
  const currency  = (req.nextUrl.searchParams.get("currency") ?? "CAD").toUpperCase();

  const db = getSupabaseAdmin();

  const { data: cfgRow } = await db
    .from("zenipay_yield_config")
    .select("rate_annual_pct, platform_share_pct, client_share_pct, min_balance, currency, is_active")
    .eq("currency", currency)
    .eq("is_active", true)
    .maybeSingle();
  const grossRate  = Number(cfgRow?.rate_annual_pct ?? 0);
  const clientPct  = Number(cfgRow?.client_share_pct ?? 0);
  const clientRate = (grossRate * clientPct) / 100;
  const minBalance = Number(cfgRow?.min_balance ?? 100);

  let enrollmentsQ = db
    .from("zenipay_yield_enrollments")
    .select("*")
    .eq("merchant_id", merchantId);
  if (accountId) enrollmentsQ = enrollmentsQ.eq("account_id", accountId);
  const { data: enrollments } = await enrollmentsQ;
  const list = enrollments ?? [];

  const active = list.find((e) => e.status === "active") ?? list[0] ?? null;
  const totalEarned = list.reduce((s, e) => s + Number(e.total_earned ?? 0), 0);

  let pendingPayout = 0;
  let lastPayout: { amount: number; date: string } | null = null;
  if (active) {
    const { data: pending } = await db
      .from("zenipay_yield_accruals")
      .select("client_amount")
      .eq("enrollment_id", active.id)
      .eq("paid_out", false);
    pendingPayout = (pending ?? []).reduce((s, a) => s + Number(a.client_amount ?? 0), 0);

    const { data: last } = await db
      .from("zenipay_yield_payouts")
      .select("amount, period_to, created_at")
      .eq("enrollment_id", active.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last) lastPayout = { amount: Number(last.amount), date: last.period_to ?? last.created_at };
  }

  // First of next month, computed in UTC.
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  return NextResponse.json({
    enrolled: !!(active && active.status === "active"),
    enrollment_id: active?.id ?? null,
    enrollment_status: active?.status ?? null,
    current_rate_client: round(clientRate),
    current_rate_gross: round(grossRate),
    min_balance: minBalance,
    currency,
    total_earned_all_time: round(totalEarned),
    pending_payout: round(pendingPayout),
    last_payout: lastPayout,
    next_payout_date: next.toISOString().slice(0, 10),
  });
}

function round(n: number): number {
  return Math.round(n * 10000) / 10000;
}
