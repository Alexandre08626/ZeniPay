export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getWalletBalances } from "../../../../modules/zenipay/services/ledger";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSupabase(): any {
  const url = "https://mjkvkibdfteonvlahtag.supabase.co";
  const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qa3ZraWJkZnRlb252bGFodGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDgwMjYsImV4cCI6MjA5MDAyNDAyNn0.yRUCBzFEDWaM8aXBTu4BmkbdX9RdJPGYV_ZJBeG7DD4";
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const merchant_id = req.nextUrl.searchParams.get("merchant_id");

    const wallets = await getWalletBalances(merchant_id || undefined);

    let stats = { total_revenue: 0, total_payments: 0, succeeded_payments: 0, failed_payments: 0, pending_payments: 0, refunded_payments: 0, success_rate: 0 };
    let recentTransactions: unknown[] = [];

    if (supabase) {
      // ── Read from zenipay_payments table ───
      // NOTE: Do NOT filter by merchant_id via PostgREST .eq() — the column was
      // added via ALTER TABLE and PostgREST schema cache may not see it (PGRST204).
      // Instead, fetch all and filter in JS.
      const { data: allPays } = await supabase
        .from("zenipay_payments")
        .select("id, amount, status, created_at, customer_name, currency, description, merchant_id") as {
          data: Array<{ id: string; amount: number; status: string; created_at: string; customer_name: string; currency: string; description: string; merchant_id: string }> | null
        };
      const tablePays = merchant_id
        ? (allPays || []).filter(p => p.merchant_id === merchant_id)
        : allPays;

      // ── Read from merchant_data.transactions (ZeniPay /pay/[id] payments) ─
      let mdQuery = supabase.from("zenipay_merchants").select("merchant_data");
      if (merchant_id) mdQuery = mdQuery.eq("id", merchant_id);
      const { data: merchants } = await mdQuery;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mdTxns: any[] = [];
      for (const m of (merchants || [])) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const txns: any[] = Array.isArray(m.merchant_data?.transactions) ? m.merchant_data.transactions : (typeof m.merchant_data === "string" ? JSON.parse(m.merchant_data)?.transactions || [] : []);
        for (const t of txns) mdTxns.push(t);
      }

      // ── Merge both sources, deduplicate by id ─────────────────────────
      const existingIds = new Set((tablePays || []).map(p => p.id));
      const merged = [
        ...(tablePays || []).map(p => ({ id: p.id, amount: Number(p.amount), status: p.status, created_at: p.created_at, customer_name: p.customer_name || "—", currency: p.currency || "USD", description: p.description || "" })),
        ...mdTxns.filter(t => !existingIds.has(t.id)).map(t => ({ id: t.id, amount: Number(t.amount), status: t.status || "succeeded", created_at: t.createdAt, customer_name: t.customer_name || "—", currency: t.currency || "USD", description: t.description || "" })),
      ];

      if (merged.length > 0) {
        const succeeded = merged.filter(p => p.status === "succeeded");
        const failed    = merged.filter(p => p.status === "failed");
        const pending   = merged.filter(p => p.status === "pending");
        const refunded  = merged.filter(p => p.status === "refunded");
        stats = {
          total_revenue:      succeeded.reduce((s, p) => s + p.amount, 0),
          total_payments:     merged.length,
          succeeded_payments: succeeded.length,
          failed_payments:    failed.length,
          pending_payments:   pending.length,
          refunded_payments:  refunded.length,
          success_rate:       Math.round((succeeded.length / merged.length) * 100),
        };
        recentTransactions = merged
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 50)
          .map(p => ({ id: p.id, customer: p.customer_name, amount: p.amount, currency: p.currency, status: p.status, description: p.description, date: p.created_at, gateway: "ZeniPay" }));
      }

      // Payouts — also filter in JS to avoid PGRST204
      const { data: allPayouts } = await supabase.from("zenipay_payouts").select("*").order("created_at", { ascending: false }).limit(50);
      const payouts = merchant_id
        ? (allPayouts || []).filter((p: { merchant_id?: string }) => p.merchant_id === merchant_id).slice(0, 10)
        : (allPayouts || []).slice(0, 10);

      // Invoices — also filter in JS to avoid PGRST204
      const { data: allTableInv } = await supabase.from("zenipay_invoices").select("*").order("created_at", { ascending: false }).limit(50);
      const tableInv = merchant_id
        ? (allTableInv || []).filter((inv: { merchant_id?: string }) => inv.merchant_id === merchant_id).slice(0, 20)
        : (allTableInv || []).slice(0, 20);
      const mdInvoices: unknown[] = [];
      for (const m of (merchants || [])) {
        for (const inv of (m.merchant_data?.invoices || [])) mdInvoices.push(inv);
      }
      const allInvoices = [...(tableInv || []), ...mdInvoices].slice(0, 20);

      return NextResponse.json({
        wallets, stats,
        recent_transactions: recentTransactions,
        recent_payouts: payouts || [],
        recent_invoices: allInvoices,
        mode: "live", gateway: "ZeniPay",
        env: process.env.TILLED_ENV || "sandbox",
      });
    }

    return NextResponse.json({ wallets, stats, recent_transactions: [], recent_payouts: [], recent_invoices: [], mode: "live", gateway: "ZeniPay", env: "sandbox" });

  } catch (err) {
    console.error("[ZeniPay Stats]", err);
    return NextResponse.json({ error: "Stats unavailable", wallets: null, stats: null }, { status: 500 });
  }
}
