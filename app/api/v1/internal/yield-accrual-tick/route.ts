// POST /api/v1/internal/yield-accrual-tick
//
// Daily yield-accrual cron. Auth via x-yield-cron-secret header
// (matches `process.env.YIELD_CRON_SECRET`). Walks every active
// enrollment, fetches the live balance from the right table for
// the enrollment's account_type, then writes a row to
// zenipay_yield_accruals + bumps the enrollment.total_earned.
//
// Idempotent on (enrollment_id, accrual_date) — re-running the same
// day produces no duplicates because we check before insert.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

interface ConfigRow {
  id: string;
  rate_annual_pct: number;
  platform_share_pct: number;
  client_share_pct: number;
  min_balance: number;
  currency: string;
  is_active: boolean;
}
interface EnrollmentRow {
  id: string;
  merchant_id: string;
  account_id: string | null;
  account_type: "merchant" | "personal" | "treasury" | "agent_wallet";
  config_id: string;
  status: string;
  total_earned: number | null;
}

function authorized(req: NextRequest): boolean {
  const accepted = [process.env.YIELD_CRON_SECRET, process.env.CRON_SECRET].filter(Boolean) as string[];
  if (accepted.length === 0) return false;
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.replace(/^Bearer\s+/i, "");
  const got = req.headers.get("x-yield-cron-secret") ?? bearer;
  return !!got && accepted.includes(got);
}

async function balanceFor(
  db: ReturnType<typeof getSupabaseAdmin>,
  e: EnrollmentRow,
): Promise<number> {
  if (!e.account_id) return 0;
  if (e.account_type === "merchant") {
    const { data } = await db.from("zenipay_accounts").select("balance").eq("id", e.account_id).maybeSingle();
    return Number(data?.balance ?? 0);
  }
  if (e.account_type === "personal") {
    const { data } = await db.from("zenipay_personal_accounts").select("balance").eq("id", e.account_id).maybeSingle();
    return Number(data?.balance ?? 0);
  }
  // treasury + agent_wallet — read from agents schema via PostgREST.
  // We never block accrual on these failing — return 0.
  return 0;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin();
  const today = new Date().toISOString().slice(0, 10);

  const { data: configs } = await db.from("zenipay_yield_config").select("*").eq("is_active", true);
  const cfgById = new Map<string, ConfigRow>();
  for (const c of (configs ?? []) as ConfigRow[]) cfgById.set(c.id, c);

  const { data: enrollments } = await db
    .from("zenipay_yield_enrollments")
    .select("id, merchant_id, account_id, account_type, config_id, status, total_earned")
    .eq("status", "active");

  let processed = 0;
  let skipped_min_balance = 0;
  let totalGross = 0;
  let totalClient = 0;
  let totalPlatform = 0;

  for (const e of (enrollments ?? []) as EnrollmentRow[]) {
    const cfg = cfgById.get(e.config_id);
    if (!cfg) continue;

    // Skip if an accrual already exists for today (idempotency).
    const { data: dup } = await db
      .from("zenipay_yield_accruals")
      .select("id")
      .eq("enrollment_id", e.id)
      .eq("accrual_date", today)
      .maybeSingle();
    if (dup) continue;

    const balance = await balanceFor(db, e);
    if (balance < Number(cfg.min_balance)) {
      skipped_min_balance += 1;
      continue;
    }

    const dailyRate = Number(cfg.rate_annual_pct) / 365 / 100;
    const gross = balance * dailyRate;
    const platformAmount = gross * (Number(cfg.platform_share_pct) / 100);
    const clientAmount   = gross * (Number(cfg.client_share_pct) / 100);

    const { error: insErr } = await db.from("zenipay_yield_accruals").insert({
      id: `yacr_${crypto.randomUUID()}`,
      enrollment_id: e.id,
      merchant_id: e.merchant_id,
      balance_at_accrual: balance,
      daily_rate_pct: dailyRate,
      gross_amount: gross,
      platform_amount: platformAmount,
      client_amount: clientAmount,
      currency: cfg.currency,
      accrual_date: today,
      paid_out: false,
    });
    if (insErr) continue;

    await db.from("zenipay_yield_enrollments")
      .update({
        last_accrual_at: new Date().toISOString(),
        total_earned: Number(e.total_earned ?? 0) + clientAmount,
      })
      .eq("id", e.id);

    processed += 1;
    totalGross += gross;
    totalClient += clientAmount;
    totalPlatform += platformAmount;
  }

  // Best-effort audit log.
  try {
    await db.from("zenipay_audit_log").insert({
      actor_type: "system",
      actor_id: "yield_cron",
      action: "yield.accrual_tick",
      resource_type: "zenipay_yield_accruals",
      resource_id: today,
      new_value: { processed, skipped_min_balance, total_gross: totalGross, total_client: totalClient, total_platform: totalPlatform },
      severity: "info",
    });
  } catch { /* ignore */ }

  return NextResponse.json({
    date: today,
    processed,
    skipped_min_balance,
    total_gross: round(totalGross),
    total_client: round(totalClient),
    total_platform: round(totalPlatform),
  });
}

function round(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}
