export const dynamic = "force-dynamic";

// GET /api/internal/balance-probe — read-only diagnosis of merchant balances
// vs the platform Finix account. Token-protected (ZP_DIAG_TOKEN).

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { getMerchantBalance, listSettlements } from "@/lib/finix/settlement-client";

export async function GET(req: NextRequest) {
  const token = process.env.ZP_DIAG_TOKEN || "";
  const given = req.headers.get("x-diag-token") || "";
  if (!token || given.length !== token.length || !timingSafeEqual(Buffer.from(given), Buffer.from(token))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const db = getSupabaseAdmin();
  const [accounts, audit, ledger, payments, finixBal, settlements] = await Promise.all([
    db.from("zenipay_accounts").select("id, merchant_id, account_name, balance, currency, is_primary, finix_balance_synced_at, updated_at"),
    db.from("zenipay_audit_log").select("*").eq("action", "balance.sync_finix").order("created_at", { ascending: false }).limit(15),
    db.from("zenipay_ledger").select("id, merchant_id, event_type, direction, amount, currency, reference, note, created_at").order("created_at", { ascending: false }).limit(25),
    db.from("zenipay_payments").select("id, merchant_id, amount, currency, status, created_at, metadata").order("created_at", { ascending: false }).limit(15),
    getMerchantBalance().catch((e) => ({ status: 0, data: null, err: String(e) })),
    listSettlements(10).catch((e) => ({ status: 0, data: [], err: String(e) })),
  ]);
  return NextResponse.json({
    accounts: accounts.data, accounts_err: accounts.error?.message,
    audit: audit.data, audit_err: audit.error?.message,
    ledger: ledger.data, ledger_err: ledger.error?.message,
    payments: (payments.data || []).map((p: any) => ({ id: p.id, merchant_id: p.merchant_id, amount: p.amount, currency: p.currency, status: p.status, created_at: p.created_at, ref: p.metadata?.reference, transfer: p.metadata?.gateway_transfer_id })),
    finix_balance: finixBal,
    finix_settlements: settlements,
  });
}
