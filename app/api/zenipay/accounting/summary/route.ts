export const dynamic = "force-dynamic";

/**
 * Merchant Accounting Summary
 * GET /api/zenipay/accounting/summary?merchant_id=...
 *
 * Returns the MERCHANT's own bookkeeping data (revenue, expenses, P&L).
 * This is NOT ZeniPay platform accounting — it's each merchant's financial view.
 */

import { NextRequest } from "next/server";
import { pgrest } from "../../../../../modules/zenipay/services/supabase";

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
    const merchant_id = req.nextUrl.searchParams.get("merchant_id");

    // ── 1. Payments from zenipay_payments table (via pgrest — bypass Next.js fetch cache) ──
    const paymentsPath = merchant_id
      ? `zenipay_payments?merchant_id=eq.${encodeURIComponent(merchant_id)}&select=id,amount,status,merchant_id,created_at,customer_name,description&order=created_at.desc`
      : `zenipay_payments?select=id,amount,status,merchant_id,created_at,customer_name,description&order=created_at.desc`;
    const tablePays = await pgrest(paymentsPath) as Array<{ id: string; amount: number; status: string; merchant_id?: string; created_at: string; customer_name?: string; description?: string }>;

    // ── 2. Payments from merchant_data.transactions (same merge as stats) ──
    const merchantsPath = merchant_id
      ? `zenipay_merchants?id=eq.${encodeURIComponent(merchant_id)}&select=merchant_data`
      : `zenipay_merchants?select=merchant_data`;
    const merchants = await pgrest(merchantsPath) as Array<{ merchant_data: { transactions?: unknown[] } | string }>;

    const mdTxns: Array<{ id: string; amount: number; status?: string; createdAt?: string; customer_name?: string; description?: string }> = [];
    for (const m of (merchants || [])) {
      const md = typeof m.merchant_data === "string" ? JSON.parse(m.merchant_data) : m.merchant_data;
      const txns = Array.isArray(md?.transactions) ? md.transactions : [];
      for (const t of txns) mdTxns.push(t);
    }

    // ── 3. Merge both sources, deduplicate by id ──
    const existingIds = new Set((tablePays || []).map((p: { id: string }) => p.id));
    const merged = [
      ...(tablePays || []).map(p => ({
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

    // ── 5. Journal entries from accounting_entries table (pgrest, no cache) ──
    const allEntries = await pgrest(`zenipay_accounting_entries?select=*&order=created_at.desc&limit=100`) as Array<{ payment_id?: string; [k: string]: unknown }>;

    const mergedIds = new Set(merged.map(p => p.id));
    const entries = merchant_id
      ? allEntries.filter(e => e.payment_id && mergedIds.has(e.payment_id))
      : allEntries;

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
