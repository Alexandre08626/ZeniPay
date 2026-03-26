export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mjkvkibdfteonvlahtag.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET() {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ balance: 0, error: "No DB" });
    }

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
