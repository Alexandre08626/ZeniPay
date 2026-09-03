export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getWalletBalances } from "../../../../modules/zenipay/services/ledger";
import { getSupabaseAdmin } from "../../../../modules/zenipay/services/supabase";
import { requireZpSession, resolveMerchantId } from "@/lib/auth/zp-session";

export async function GET(req: NextRequest) {
  try {
    const session = await requireZpSession(req);
    if (session instanceof NextResponse) return session;
    const r = resolveMerchantId(session, req.nextUrl.searchParams.get("merchant_id"));
    if (r instanceof NextResponse) return r;
    const merchant_id: string = r;

    const supabase = getSupabaseAdmin();
    const wallets = await getWalletBalances(merchant_id);

    // ─── 1. Merchant JSONB data ──────────────────────────────────────────
    let merchantBalance = 0;
    let merchantTxCount = 0;
    try {
      const { data: mRow } = await supabase
        .from("zenipay_merchants")
        .select("config")
        .eq("id", merchant_id)
        .maybeSingle();
      const cfg = (mRow?.config || {}) as Record<string, unknown>;
      if (cfg) {
        merchantBalance = Number(cfg.balance || 0);
        merchantTxCount = Number(cfg.tx_count || 0);
      }
    } catch { /* best-effort */ }

    // ─── 2. Payments ─────────────────────────────────────────────────────
    interface PayRow {
      id: string; amount: number; status: string; created_at: string;
      merchant_id: string; customer_name?: string; customer_email?: string;
      currency?: string; description?: string;
      gateway?: string; payment_link_id?: string;
      metadata?: Record<string, unknown> | null;
    }
    let payments: PayRow[] = [];
    let allPaymentsCount = 0;
    try {
      const { data } = await supabase
        .from("zenipay_payments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (data) payments = data as PayRow[];
    } catch { /* best-effort */ }

    // Filter by merchant_id
    const myPayments = merchant_id
      ? payments.filter(p =>
          p.merchant_id === merchant_id ||
          (merchant_id === "zeniva-001" && (!p.merchant_id || p.merchant_id === "default_merchant" || p.merchant_id === "unknown"))
        )
      : payments;

    // ─── 3. Compute stats ───────────────────────────────────────────────
    const succeeded = myPayments.filter(p => p.status === "succeeded");
    const paymentRevenue = succeeded.reduce((s, p) => s + Number(p.amount || 0), 0);
    const totalRevenue = Math.max(merchantBalance, paymentRevenue);
    const totalPayments = Math.max(merchantTxCount, myPayments.length);

    const stats = {
      total_revenue: totalRevenue,
      total_payments: totalPayments,
      succeeded_payments: Math.max(succeeded.length, merchantTxCount),
      failed_payments: myPayments.filter(p => p.status === "failed").length,
      pending_payments: myPayments.filter(p => p.status === "pending").length,
      refunded_payments: myPayments.filter(p => p.status === "refunded").length,
      success_rate: totalPayments > 0
        ? Math.round((Math.max(succeeded.length, merchantTxCount) / totalPayments) * 100)
        : 0,
    };

    // ─── 4. Recent transactions ─────────────────────────────────────────
    const recentTransactions = myPayments.slice(0, 50).map(p => {
      const md = (p.metadata || {}) as Record<string, unknown>;
      return {
        id: p.id, customer: p.customer_name || "—", amount: Number(p.amount || 0),
        currency: p.currency || "CAD", status: p.status || "",
        description: p.description || "", date: p.created_at || "",
        gateway: p.gateway || "ZeniPay",
        card_brand: (md.card_brand as string) || "", card_last4: (md.card_last4 as string) || "",
      };
    });

    // ─── 5. Payouts (best-effort) ───────────────────────────────────────
    let recentPayouts: unknown[] = [];
    try {
      const { data } = await supabase
        .from("zenipay_payouts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (data) {
        recentPayouts = merchant_id
          ? data.filter((p: Record<string, unknown>) => p.merchant_id === merchant_id).slice(0, 10)
          : data.slice(0, 10);
      }
    } catch { /* table may not exist */ }

    // ─── 6. Invoices (best-effort) ──────────────────────────────────────
    let recentInvoices: unknown[] = [];
    try {
      const { data } = await supabase
        .from("zenipay_invoices")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (data) {
        recentInvoices = merchant_id
          ? data.filter((inv: Record<string, unknown>) => inv.merchant_id === merchant_id).slice(0, 20)
          : data.slice(0, 20);
      }
    } catch { /* table may not exist */ }

    return NextResponse.json({
      wallets, stats,
      merchant_balance: totalRevenue,
      recent_transactions: recentTransactions,
      recent_payouts: recentPayouts,
      recent_invoices: recentInvoices,
      mode: "live", gateway: "ZeniPay",
      env: process.env.FINIX_ENV || "sandbox",
    });

  } catch (err) {
    console.error("[ZeniPay Stats] Fatal:", err);
    return NextResponse.json({ error: "Stats unavailable", detail: String(err) }, { status: 500 });
  }
}
