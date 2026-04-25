// POST /api/v1/internal/sync-bank-balances
//
// Every-4-hour cron. Walks every active zenipay_bank_connections row
// with an mx_user_guid + mx_account_guid, re-reads the balance from
// MX, updates balance_synced / balance_synced_at. No throttle —
// connections are usually well under 1k rows.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { isMXEnabled, syncBalance } from "@/lib/mx/mx-client";

function authorized(req: NextRequest): boolean {
  const accepted = [
    process.env.INTERNAL_CRON_SECRET,
    process.env.YIELD_CRON_SECRET,
    process.env.CRON_SECRET,
  ].filter(Boolean) as string[];
  if (accepted.length === 0) return false;
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.replace(/^Bearer\s+/i, "");
  const got = req.headers.get("x-internal-cron-secret") ?? bearer;
  return !!got && accepted.includes(got);
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isMXEnabled()) return NextResponse.json({ skipped: true, reason: "mx_disabled" });

  const db = getSupabaseAdmin();
  const { data: rows } = await db
    .from("zenipay_bank_connections")
    .select("id, mx_user_guid, mx_account_guid")
    .eq("status", "active")
    .eq("provider", "mx")
    .not("mx_user_guid", "is", null)
    .not("mx_account_guid", "is", null);

  const now = new Date().toISOString();
  let synced = 0;
  let errors = 0;

  for (const r of (rows ?? []) as Array<{ id: string; mx_user_guid: string; mx_account_guid: string }>) {
    try {
      const result = await syncBalance(r.mx_user_guid, r.mx_account_guid);
      if (!result) { errors += 1; continue; }
      await db.from("zenipay_bank_connections")
        .update({ balance_synced: result.balance, balance_synced_at: now })
        .eq("id", r.id);
      synced += 1;
    } catch {
      errors += 1;
    }
  }

  return NextResponse.json({ synced, errors, total: rows?.length ?? 0 });
}
