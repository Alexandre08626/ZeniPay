export const dynamic = "force-dynamic";

/**
 * Merchant Accounting Summary
 * GET /api/zenipay/accounting/summary?merchant_id=...
 *
 * Returns the MERCHANT's own bookkeeping data (revenue, expenses, P&L).
 * This is NOT ZeniPay platform accounting — it's each merchant's financial view.
 */

import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "../../../../../modules/zenipay/services/supabase";

const EMPTY_RESPONSE = {
  totalRevenue: 0,
  totalExpenses: 0,
  netProfit: 0,
  zenipayFees: 0,
  txCount: 0,
  journalEntries: [] as unknown[],
  chartOfAccounts: [] as { code: string; name: string; balance: number; type: string }[],
};

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    const merchant_id = req.nextUrl.searchParams.get("merchant_id");

    // ── 1. Payments from zenipay_payments table (filter in JS for PGRST204) ──
    const { data: allPayments } = await supabase
      .from("zenipay_payments")
      .select("id, amount, status, merchant_id, created_at, customer_name, description")
      .order("created_at", { ascending: false });

    const tablePays = merchant_id
      ? (allPayments || []).filter((p: { merchant_id?: string }) => p.merchant_id === merchant_id)
      : (allPayments || []);

    // ── 2. Payments from merchant_data.transactions (same merge as stats) ──
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mdQuery = supabase.from("zenipay_merchants").select("merchant_data");
    if (merchant_id) mdQuery = mdQuery.eq("id", merchant_id);
    const { data: merchants } = await mdQuery;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mdTxns: any[] = [];
    for (const m of (merchants || [])) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const txns: any[] = Array.isArray(m.merchant_data?.transactions)
        ? m.merchant_data.transactions
        : (typeof m.merchant_data === "string" ? JSON.parse(m.merchant_data)?.transactions || [] : []);
      for (const t of txns) mdTxns.push(t);
    }

    // ── 3. Merge both sources, deduplicate by id ──
    const existingIds = new Set((tablePays || []).map((p: { id: string }) => p.id));
    const merged = [
      ...(tablePays || []).map((p: { id: string; amount: number; status: string; created_at: string; customer_name: string; description: string }) => ({
        id: p.id, amount: Number(p.amount), status: p.status, created_at: p.created_at,
        customer_name: p.customer_name || "", description: p.description || "",
      })),
      ...mdTxns.filter((t: { id: string }) => !existingIds.has(t.id)).map((t: { id: string; amount: number; status?: string; createdAt?: string; customer_name?: string; description?: string }) => ({
        id: t.id, amount: Number(t.amount), status: t.status || "succeeded",
        created_at: t.createdAt || "", customer_name: t.customer_name || "", description: t.description || "",
      })),
    ];

    // ── 4. Calculate merchant revenue (succeeded payments) ──
    const succeeded = merged.filter(p => p.status === "succeeded");
    const totalRevenue = succeeded.reduce((s, p) => s + p.amount, 0);
    const txCount = succeeded.length;

    // ZeniPay processing fees the merchant pays: 2.9% + $0.30/tx
    const zenipayFees = totalRevenue * 0.029 + txCount * 0.30;
    const totalExpenses = zenipayFees;
    const netProfit = totalRevenue - totalExpenses;

    // ── 5. Journal entries from accounting_entries table ──
    const { data: allEntries } = await supabase
      .from("zenipay_accounting_entries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    const mergedIds = new Set(merged.map(p => p.id));
    const entries = merchant_id
      ? (allEntries || []).filter((e: { payment_id?: string }) => e.payment_id && mergedIds.has(e.payment_id))
      : (allEntries || []);

    return Response.json({
      totalRevenue,
      totalExpenses,
      netProfit,
      zenipayFees,
      txCount,
      journalEntries: entries.slice(0, 40),
      chartOfAccounts: [
        { code: "1000", name: "Business Account", balance: totalRevenue, type: "asset" },
        { code: "1200", name: "Accounts Receivable", balance: 0, type: "asset" },
        { code: "2000", name: "Payables", balance: 0, type: "liability" },
        { code: "2500", name: "Tax Payable", balance: netProfit * 0.15, type: "liability" },
        { code: "3000", name: "Retained Earnings", balance: netProfit, type: "equity" },
        { code: "4000", name: "Client Revenue", balance: totalRevenue, type: "revenue" },
        { code: "5100", name: "Processing Fees (ZeniPay)", balance: zenipayFees, type: "expense" },
      ],
    });

  } catch (err) {
    console.error("[Accounting Summary] Error:", err);
    return Response.json(EMPTY_RESPONSE);
  }
}
