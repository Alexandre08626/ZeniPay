// POST /api/v1/internal/sync-finix-balance
//
// Syncs the merchant's primary zenipay_accounts.balance with their
// Finix merchant settled-balance. Auth via x-internal-cron-secret OR
// Vercel-injected Authorization: Bearer ${CRON_SECRET}.
//
// Rules:
//   - Touch ONLY rows in zenipay_accounts where is_primary=true.
//   - Never expose Finix IDs to the client; this is plumbing.
//   - Skip rows that already have a more-recent sync (< 60s ago) so
//     manual re-runs don't thrash the table.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { getMerchantBalance } from "@/lib/finix/settlement-client";

interface AccountRow {
  id: string;
  merchant_id: string;
  balance: number | null;
  currency: string | null;
  finix_balance_synced_at: string | null;
  finix_funding_instrument_id: string | null;
}

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

  const db = getSupabaseAdmin();
  const { data: rows, error } = await db
    .from("zenipay_accounts")
    .select("id, merchant_id, balance, currency, finix_balance_synced_at, finix_funding_instrument_id")
    .eq("is_primary", true);
  if (error) {
    return NextResponse.json({ error: { code: "server_error", message: error.message } }, { status: 500 });
  }

  // The Finix merchant balance is a single value (one Finix merchant
  // identity per ZeniPay merchant in v1). The Finix client reads
  // FINIX_MERCHANT_ID from env. So we fetch ONCE and apply it to
  // every primary account, scaled-down to the matching currency.
  const finix = await getMerchantBalance();
  if (!finix.data) {
    return NextResponse.json({
      synced: 0,
      reason: "finix_unreachable",
      status: finix.status,
    });
  }

  const finixCurrency  = finix.data.currency ?? "CAD";
  const availableUnits = Number(finix.data.available_amount ?? 0) / 100;

  const now = new Date().toISOString();
  const cutoff = Date.now() - 60_000;
  let synced = 0;
  const summary: Array<{ id: string; from: number; to: number }> = [];

  for (const r of (rows ?? []) as AccountRow[]) {
    const last = r.finix_balance_synced_at ? new Date(r.finix_balance_synced_at).getTime() : 0;
    if (last >= cutoff) continue; // throttle
    const accountCurrency = (r.currency ?? "CAD").toUpperCase();
    if (accountCurrency !== finixCurrency.toUpperCase()) continue;

    const before = Number(r.balance ?? 0);
    if (Math.abs(before - availableUnits) < 0.0001) {
      // No change — still bump the timestamp so the throttle behaves.
      await db.from("zenipay_accounts").update({ finix_balance_synced_at: now }).eq("id", r.id);
      continue;
    }
    const { error: updErr } = await db
      .from("zenipay_accounts")
      .update({ balance: availableUnits, finix_balance_synced_at: now, updated_at: now })
      .eq("id", r.id);
    if (updErr) continue;
    synced += 1;
    summary.push({ id: r.id, from: before, to: availableUnits });
  }

  // Audit best-effort.
  try {
    await db.from("zenipay_audit_log").insert({
      actor_type: "system",
      actor_id: "balance_sync_cron",
      action: "balance.sync_finix",
      resource_type: "zenipay_accounts",
      resource_id: now.slice(0, 10),
      new_value: { synced, finix_available_units: availableUnits, finix_currency: finixCurrency },
      severity: "info",
    });
  } catch { /* ignore */ }

  return NextResponse.json({
    synced,
    finix_available: availableUnits,
    finix_currency: finixCurrency,
    summary,
  });
}
