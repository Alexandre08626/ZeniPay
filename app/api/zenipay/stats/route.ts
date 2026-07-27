export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getWalletBalances } from "../../../../modules/zenipay/services/ledger";
import { pgrest } from "../../../../modules/zenipay/services/supabase";
import { requireZpSession, resolveMerchantId } from "@/lib/auth/zp-session";

export async function GET(req: NextRequest) {
  try {
    const session = await requireZpSession(req);
    if (session instanceof NextResponse) return session;
    const r = resolveMerchantId(session, req.nextUrl.searchParams.get("merchant_id"));
    if (r instanceof NextResponse) return r;
    const merchant_id: string = r;
    const wallets = await getWalletBalances(merchant_id);

    // ─── 1. Read merchant data from JSONB (best-effort) ─────────────────
    let merchantBalance = 0;
    let merchantTxCount = 0;
    let sandboxKey = "";
    let sandboxSecret = "";
    let liveKey = "";
    try {
      if (merchant_id) {
        const mData = await pgrest(`zenipay_merchants?id=eq.${encodeURIComponent(merchant_id)}&select=merchant_data,sandbox_key,sandbox_secret,live_key`) as { merchant_data?: Record<string, unknown>; sandbox_key?: string; sandbox_secret?: string; live_key?: string }[];
        if (mData[0]) {
          const md = mData[0].merchant_data || {};
          merchantBalance = Number(md.balance) || 0;
          merchantTxCount = Number(md.tx_count) || 0;
          sandboxKey = mData[0].sandbox_key || "";
          sandboxSecret = mData[0].sandbox_secret || "";
          liveKey = mData[0].live_key || "";
        }
      }
    } catch { /* merchant table not available — use defaults */ }

    // ─── 2. Read ALL payments (best-effort) ────────────────────────────
    let allPays: unknown[] = [];
    try {
      allPays = await pgrest(`zenipay_payments?select=id,amount,status,created_at,customer_name,customer_email,currency,description,merchant_id,card_brand,card_last4,gateway,payment_link_id&order=created_at.desc&limit=500`);
    } catch { /* payments table not available */ }
    const tablePaysRaw = allPays as Array<Record<string, unknown>>;

    // Filter by merchant_id in JS
    const tablePays = merchant_id
      ? tablePaysRaw.filter(p =>
          String(p.merchant_id) === merchant_id ||
          (merchant_id === "zeniva-001" && (!p.merchant_id || p.merchant_id === "default_merchant" || p.merchant_id === "unknown"))
        )
      : tablePaysRaw;

    // ─── 3. Compute stats from REAL data ────────────────────────────────
    const succeeded = tablePays.filter(p => String(p.status) === "succeeded");
    const paymentRevenue = succeeded.reduce((s, p) => s + Number(p.amount || 0), 0);
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
      id: String(p.id || ""), customer: String(p.customer_name || "—"), amount: Number(p.amount || 0),
      currency: String(p.currency || "CAD"), status: String(p.status || ""),
      description: String(p.description || ""), date: String(p.created_at || ""),
      gateway: "ZeniPay", card_brand: String(p.card_brand || ""), card_last4: String(p.card_last4 || ""),
    }));

    // ─── 5. Payouts (best-effort — table may not exist) ────────────────
    let payouts: { merchant_id?: string }[] = [];
    try {
      const allPayouts = await pgrest(`zenipay_payouts?order=created_at.desc&limit=50`) as { merchant_id?: string }[];
      payouts = merchant_id
        ? allPayouts.filter(p => p.merchant_id === merchant_id).slice(0, 10)
        : allPayouts.slice(0, 10);
    } catch { /* table not available — skip */ }

    // ─── 6. Invoices (best-effort — table may not exist) ───────────────
    let invoices: { merchant_id?: string }[] = [];
    try {
      const allInvoices = await pgrest(`zenipay_invoices?order=created_at.desc&limit=100`) as { merchant_id?: string }[];
      invoices = merchant_id
        ? allInvoices.filter(inv => inv.merchant_id === merchant_id).slice(0, 20)
        : allInvoices.slice(0, 20);
    } catch { /* table not available — skip */ }

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
