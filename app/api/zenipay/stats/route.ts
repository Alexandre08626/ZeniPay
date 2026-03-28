export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getWalletBalances } from "../../../../modules/zenipay/services/ledger";

function getSupabase() {
  const url = "https://mjkvkibdfteonvlahtag.supabase.co";
  const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qa3ZraWJkZnRlb252bGFodGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDgwMjYsImV4cCI6MjA5MDAyNDAyNn0.yRUCBzFEDWaM8aXBTu4BmkbdX9RdJPGYV_ZJBeG7DD4";
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const merchant_id = req.nextUrl.searchParams.get("merchant_id");
    const wallets = await getWalletBalances(merchant_id || undefined);

    // ─── 1. Read merchant balance via RPC (bypasses PostgREST cache) ────
    let merchantBalance = 0;
    let merchantTxCount = 0;
    if (merchant_id) {
      const { data: mData } = await supabase.rpc("get_merchant_balance", { mid: merchant_id });
      if (mData && mData[0]) {
        merchantBalance = Number(mData[0].balance) || 0;
        merchantTxCount = Number(mData[0].tx_count) || 0;
      }
    }

    // ─── 2. Read ALL payments via RPC (SECURITY DEFINER — sees all rows) ─
    const { data: allPays } = await supabase.rpc("get_all_payments");

    // Filter by merchant_id in JS
    const tablePays = merchant_id
      ? (allPays || []).filter((p: { merchant_id: string }) =>
          p.merchant_id === merchant_id ||
          (merchant_id === "zeniva-001" && (!p.merchant_id || p.merchant_id === "default_merchant" || p.merchant_id === "unknown"))
        )
      : allPays || [];

    // ─── 3. Compute stats from REAL payment data ────────────────────────
    const succeeded = tablePays.filter((p: { status: string }) => p.status === "succeeded");
    const failed = tablePays.filter((p: { status: string }) => p.status === "failed");
    const pending = tablePays.filter((p: { status: string }) => p.status === "pending");
    const refunded = tablePays.filter((p: { status: string }) => p.status === "refunded");
    const paymentRevenue = succeeded.reduce((s: number, p: { amount: number }) => s + Number(p.amount), 0);

    // Use the higher of merchantBalance or payment sum (handles edge cases)
    const totalRevenue = Math.max(merchantBalance, paymentRevenue);
    const totalPayments = Math.max(merchantTxCount, tablePays.length);

    const stats = {
      total_revenue: totalRevenue,
      total_payments: totalPayments,
      succeeded_payments: Math.max(succeeded.length, merchantTxCount),
      failed_payments: failed.length,
      pending_payments: pending.length,
      refunded_payments: refunded.length,
      success_rate: totalPayments > 0 ? Math.round((Math.max(succeeded.length, merchantTxCount) / totalPayments) * 100) : 0,
    };

    // ─── 4. Build recent_transactions ───────────────────────────────────
    const recentTransactions = tablePays
      .sort((a: { created_at: string }, b: { created_at: string }) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 50)
      .map((p: { id: string; customer_name: string; amount: number; currency: string; status: string; description: string; created_at: string; card_brand: string; card_last4: string }) => ({
        id: p.id, customer: p.customer_name || "—", amount: Number(p.amount),
        currency: p.currency || "USD", status: p.status,
        description: p.description || "", date: p.created_at,
        gateway: "ZeniPay", card_brand: p.card_brand || "", card_last4: p.card_last4 || "",
      }));

    // ─── 5. Payouts via RPC-safe read ───────────────────────────────────
    const { data: allPayouts } = await supabase.from("zenipay_payouts")
      .select("*").order("created_at", { ascending: false }).limit(50);
    const payouts = merchant_id
      ? (allPayouts || []).filter((p: { merchant_id?: string }) => p.merchant_id === merchant_id).slice(0, 10)
      : (allPayouts || []).slice(0, 10);

    // ─── 6. Invoices via RPC (SECURITY DEFINER) ─────────────────────────
    const { data: allInvoices } = await supabase.rpc("get_all_invoices");
    const invoices = merchant_id
      ? (allInvoices || []).filter((inv: { merchant_id?: string }) => inv.merchant_id === merchant_id).slice(0, 20)
      : (allInvoices || []).slice(0, 20);

    return NextResponse.json({
      wallets, stats,
      merchant_balance: totalRevenue,
      recent_transactions: recentTransactions,
      recent_payouts: payouts,
      recent_invoices: invoices,
      mode: "live", gateway: "ZeniPay",
      env: process.env.FINIX_ENV || "sandbox",
    });

  } catch (err) {
    console.error("[ZeniPay Stats]", err);
    return NextResponse.json({ error: "Stats unavailable", wallets: null, stats: null }, { status: 500 });
  }
}
