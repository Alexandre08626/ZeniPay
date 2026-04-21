export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getWalletBalances } from "../../../../modules/zenipay/services/ledger";
import { pgrest } from "../../../../modules/zenipay/services/supabase";

export async function GET(req: NextRequest) {
  try {
    const merchant_id = req.nextUrl.searchParams.get("merchant_id");
    const wallets = await getWalletBalances(merchant_id || undefined);

    // ─── 1. Read merchant balance + keys directly (no cache) ─────────────
    let merchantBalance = 0;
    let merchantTxCount = 0;
    let sandboxKey = "";
    let sandboxSecret = "";
    let liveKey = "";
    if (merchant_id) {
      const mData = await pgrest(`zenipay_merchants?id=eq.${encodeURIComponent(merchant_id)}&select=balance,tx_count,sandbox_key,sandbox_secret,live_key`) as { balance: number; tx_count: number; sandbox_key?: string; sandbox_secret?: string; live_key?: string }[];
      if (mData[0]) {
        merchantBalance = Number(mData[0].balance) || 0;
        merchantTxCount = Number(mData[0].tx_count) || 0;
        sandboxKey = mData[0].sandbox_key || "";
        sandboxSecret = mData[0].sandbox_secret || "";
        liveKey = mData[0].live_key || "";
      }
    }

    // ─── 2. Read ALL payments directly (no cache) ────────────────────────
    const allPays = await pgrest(`zenipay_payments?select=id,amount,status,created_at,customer_name,customer_email,currency,description,merchant_id,card_brand,card_last4,gateway,payment_link_id&order=created_at.desc&limit=500`) as {
      id: string; amount: number; status: string; created_at: string;
      customer_name: string; customer_email: string; currency: string;
      description: string; merchant_id: string; card_brand: string;
      card_last4: string; gateway: string; payment_link_id: string;
    }[];

    // Filter by merchant_id in JS
    const tablePays = merchant_id
      ? allPays.filter(p =>
          p.merchant_id === merchant_id ||
          (merchant_id === "zeniva-001" && (!p.merchant_id || p.merchant_id === "default_merchant" || p.merchant_id === "unknown"))
        )
      : allPays;

    // ─── 3. Compute stats from REAL data ────────────────────────────────
    const succeeded = tablePays.filter(p => p.status === "succeeded");
    const paymentRevenue = succeeded.reduce((s, p) => s + Number(p.amount), 0);
    const totalRevenue = Math.max(merchantBalance, paymentRevenue);
    const totalPayments = Math.max(merchantTxCount, tablePays.length);

    const stats = {
      total_revenue: totalRevenue,
      total_payments: totalPayments,
      succeeded_payments: Math.max(succeeded.length, merchantTxCount),
      failed_payments: tablePays.filter(p => p.status === "failed").length,
      pending_payments: tablePays.filter(p => p.status === "pending").length,
      refunded_payments: tablePays.filter(p => p.status === "refunded").length,
      success_rate: totalPayments > 0 ? Math.round((Math.max(succeeded.length, merchantTxCount) / totalPayments) * 100) : 0,
    };

    // ─── 4. Build recent_transactions ───────────────────────────────────
    const recentTransactions = tablePays.slice(0, 50).map(p => ({
      id: p.id, customer: p.customer_name || "—", amount: Number(p.amount),
      currency: p.currency || "CAD", status: p.status,
      description: p.description || "", date: p.created_at,
      gateway: "ZeniPay", card_brand: p.card_brand || "", card_last4: p.card_last4 || "",
    }));

    // ─── 5. Payouts ─────────────────────────────────────────────────────
    const allPayouts = await pgrest(`zenipay_payouts?order=created_at.desc&limit=50`) as { merchant_id?: string }[];
    const payouts = merchant_id
      ? allPayouts.filter(p => p.merchant_id === merchant_id).slice(0, 10)
      : allPayouts.slice(0, 10);

    // ─── 6. Invoices ────────────────────────────────────────────────────
    const allInvoices = await pgrest(`zenipay_invoices?order=created_at.desc&limit=100`) as { merchant_id?: string }[];
    const invoices = merchant_id
      ? allInvoices.filter(inv => inv.merchant_id === merchant_id).slice(0, 20)
      : allInvoices.slice(0, 20);

    return NextResponse.json({
      wallets, stats,
      merchant_balance: totalRevenue,
      recent_transactions: recentTransactions,
      recent_payouts: payouts,
      recent_invoices: invoices,
      mode: "live", gateway: "ZeniPay",
      env: process.env.FINIX_ENV || "sandbox",
      sandboxKey, sandboxSecret, liveKey,
    });

  } catch (err) {
    console.error("[ZeniPay Stats]", err);
    return NextResponse.json({ error: "Stats unavailable", wallets: null, stats: null }, { status: 500 });
  }
}
