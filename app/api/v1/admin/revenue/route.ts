// GET /api/v1/admin/revenue
//
// Aggregated accrual rows across ALL merchants — this is ZeniPay's
// revenue view, not a single-merchant one. Each row exposes
// platform_amount (house share) + client_amount + gross.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

const ADMIN_EMAILS = new Set(["zenipay@zeniva.ca", "info@zeniva.ca", "alexandreblais26@gmail.com"]);

function authorized(req: NextRequest): boolean {
  const email = (req.headers.get("x-admin-email") ?? "").trim().toLowerCase();
  return !!email && ADMIN_EMAILS.has(email);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("zenipay_yield_accruals")
    .select("id, merchant_id, accrual_date, gross_amount, platform_amount, client_amount, currency, paid_out")
    .order("accrual_date", { ascending: false })
    .limit(500);
  if (error && error.code !== "PGRST205") {
    return NextResponse.json({ error: { code: "server_error", message: error.message } }, { status: 500 });
  }
  return NextResponse.json({ accruals: data ?? [] });
}
