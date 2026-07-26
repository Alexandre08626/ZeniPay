export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../modules/zenipay/services/supabase";

export async function GET(req: NextRequest) {
  try {
    // Require admin or merchant auth
    const adminEmail = (req.headers.get("x-admin-email") || "").trim().toLowerCase();
    const merchantId = req.headers.get("x-merchant-id") || "";
    if (!adminEmail && !merchantId) {
      return NextResponse.json({ error: "Unauthorized — x-admin-email or x-merchant-id required" }, { status: 401 });
    }
    if (adminEmail && !["zenipay@zeniva.ca", "info@zeniva.ca", "alexandreblais26@gmail.com"].includes(adminEmail)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
