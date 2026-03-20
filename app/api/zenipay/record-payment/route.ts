export const dynamic = "force-dynamic";

/**
 * ZeniPay — Record Payment
 * POST — called when a client completes payment on /pay/[id]
 *        Finds the merchant who owns the pay link and adds the
 *        transaction to their merchant_data in Supabase.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSupabase(): any {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const { pay_link_id, amount, currency, description, customer_name, card_last4 } = await req.json();
    if (!pay_link_id) return NextResponse.json({ error: "Missing pay_link_id" }, { status: 400 });

    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ ok: true, note: "No DB" });

    // Find the pay link to get the merchant_id
    const { data: link } = await supabase
      .from("zenipay_pay_links")
      .select("merchant_id")
      .eq("id", pay_link_id)
      .single();

    const merchantId = link?.merchant_id;
    if (!merchantId) return NextResponse.json({ ok: true, note: "No merchant linked" });

    // Load merchant's current data
    const { data: merchantRow } = await supabase
      .from("zenipay_merchants")
      .select("merchant_data")
      .eq("id", merchantId)
      .single();

    const existing = merchantRow?.merchant_data || {};
    const existingTxns: unknown[] = existing.transactions || [];

    const txn = {
      id: `TXN-${Date.now().toString(36).toUpperCase()}`,
      pay_link_id,
      amount: parseFloat(String(amount)),
      currency: currency || "USD",
      description: description || "",
      customer_name: customer_name || "",
      card_last4: card_last4 || "",
      status: "completed",
      createdAt: new Date().toISOString(),
    };

    // Add transaction + update pay link uses count
    await supabase
      .from("zenipay_merchants")
      .update({
        merchant_data: { ...existing, transactions: [txn, ...existingTxns] },
        updated_at: new Date().toISOString(),
      })
      .eq("id", merchantId);

    // Mark pay link as used
    await supabase
      .from("zenipay_pay_links")
      .update({ uses: (link?.uses || 0) + 1, updated_at: new Date().toISOString() })
      .eq("id", pay_link_id);

    return NextResponse.json({ ok: true, txn });
  } catch (err) {
    console.error("[record-payment] Error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
