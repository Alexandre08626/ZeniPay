export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getWalletBalances } from "../../../../modules/zenipay/services/ledger";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSupabase(): any {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET() {
  try {
    const supabase = getSupabase();

    // Wallet balances from ledger
    const wallets = await getWalletBalances();

    // Payment stats from DB
    let stats = {
      total_revenue: 0,
      total_payments: 0,
      succeeded_payments: 0,
      failed_payments: 0,
      pending_payments: 0,
      refunded_payments: 0,
      success_rate: 0,
    };

    let recentTransactions: unknown[] = [];

    if (supabase) {
      // Aggregate from payments table
      const { data: payments } = await supabase
        .from("zenipay_payments")
        .select("id, amount, status, created_at, customer_name, currency, description") as { data: Array<{ id: string; amount: number; status: string; created_at: string; customer_name: string; currency: string; description: string }> | null };

      if (payments && payments.length > 0) {
        const succeeded = payments.filter((p) => p.status === "succeeded");
        const failed = payments.filter((p) => p.status === "failed");
        const pending = payments.filter((p) => p.status === "pending");
        const refunded = payments.filter((p) => p.status === "refunded");

        stats = {
          total_revenue: succeeded.reduce((s, p) => s + Number(p.amount), 0),
          total_payments: payments.length,
          succeeded_payments: succeeded.length,
          failed_payments: failed.length,
          pending_payments: pending.length,
          refunded_payments: refunded.length,
          success_rate: payments.length > 0 ? Math.round((succeeded.length / payments.length) * 100) : 0,
        };

        recentTransactions = payments
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 20)
          .map((p) => ({
            id: p.id,
            customer: p.customer_name || "—",
            amount: Number(p.amount),
            currency: p.currency || "USD",
            status: p.status,
            description: p.description || "",
            date: p.created_at,
            gateway: "Finix",
          }));
      }

      // Recent payouts
      const { data: payouts } = await supabase
        .from("zenipay_payouts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      // Recent invoices
      const { data: invoices } = await supabase
        .from("zenipay_invoices")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      return NextResponse.json({
        wallets,
        stats,
        recent_transactions: recentTransactions,
        recent_payouts: payouts || [],
        recent_invoices: invoices || [],
        mode: "live",
        gateway: "Finix",
        env: process.env.TILLED_ENV || "sandbox",
      });
    }

    // Supabase not configured — return $0 state
    return NextResponse.json({
      wallets,
      stats,
      recent_transactions: [],
      recent_payouts: [],
      recent_invoices: [],
      mode: "live",
      gateway: "Finix",
      env: process.env.TILLED_ENV || "sandbox",
      _info: "Supabase not yet configured — all values at $0",
    });

  } catch (err) {
    console.error("[ZeniPay Stats]", err);
    return NextResponse.json(
      { error: "Stats unavailable", wallets: null, stats: null },
      { status: 500 }
    );
  }
}
