export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSupabase(): any {
  const url = "https://mjkvkibdfteonvlahtag.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qa3ZraWJkZnRlb252bGFodGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDgwMjYsImV4cCI6MjA5MDAyNDAyNn0.yRUCBzFEDWaM8aXBTu4BmkdX9RdJPGYV_ZJBeG7DD4";
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const { pay_link_id, amount, currency, description, customer_name, card_last4 } = await req.json();
    if (!pay_link_id) return NextResponse.json({ error: "Missing pay_link_id" }, { status: 400 });

    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ ok: false, error: "No DB connection" });

    const now = new Date().toISOString();
    const txnId = `ZNV-${Date.now().toString(36).toUpperCase()}`;
    const amt = parseFloat(String(amount));
    const cur = currency || "USD";

    // ── 1. Insert into zenipay_payments — only safe known columns ─────────
    const { error: payErr } = await supabase.from("zenipay_payments").insert({
      id: txnId,
      amount: amt,
      currency: cur,
      description: description || "",
      customer_name: customer_name || "",
      status: "succeeded",
      created_at: now,
    });
    if (payErr) return NextResponse.json({ ok: false, step: "zenipay_payments", error: payErr.message, code: payErr.code });

    // ── 2. Find merchant ───────────────────────────────────────────────────
    let merchantId: string | null = null;
    const { data: link } = await supabase
      .from("zenipay_pay_links").select("merchant_id, uses").eq("id", pay_link_id).single();
    merchantId = link?.merchant_id || null;

    if (!merchantId) {
      const { data: all } = await supabase.from("zenipay_merchants").select("id, merchant_data");
      for (const m of (all || [])) {
        if ((m.merchant_data?.payLinks || []).some((l: { id: string }) => l.id === pay_link_id)) {
          merchantId = m.id; break;
        }
      }
    }

    if (merchantId) {
      const { data: merchant } = await supabase
        .from("zenipay_merchants").select("merchant_data, volume, tx_count, balance").eq("id", merchantId).single();

      const md = merchant?.merchant_data || {};

      const txn = {
        id: txnId, pay_link_id, amount: amt, currency: cur,
        description: description || "", customer_name: customer_name || "",
        card_last4: card_last4 || "", status: "succeeded", createdAt: now,
      };

      const invoiceId = `INV-${txnId}`;
      const invoice = {
        id: invoiceId,
        client: customer_name || "Client",
        email: "",
        booking: description || pay_link_id,
        description: description || pay_link_id,
        amount: amt, currency: cur,
        status: "paid",
        date: now.split("T")[0],
        dueDate: now.split("T")[0],
        createdAt: now,
        items: [{ desc: description || pay_link_id, qty: 1, price: amt }],
      };

      // ── 3. Create invoice in zenipay_invoices table ───────────────────
      await supabase.from("zenipay_invoices").insert({
        id: invoiceId,
        payment_id: txnId,
        booking_id: `BK-${txnId}`,
        customer_name: customer_name || "Client",
        customer_email: "",
        items: JSON.stringify([{ description: description || pay_link_id, qty: 1, unit_price: amt, total: amt }]),
        subtotal: amt,
        tax: 0,
        total: amt,
        currency: cur,
        status: "paid",
        paid_at: now,
        notes: `ZeniPay Payment — ${txnId}`,
        created_at: now,
        updated_at: now,
      });

      // ── 4. Update merchant: transactions + invoice + balance + volume ───
      const { error: updErr } = await supabase.from("zenipay_merchants").update({
        merchant_data: {
          ...md,
          transactions: [txn, ...(md.transactions || [])],
          invoices: [invoice, ...(md.invoices || [])],
        },
        balance:   (merchant?.balance   || 0) + amt,
        volume:    (merchant?.volume    || 0) + amt,
        tx_count:  (merchant?.tx_count  || 0) + 1,
        updated_at: now,
      }).eq("id", merchantId);
      if (updErr) console.error("[record-payment] merchant update:", updErr.message);

      // ── 5. Update ledger (wallets/banking) ────────────────────────────
      await supabase.from("zenipay_ledger").insert({
        id: `led_${Date.now()}`,
        payment_id: txnId,
        event_type: "customer_payment",
        wallet_type: "platform",
        direction: "credit",
        amount: amt,
        currency: cur,
        reference: txnId,
        note: `Payment: ${description || pay_link_id}`,
        created_at: now,
      });

      // ── 6. Mark pay link used ─────────────────────────────────────────
      await supabase.from("zenipay_pay_links")
        .update({ uses: (link?.uses || 0) + 1, updated_at: now }).eq("id", pay_link_id);
    }

    return NextResponse.json({ ok: true, id: txnId });
  } catch (err) {
    console.error("[record-payment] Fatal:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
