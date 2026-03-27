export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

const FINIX_BASE = process.env.FINIX_ENV === "production"
  ? "https://finix.live-payments-api.com"
  : "https://finix.sandbox-payments-api.com";

function finixAuth() {
  const user = process.env.FINIX_API_USERNAME || "";
  const pass = process.env.FINIX_API_PASSWORD || "";
  return "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
}

async function finixGet(path: string) {
  const res = await fetch(`${FINIX_BASE}${path}`, {
    headers: { Authorization: finixAuth(), "Content-Type": "application/json", "Finix-Version": "2022-02-01" },
  });
  return res.ok ? await res.json() : null;
}

export async function GET(req: NextRequest) {
  try {
    const merchantId = process.env.FINIX_MERCHANT_ID || "MUcTenaz57m9JrwwRZwpSfDc";

    // Fetch settlements
    const settlementData = await finixGet(`/settlements?merchant_id=${merchantId}&limit=20&sort=created_at,desc`);
    const settlements = settlementData?._embedded?.settlements || [];

    // Fetch recent transfers with fees (platform fees = cashback)
    const transferData = await finixGet(`/transfers?merchant_id=${merchantId}&limit=50&sort=created_at,desc`);
    const allTransfers = transferData?._embedded?.transfers || [];

    // Separate: DEBIT = customer charges, FEE/PLATFORM_FEE = cashback, CREDIT = payouts
    const debits = allTransfers.filter((t: Record<string,unknown>) => t.type === "DEBIT" && t.state === "SUCCEEDED");
    const platformFees = allTransfers.filter((t: Record<string,unknown>) => t.type === "FEE" && t.subtype === "PLATFORM_FEE");
    const payouts = allTransfers.filter((t: Record<string,unknown>) => t.type === "CREDIT" && t.subtype === "SETTLEMENT_PLATFORM");

    // Calculate totals
    const totalVolume = debits.reduce((s: number, t: Record<string,unknown>) => s + Number(t.amount || 0), 0);
    const totalPlatformFees = platformFees.reduce((s: number, t: Record<string,unknown>) => s + Number(t.amount || 0), 0);
    const totalPayouts = payouts.reduce((s: number, t: Record<string,unknown>) => s + Number(t.amount || 0), 0);

    // Per-settlement breakdown
    const settlementBreakdown = settlements.map((s: Record<string,unknown>) => ({
      id: s.id,
      status: s.status,
      total_amount: Number(s.total_amount || 0) / 100,
      total_fees: Number(s.total_fees || 0) / 100,
      net_amount: Number(s.net_amount || 0) / 100,
      cashback_to_platform: Number(s.total_fees || 0) / 100,
      period_start: s.window_start_time,
      period_end: s.window_end_time,
      created_at: s.created_at,
    }));

    // Per-transaction fee breakdown (last 20 debits)
    const transactionFees = debits.slice(0, 20).map((d: Record<string,unknown>) => {
      const amt = Number(d.amount || 0) / 100;
      const grossFee = amt * 0.029 + 0.30;
      const cashback = grossFee * 0.90;
      const netFee = grossFee - cashback;
      return {
        transfer_id: d.id,
        amount: amt,
        tags: d.tags,
        created_at: d.created_at,
        gross_fee: Math.round(grossFee * 100) / 100,
        cashback_90pct: Math.round(cashback * 100) / 100,
        net_fee_merchant: Math.round(netFee * 100) / 100,
      };
    });

    return NextResponse.json({
      summary: {
        total_volume_cents: totalVolume,
        total_volume: totalVolume / 100,
        total_platform_fees_cents: totalPlatformFees,
        total_platform_fees: totalPlatformFees / 100,
        total_cashback_payouts_cents: totalPayouts,
        total_cashback_payouts: totalPayouts / 100,
        cashback_rate: "90% of markup",
        settlements_count: settlements.length,
        transactions_count: debits.length,
      },
      settlements: settlementBreakdown,
      transaction_fees: transactionFees,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
