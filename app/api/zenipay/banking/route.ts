export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = "https://mjkvkibdfteonvlahtag.supabase.co";
  const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qa3ZraWJkZnRlb252bGFodGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDgwMjYsImV4cCI6MjA5MDAyNDAyNn0.yRUCBzFEDWaM8aXBTu4BmkdX9RdJPGYV_ZJBeG7DD4";
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
