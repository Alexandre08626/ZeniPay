export const dynamic = "force-dynamic";

/**
 * ZeniPay — Accounting Summary
 * GET /api/zenipay/accounting/summary?merchant_id=...
 */

import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSupabase(): any {
  const url = "https://mjkvkibdfteonvlahtag.supabase.co";
  const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qa3ZraWJkZnRlb252bGFodGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDgwMjYsImV4cCI6MjA5MDAyNDAyNn0.yRUCBzFEDWaM8aXBTu4BmkbdX9RdJPGYV_ZJBeG7DD4";
  if (!url || !key) return null;
  return createClient(url, key);
}

const EMPTY_RESPONSE = {
  totalRevenue: 0,
  totalExpenses: 0,
  netProfit: 0,
  platformFees: 0,
  agentCommissions: 0,
  zenipayFees: 0,
  journalEntries: [] as unknown[],
  chartOfAccounts: [
    { code: "1000", name: "Platform Wallet", balance: 0, type: "asset" },
    { code: "4000", name: "Travel Revenue", balance: 0, type: "revenue" },
    { code: "5000", name: "Agent Commissions", balance: 0, type: "expense" },
    { code: "5100", name: "Processor Fees", balance: 0, type: "expense" },
    { code: "2000", name: "Commissions Payable", balance: 0, type: "liability" },
  ],
};

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    if (!supabase) return Response.json(EMPTY_RESPONSE);

    const merchant_id = req.nextUrl.searchParams.get("merchant_id");

    // ── Payments (source of truth for revenue) — filter in JS for PGRST204 ──
    const { data: allPayments } = await supabase
      .from("zenipay_payments")
      .select("id, amount, status, merchant_id, created_at, customer_name, description")
      .order("created_at", { ascending: false });

    const payments = merchant_id
      ? (allPayments || []).filter((p: { merchant_id?: string }) => p.merchant_id === merchant_id)
      : (allPayments || []);

    const succeededPayments = payments.filter((p: { status: string }) => p.status === "succeeded");
    const totalRevenue = succeededPayments.reduce((s: number, p: { amount: number }) => s + Number(p.amount), 0);
    const txCount = succeededPayments.length;

    // ZeniPay fees: 2.9% + $0.30/tx
    const zenipayFees = totalRevenue * 0.029 + txCount * 0.30;
    const totalExpenses = zenipayFees;
    const netProfit = totalRevenue - totalExpenses;

    // ── Accounting entries (journal) ──
    const { data: allEntries } = await supabase
      .from("zenipay_accounting_entries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    const entries = merchant_id
      ? (allEntries || []).filter((e: { payment_id?: string }) => {
          const payIds = new Set(payments.map((p: { id: string }) => p.id));
          return e.payment_id && payIds.has(e.payment_id);
        })
      : (allEntries || []);

    // ── Commissions ──
    const { data: commissions } = await supabase.from("zenipay_commissions").select("*");
    const agentCommissions = (commissions || [])
      .reduce((sum: number, c: Record<string, unknown>) => sum + Number(c.agent_amount || 0), 0);

    return Response.json({
      totalRevenue,
      totalExpenses,
      netProfit,
      platformFees: zenipayFees,
      zenipayFees,
      agentCommissions,
      journalEntries: entries.slice(0, 40),
      chartOfAccounts: [
        { code: "1000", name: "Platform Wallet", balance: totalRevenue, type: "asset" },
        { code: "1200", name: "Accounts Receivable", balance: 0, type: "asset" },
        { code: "2000", name: "Commissions Payable", balance: 0, type: "liability" },
        { code: "2500", name: "Tax Payable", balance: netProfit * 0.15, type: "liability" },
        { code: "3000", name: "Retained Earnings", balance: netProfit, type: "equity" },
        { code: "4000", name: "Travel Revenue", balance: totalRevenue, type: "revenue" },
        { code: "5000", name: "Agent Commissions", balance: agentCommissions, type: "expense" },
        { code: "5100", name: "Processor Fees (ZeniPay)", balance: zenipayFees, type: "expense" },
        { code: "7000", name: "Operating Expenses", balance: 0, type: "expense" },
      ],
    });

  } catch (err) {
    console.error("[ZeniPay Accounting Summary] Error:", err);
    return Response.json(EMPTY_RESPONSE);
  }
}
