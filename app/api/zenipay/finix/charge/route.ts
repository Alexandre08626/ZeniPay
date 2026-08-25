export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createTransfer } from "@/lib/finix/client";
import { getSupabaseAdmin } from "../../../../../modules/zenipay/services/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      pay_link_id, amount, currency = "USD", description,
      customer_name, customer_email, instrument_id,
    } = body;

    if (!amount || !customer_name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!instrument_id) {
      return NextResponse.json({ error: "instrument_id required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();
    const paymentId = `ZNV-${Date.now().toString(36).toUpperCase()}`;
    const amountNum = parseFloat(String(amount));
    const currencyUp = currency.toUpperCase();
    const amountCents = Math.round(amountNum * 100);

    let transferResponse;
    try {
      transferResponse = await createTransfer({
        instrumentId: instrument_id,
        amountCents,
        currency: currencyUp,
        fraudSessionId: `fs_${Date.now()}`,
        description: description || `Payment ${paymentId}`,
      });
    } catch (err: unknown) {
      return NextResponse.json({ error: "Payment processing failed", message: err instanceof Error ? err.message : String(err) }, { status: 402 });
    }

    if (transferResponse.status >= 400 || transferResponse.data?.state === "FAILED") {
      return NextResponse.json({ error: "Payment declined", state: transferResponse.data?.state, paymentId }, { status: 402 });
    }

    const data = transferResponse.data;
    const paymentStatus = data?.state === "SUCCEEDED" ? "succeeded" : "pending";
    let merchantId = data?.merchant_identity || null;
    let bankInstrumentId: string | null = null;
    try { { const pi = await fetch(`https://finix.sandbox-payments-api.com/payment_instruments/${instrument_id}`, { headers: { Authorization: "Basic " + Buffer.from((process.env.FINIX_API_USERNAME || "") + ":" + (process.env.FINIX_API_PASSWORD || "")).toString("base64"), "Content-Type": "application/json", "Finix-Version": "2022-02-01" } }); if (pi.ok) { const piData = await pi.json(); bankInstrumentId = piData?.id || null; } } } catch {}

    let merchantName = "", merchantEmail = "";
    if (!merchantId && pay_link_id) {
      const { data: link } = await supabase.from("zenipay_pay_links").select("merchant_id").eq("id", pay_link_id).single();
      merchantId = link?.merchant_id || null;
    }
    if (merchantId) {
      const { data: mRow } = await supabase.from("zenipay_merchants").select("merchant_data").eq("id", merchantId).single();
      if (mRow?.merchant_data) {
        merchantName = mRow.merchant_data.businessName || "";
        merchantEmail = mRow.merchant_data.email || "";
      }
    }

    await supabase.from("zenipay_payments").upsert({
      id: paymentId,
      payment_link_id: pay_link_id || "",
      merchant_id: merchantId || "unknown",
      amount: amountNum,
      currency: currencyUp,
      description: description || "",
      customer_name: customer_name || "",
      customer_email: customer_email || "",
      status: paymentStatus,
      gateway: "finix",
      gateway_transfer_id: data?.id || "",
      gateway_instrument_id: instrument_id,
      card_last4: bankInstrumentId || "",
      created_at: now,
      updated_at: now,
    }, { onConflict: "id" });

    if (data?.state === "SUCCEEDED" && merchantId) {
      const { data: merchant } = await supabase.from("zenipay_merchants").select("volume, tx_count, balance, merchant_data").eq("id", merchantId).single();
      const md = merchant?.merchant_data || {};
      const txn = {
        id: paymentId, pay_link_id: pay_link_id || "", amount: amountNum, currency: currencyUp,
        description: description || "", customer_name: customer_name || "",
        status: "succeeded", createdAt: now,
      };
      await supabase.from("zenipay_merchants").update({
        merchant_data: { ...md, transactions: [txn, ...(md.transactions || [])], volume: ((merchant?.volume || 0) + amountNum), tx_count: ((merchant?.tx_count || 0) + 1), balance: ((merchant?.balance || 0) + amountNum) },
      }).eq("id", merchantId);
    }

    return NextResponse.json({ success: true, paymentId, state: data?.state, transferId: data?.id, amount: amountNum, currency: currencyUp });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}