// GET /api/v1/yield/history?merchant_id=&account_id=&type=&from=&to=

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

export async function GET(req: NextRequest) {
  const merchantId = req.nextUrl.searchParams.get("merchant_id")?.trim();
  if (!merchantId) {
    return NextResponse.json({ error: { code: "bad_request", message: "merchant_id_required" } }, { status: 400 });
  }
  const type = (req.nextUrl.searchParams.get("type") ?? "all").toLowerCase() as "all" | "accruals" | "payouts";
  const from = req.nextUrl.searchParams.get("from")?.trim();
  const to   = req.nextUrl.searchParams.get("to")?.trim();
  const accountId = req.nextUrl.searchParams.get("account_id")?.trim() || null;

  const db = getSupabaseAdmin();

  let enrollmentIds: string[] = [];
  if (accountId) {
    const { data } = await db.from("zenipay_yield_enrollments").select("id").eq("merchant_id", merchantId).eq("account_id", accountId);
    enrollmentIds = (data ?? []).map((e) => e.id);
    if (enrollmentIds.length === 0) return NextResponse.json({ accruals: [], payouts: [] });
  }

  let accruals: unknown[] = [];
  let payouts: unknown[] = [];

  if (type === "all" || type === "accruals") {
    let q = db.from("zenipay_yield_accruals").select("*").eq("merchant_id", merchantId);
    if (enrollmentIds.length) q = q.in("enrollment_id", enrollmentIds);
    if (from) q = q.gte("accrual_date", from);
    if (to)   q = q.lte("accrual_date", to);
    const { data } = await q.order("accrual_date", { ascending: false }).limit(180);
    accruals = data ?? [];
  }
  if (type === "all" || type === "payouts") {
    let q = db.from("zenipay_yield_payouts").select("*").eq("merchant_id", merchantId);
    if (enrollmentIds.length) q = q.in("enrollment_id", enrollmentIds);
    if (from) q = q.gte("period_to", from);
    if (to)   q = q.lte("period_to", to);
    const { data } = await q.order("created_at", { ascending: false }).limit(60);
    payouts = data ?? [];
  }

  return NextResponse.json({ accruals, payouts });
}
