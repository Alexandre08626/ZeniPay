export const dynamic = "force-dynamic";

/**
 * ZeniPay — Record Payment
 * Called when a client completes payment on /pay/[id]
 * Does everything: transaction, wallet, invoice, accounting, analytics
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { recordPaymentReceived } from "../../../../modules/zenipay/services/ledger";

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

    const now = new Date().toISOString();
    const txnId = `ZNV-${Date.now().toString(36).toUpperCase()}`;
    const amt = parseFloat(String(amount));
    const cur = currency || "USD";

    // ── 1. Insert into zenipay_payments (Transactions tab) ────────────────
    await supabase.from("zenipay_payments").insert({
      id: txnId,
      pay_link_id,
      amount: amt,
      currency: cur,
      description: description || "",
      customer_name: customer_name || "",
      card_last4: card_last4 || "",
      status: "succeeded",
      gateway: "ZeniPay",
      created_at: now,
      updated_at: now,
    });

    // ── 2. Ledger + wallets + accounting (Banking tab) ────────────────────
    try {
      await recordPaymentReceived({ paymentId: txnId, amount: amt, currency: cur });
    } catch (e) {
      console.warn("[record-payment] ledger error (non-fatal):", e);
    }

    // ── 3. Find merchant via pay link ─────────────────────────────────────
    let merchantId: string | null = null;
    const { data: link } = await supabase
      .from("zenipay_pay_links")
      .select("merchant_id, uses")
      .eq("id", pay_link_id)
      .single();
    merchantId = link?.merchant_id || null;

    // Fallback: scan merchant_data.payLinks
    if (!merchantId) {
      const { data: allMerchants } = await supabase
        .from("zenipay_merchants")
        .select("id, merchant_data");
      for (const m of (allMerchants || [])) {
        const links: { id: string }[] = m.merchant_data?.payLinks || [];
        if (links.some((l) => l.id === pay_link_id)) { merchantId = m.id; break; }
      }
    }

    if (merchantId) {
      const { data: merchantRow } = await supabase
        .from("zenipay_merchants")
        .select("merchant_data, volume, tx_count, balance")
        .eq("id", merchantId)
        .single();

      const existing = merchantRow?.merchant_data || {};

      // ── 4. Auto-generate invoice ──────────────────────────────────────
      const invoiceId = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
      const invoice = {
        id: invoiceId,
        client: customer_name || "Client",
        booking: description || pay_link_id,
        amount: amt,
        currency: cur,
        status: "paid",
        date: now.split("T")[0],
        pay_link_id: pay_link_id,
        txn_id: txnId,
      };

      // Also insert into zenipay_invoices table
      await supabase.from("zenipay_invoices").insert({
        id: invoiceId,
        merchant_id: merchantId,
        client_name: customer_name || "Client",
        description: description || pay_link_id,
        amount: amt,
        currency: cur,
        status: "paid",
        pay_link_id,
        payment_id: txnId,
        created_at: now,
        updated_at: now,
      }).then(() => {}).catch(() => {}); // non-fatal if column missing

      const txn = {
        id: txnId, pay_link_id, amount: amt, currency: cur,
        description: description || "", customer_name: customer_name || "",
        card_last4: card_last4 || "", status: "succeeded", createdAt: now,
      };

      // ── 5. Update merchant_data (transactions + invoices) ─────────────
      await supabase
        .from("zenipay_merchants")
        .update({
          merchant_data: {
            ...existing,
            transactions: [txn, ...(existing.transactions || [])],
            invoices: [invoice, ...(existing.invoices || [])],
          },
          // ── 6. Update merchant balance + volume (Analytics/Accounting) ──
          balance: (merchantRow?.balance || 0) + amt,
          volume: (merchantRow?.volume || 0) + amt,
          tx_count: (merchantRow?.tx_count || 0) + 1,
          updated_at: now,
        })
        .eq("id", merchantId);

      // Mark pay link uses++
      await supabase
        .from("zenipay_pay_links")
        .update({ uses: (link?.uses || 0) + 1, updated_at: now })
        .eq("id", pay_link_id);
    }

    return NextResponse.json({ ok: true, id: txnId });
  } catch (err) {
    console.error("[record-payment] Error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
