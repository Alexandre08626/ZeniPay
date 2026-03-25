export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { processFinixPayment } from "@/modules/zenipay/gateways/finix";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSupabase(): any {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const key = serviceKey || anonKey;

  console.log("[Supabase] Connection details:", {
    url: url ? `${url.substring(0, 30)}...` : "MISSING",
    usingServiceRole: !!serviceKey,
    usingAnonKey: !serviceKey && !!anonKey,
    keyType: serviceKey ? "SERVICE_ROLE" : (anonKey ? "ANON" : "NONE"),
  });

  if (!url || !key) {
    console.error("[Supabase] Missing credentials!", { url: !!url, key: !!key });
    return null;
  }
  return createClient(url, key);
}

/**
 * Finix Payment Processing Endpoint
 *
 * POST /api/zenipay/finix/process-payment
 *
 * Processes a real payment through Finix gateway:
 * 1. Validates card details
 * 2. Tokenizes card via Finix
 * 3. Creates transfer (charge)
 * 4. Records payment in zenipay_payments
 * 5. Auto-generates invoice on success
 * 6. Updates merchant stats
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      pay_link_id,
      amount,
      currency = "USD",
      description,
      customer_name,
      cardNumber,
      expiryMonth,
      expiryYear,
      cvc,
      postalCode,
    } = body;

    // Validate required fields
    if (!pay_link_id || !amount || !cardNumber || !expiryMonth || !expiryYear || !cvc || !customer_name) {
      return NextResponse.json(
        { error: "Missing required fields", required: ["pay_link_id", "amount", "cardNumber", "expiryMonth", "expiryYear", "cvc", "customer_name"] },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
    }

    const now = new Date().toISOString();
    const paymentId = `ZNV-${Date.now().toString(36).toUpperCase()}`;
    const amountNum = parseFloat(String(amount));

    // ─── 1. PROCESS PAYMENT THROUGH FINIX ────────────────────────────────
    let finixResult;
    try {
      finixResult = await processFinixPayment({
        cardNumber,
        expiryMonth,
        expiryYear,
        cvc,
        cardholderName: customer_name,
        postalCode: postalCode || "00000",
        amount: amountNum,
        currency,
        description: description || `Payment ${paymentId}`,
        paymentId,
      });
    } catch (err: unknown) {
      console.error("[Finix] Payment processing error:", err);
      return NextResponse.json(
        {
          error: "Payment processing failed",
          message: err instanceof Error ? err.message : String(err),
          paymentId,
        },
        { status: 402 }
      );
    }

    if (!finixResult.success) {
      return NextResponse.json(
        {
          error: "Payment declined",
          state: finixResult.state,
          paymentId,
        },
        { status: 402 }
      );
    }

    // ─── 2. RECORD PAYMENT IN DATABASE ───────────────────────────────────
    console.log("[DB] BEFORE INSERT zenipay_payments:", {
      paymentId,
      amount: amountNum,
      customer: customer_name,
      status: finixResult.state,
    });

    // Insert core fields first, then update with card details to bypass schema cache
    const { data: insertedPayment, error: payErr } = await supabase.from("zenipay_payments").insert({
      id: paymentId,
      amount: amountNum,
      currency,
      description: description || "",
      customer_name: customer_name || "",
      status: finixResult.state === "SUCCEEDED" ? "succeeded" : "pending",
      gateway: "finix",
      gateway_transfer_id: finixResult.transferId,
      created_at: now,
      updated_at: now,
    }).select();

    console.log("[DB] AFTER INSERT zenipay_payments:", {
      success: !payErr,
      error: payErr ? JSON.stringify(payErr) : null,
      insertedData: insertedPayment,
    });

    // Update card details separately (these columns might be cached)
    if (!payErr) {
      console.log("[DB] BEFORE UPDATE card details for:", paymentId);
      const { error: updateErr } = await supabase.from("zenipay_payments").update({
        gateway_instrument_id: finixResult.instrumentId,
        card_brand: finixResult.brand,
        card_last4: finixResult.last4,
      }).eq("id", paymentId);
      console.log("[DB] AFTER UPDATE card details:", { success: !updateErr, error: updateErr });
    }

    if (payErr) {
      console.error("[Finix] Payment record error:", payErr);
      // Payment succeeded but DB failed - log for manual reconciliation
      return NextResponse.json({
        warning: "Payment succeeded but record failed",
        paymentId,
        transferId: finixResult.transferId,
        error: payErr.message,
      });
    }

    // ─── 3. FIND MERCHANT ────────────────────────────────────────────────
    let merchantId: string | null = null;
    const { data: link } = await supabase
      .from("zenipay_pay_links")
      .select("merchant_id, uses")
      .eq("id", pay_link_id)
      .single();

    merchantId = link?.merchant_id || null;

    if (!merchantId) {
      const { data: all } = await supabase.from("zenipay_merchants").select("id, merchant_data");
      for (const m of (all || [])) {
        if ((m.merchant_data?.payLinks || []).some((l: { id: string }) => l.id === pay_link_id)) {
          merchantId = m.id;
          break;
        }
      }
    }

    // ─── 4. CREATE INVOICE (only if payment succeeded) ──────────────────
    if (finixResult.state === "SUCCEEDED") {
      const invoiceId = `INV-${paymentId}`;

      console.log("[DB] BEFORE INSERT zenipay_invoices:", { invoiceId, paymentId });

      const { data: invoiceData, error: invoiceErr } = await supabase.from("zenipay_invoices").insert({
        id: invoiceId,
        payment_id: paymentId,
        booking_id: `BK-${paymentId}`,
        customer_name: customer_name || "Client",
        customer_email: "",
        items: JSON.stringify([{
          description: description || pay_link_id,
          qty: 1,
          unit_price: amountNum,
          total: amountNum,
        }]),
        subtotal: amountNum,
        tax: 0,
        total: amountNum,
        currency,
        status: "paid",
        paid_at: now,
        notes: `ZeniPay Payment — ${paymentId} | Finix: ${finixResult.transferId}`,
        created_at: now,
        updated_at: now,
      }).select();

      console.log("[DB] AFTER INSERT zenipay_invoices:", {
        success: !invoiceErr,
        error: invoiceErr ? JSON.stringify(invoiceErr) : null,
        invoiceData,
      });

      if (invoiceErr) {
        console.error("[Finix] Invoice creation error:", invoiceErr);
      } else {
        console.log(`[Finix] Created invoice ${invoiceId}`);
      }
    }

    // ─── 5. UPDATE MERCHANT STATS ────────────────────────────────────────
    if (merchantId && finixResult.state === "SUCCEEDED") {
      const { data: merchant } = await supabase
        .from("zenipay_merchants")
        .select("merchant_data, volume, tx_count, balance")
        .eq("id", merchantId)
        .single();

      const md = merchant?.merchant_data || {};

      const txn = {
        id: paymentId,
        pay_link_id,
        amount: amountNum,
        currency,
        description: description || "",
        customer_name: customer_name || "",
        card_last4: finixResult.last4,
        card_brand: finixResult.brand,
        status: "succeeded",
        gateway: "finix",
        transfer_id: finixResult.transferId,
        createdAt: now,
      };

      await supabase.from("zenipay_merchants").update({
        merchant_data: {
          ...md,
          transactions: [txn, ...(md.transactions || [])],
        },
        balance: (merchant?.balance || 0) + amountNum,
        volume: (merchant?.volume || 0) + amountNum,
        tx_count: (merchant?.tx_count || 0) + 1,
        updated_at: now,
      }).eq("id", merchantId);

      // Update ledger
      await supabase.from("zenipay_ledger").insert({
        id: `led_${Date.now()}`,
        payment_id: paymentId,
        event_type: "customer_payment",
        wallet_type: "platform",
        direction: "credit",
        amount: amountNum,
        currency,
        reference: paymentId,
        note: `Finix payment: ${description || pay_link_id}`,
        created_at: now,
      }).then(() => {}).catch(() => {});

      // Mark pay link used
      await supabase.from("zenipay_pay_links")
        .update({ uses: (link?.uses || 0) + 1, updated_at: now })
        .eq("id", pay_link_id);
    }

    // ─── 6. RETURN SUCCESS ───────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      paymentId,
      transferId: finixResult.transferId,
      state: finixResult.state,
      amount: amountNum,
      currency,
      card: {
        brand: finixResult.brand,
        last4: finixResult.last4,
      },
    });

  } catch (err) {
    console.error("[Finix] Fatal error:", err);
    return NextResponse.json(
      { error: "Internal server error", message: String(err) },
      { status: 500 }
    );
  }
}
