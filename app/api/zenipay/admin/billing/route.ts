export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../modules/zenipay/services/supabase";

/* ── GET — list all billing invoices ── */
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("zenipay_billing")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ invoices: data ?? [] });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

/* ── POST — generate a new billing invoice ── */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { merchant_id, merchant_name, period_start, period_end } = body;

    if (!merchant_id || !merchant_name || !period_start || !period_end) {
      return NextResponse.json(
        { error: "merchant_id, merchant_name, period_start, and period_end are required" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    /* ── Fetch ALL payments then filter in JS (PGRST204 workaround) ── */
    const { data: allPayments, error: payErr } = await supabase
      .from("zenipay_payments")
      .select("id, amount, status, created_at, merchant_id");

    if (payErr) {
      return NextResponse.json({ error: payErr.message }, { status: 500 });
    }

    const startDate = new Date(period_start);
    const endDate = new Date(period_end);
    endDate.setHours(23, 59, 59, 999);

    const filtered = (allPayments ?? []).filter(
      (p: { merchant_id: string; status: string; created_at: string }) => {
        if (p.merchant_id !== merchant_id) return false;
        if (p.status !== "succeeded") return false;
        const created = new Date(p.created_at);
        return created >= startDate && created <= endDate;
      },
    );

    const transactionsCount = filtered.length;
    const transactionsVolume = filtered.reduce(
      (sum: number, p: { amount: number }) => sum + (p.amount ?? 0),
      0,
    );

    /* ── Fee calculation ── */
    const feePercentage = 2.9;
    const feePerTransaction = 0.3;
    const platformFee = 97;
    const totalFees =
      transactionsVolume * (feePercentage / 100) +
      feePerTransaction * transactionsCount +
      platformFee;

    /* ── Sequential invoice number: BILL-YYYY-NNN ── */
    const { data: existingInvoices } = await supabase
      .from("zenipay_billing")
      .select("invoice_number")
      .order("created_at", { ascending: false });

    const year = new Date().getFullYear();
    let seq = 1;
    if (existingInvoices && existingInvoices.length > 0) {
      const nums = existingInvoices
        .map((inv: { invoice_number: string }) => {
          const match = inv.invoice_number?.match(/BILL-\d{4}-(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter((n: number) => n > 0);
      if (nums.length > 0) {
        seq = Math.max(...nums) + 1;
      }
    }
    const invoiceNumber = `BILL-${year}-${String(seq).padStart(3, "0")}`;

    const id = `bill_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const record = {
      id,
      merchant_id,
      merchant_name,
      invoice_number: invoiceNumber,
      period_start,
      period_end,
      transactions_count: transactionsCount,
      transactions_volume: transactionsVolume,
      fee_percentage: feePercentage,
      fee_per_transaction: feePerTransaction,
      platform_fee: platformFee,
      total_fees: Math.round(totalFees * 100) / 100,
      status: "pending",
    };

    const { data: inserted, error: insErr } = await supabase
      .from("zenipay_billing")
      .insert([record])
      .select()
      .single();

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    return NextResponse.json({ invoice: inserted });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

/* ── PATCH — update billing invoice status ── */
export async function PATCH(req: NextRequest) {
  try {
    const { id, status } = await req.json();
    if (!id || !status) {
      return NextResponse.json({ error: "id and status are required" }, { status: 400 });
    }
    if (!["pending", "paid", "overdue"].includes(status)) {
      return NextResponse.json({ error: "status must be pending, paid, or overdue" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("zenipay_billing")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ invoice: data });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
