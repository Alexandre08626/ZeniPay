export const dynamic = "force-dynamic";

/**
 * ZeniPay — Accounting Summary
 * GET /api/zenipay/accounting/summary
 */

import { createClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSupabase(): any {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const EMPTY_RESPONSE = {
  totalRevenue: 0,
  totalExpenses: 0,
  netProfit: 0,
  platformFees: 0,
  agentCommissions: 0,
  journalEntries: [] as unknown[],
  chartOfAccounts: [
    { code: "1000", name: "Platform Wallet", balance: 0, type: "asset" },
    { code: "4000", name: "Travel Revenue", balance: 0, type: "revenue" },
    { code: "5000", name: "Agent Commissions", balance: 0, type: "expense" },
    { code: "5100", name: "Processor Fees", balance: 0, type: "expense" },
    { code: "2000", name: "Commissions Payable", balance: 0, type: "liability" },
  ],
};

export async function GET() {
  try {
    const supabase = getSupabase();
    if (!supabase) return Response.json(EMPTY_RESPONSE);

    // Get accounting entries
    const { data: entries } = await supabase
      .from("zenipay_accounting_entries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    // Get ledger entries
    const { data: ledger } = await supabase
      .from("zenipay_ledger")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    // Get commissions
    const { data: commissions } = await supabase
      .from("zenipay_commissions")
      .select("*");

    const accountingRows = entries || [];
    const ledgerRows = ledger || [];
    const commissionRows = commissions || [];

    // Calculate totals from ledger (event_type + direction + wallet_type are the real column names)
    const totalRevenue = ledgerRows
      .filter((l: Record<string, unknown>) => l.event_type === "customer_payment" && l.direction === "credit")
      .reduce((sum: number, l: Record<string, unknown>) => sum + Number(l.amount), 0);

    const totalRefunds = ledgerRows
      .filter((l: Record<string, unknown>) => l.event_type === "refund")
      .reduce((sum: number, l: Record<string, unknown>) => sum + Math.abs(Number(l.amount)), 0);

    const totalPayouts = ledgerRows
      .filter((l: Record<string, unknown>) => l.event_type === "payout" && l.direction === "debit")
      .reduce((sum: number, l: Record<string, unknown>) => sum + Math.abs(Number(l.amount)), 0);

    const agentCommissions = commissionRows
      .reduce((sum: number, c: Record<string, unknown>) => sum + Number(c.agent_amount || 0), 0);

    const platformFees = 0; // Could be calculated from processor fees ledger entries

    const totalExpenses = totalRefunds + totalPayouts + agentCommissions;
    const netProfit = totalRevenue - totalExpenses;

    // Chart of accounts — compute balances (wallet_type is the correct column name)
    const platformWalletBalance = ledgerRows
      .filter((l: Record<string, unknown>) => l.wallet_type === "platform")
      .reduce((sum: number, l: Record<string, unknown>) => {
        const amt = Number(l.amount);
        return sum + ((l.direction === "credit") ? amt : -amt);
      }, 0);

    const travelRevenueBalance = totalRevenue;

    const agentCommissionsBalance = agentCommissions;

    const commissionsPayable = commissionRows
      .filter((c: Record<string, unknown>) => c.status === "pending")
      .reduce((sum: number, c: Record<string, unknown>) => sum + Number(c.agent_amount || 0), 0);

    // Last 20 journal entries
    const journalEntries = accountingRows.slice(0, 20);

    return Response.json({
      totalRevenue,
      totalExpenses,
      netProfit,
      platformFees,
      agentCommissions,
      journalEntries,
      chartOfAccounts: [
        { code: "1000", name: "Platform Wallet", balance: platformWalletBalance, type: "asset" },
        { code: "4000", name: "Travel Revenue", balance: travelRevenueBalance, type: "revenue" },
        { code: "5000", name: "Agent Commissions", balance: agentCommissionsBalance, type: "expense" },
        { code: "5100", name: "Processor Fees", balance: platformFees, type: "expense" },
        { code: "2000", name: "Commissions Payable", balance: commissionsPayable, type: "liability" },
      ],
    });

  } catch (err) {
    console.error("[ZeniPay Accounting Summary] Error:", err);
    return Response.json(EMPTY_RESPONSE);
  }
}
