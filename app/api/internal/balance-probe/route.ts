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
  // Data inventory: what exists per merchant (counts + light fields only).
  const [invAll, payCount, merchants] = await Promise.all([
    db.from("zenipay_invoices").select("*").limit(1000),
    db.from("zenipay_payments").select("id", { count: "exact", head: true }),
    db.from("zenipay_merchants").select("id, config"),
  ]);
  const inventory = {
    invoices_error: invAll.error?.message,
    invoices: (invAll.data || []).map((i: any) => ({ id: i.id, merchant_id: i.merchant_id, status: i.status, amount: i.amount, created_at: i.created_at, desc: String(i.description || "").slice(0, 40) })),
    payments_count: payCount.count, payments_error: payCount.error?.message,
    per_merchant: (merchants.data || []).map((m: any) => ({
      id: m.id,
      transactions: Array.isArray(m.config?.transactions) ? m.config.transactions.length : 0,
      last_tx: Array.isArray(m.config?.transactions) && m.config.transactions[0] ? { at: m.config.transactions[0].createdAt, amt: m.config.transactions[0].amount, who: m.config.transactions[0].customer_name } : null,
      installments: Array.isArray(m.config?.zp_installments) ? m.config.zp_installments.length : 0,
      orvel_actions: Array.isArray(m.config?.zp_orvel_actions) ? m.config.zp_orvel_actions.length : 0,
      invoices_in_config: Array.isArray(m.config?.invoices) ? m.config.invoices.length : 0,
      payLinks: Array.isArray(m.config?.payLinks) ? m.config.payLinks.length : 0,
    })),
  };
  return NextResponse.json({
    inventory,
    accounts: accounts.data, accounts_err: accounts.error?.message,
    audit: audit.data, audit_err: audit.error?.message,
    ledger: ledger.data, ledger_err: ledger.error?.message,
    payments: (payments.data || []).map((p: any) => ({ id: p.id, merchant_id: p.merchant_id, amount: p.amount, currency: p.currency, status: p.status, created_at: p.created_at, ref: p.metadata?.reference, transfer: p.metadata?.gateway_transfer_id })),
    finix_balance: finixBal,
    finix_settlements: settlements,
  });
}
