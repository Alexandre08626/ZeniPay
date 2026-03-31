export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../modules/zenipay/services/supabase";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // Credits (incoming payments)
    const { data: credits } = await supabase
      .from("zenipay_ledger")
      .select("amount")
      .eq("direction", "credit");

    const totalCredits = (credits || []).reduce((s, r) => s + Number(r.amount), 0);

    // Debits (payouts, withdrawals)
    const { data: debits } = await supabase
      .from("zenipay_ledger")
      .select("amount")
      .eq("direction", "debit");

    const totalDebits = (debits || []).reduce((s, r) => s + Number(r.amount), 0);

    return NextResponse.json({
      balance: totalCredits - totalDebits,
      credits: totalCredits,
      debits: totalDebits,
    });
  } catch (err) {
    console.error("[Banking API]", err);
    return NextResponse.json({ balance: 0, error: String(err) }, { status: 500 });
  }
}
