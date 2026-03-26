export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { processFinixPayment } from "@/modules/zenipay/gateways/finix";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const key = serviceKey || anonKey;

  if (!url || !key) {
    console.error("[Supabase] MISSING ENV VARS:", {
      hasUrl: !!url,
      hasServiceKey: !!serviceKey,
      hasAnonKey: !!anonKey,
    });
    return null;
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Finix Payment Processing Endpoint
 * POST /api/zenipay/finix/process-payment
 *
 * Flow: Validate → Finix charge → Record in zenipay_payments →
 *       Create invoice → Update merchant stats → Ledger entry
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
      customer_email,
      cardNumber,
      expiryMonth,
      expiryYear,
      cvc,
      postalCode,
    } = body;

    if (!pay_link_id || !amount || !cardNumber || !expiryMonth || !expiryYear || !cvc || !customer_name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
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
        { error: "Payment processing failed", message: err instanceof Error ? err.message : String(err), paymentId },
        { status: 402 }
      );
    }

    if (!finixResult.success) {
      return NextResponse.json(
        { error: "Payment declined", state: finixResult.state, paymentId },
        { status: 402 }
      );
    }

    // ─── 2. RECORD PAYMENT IN SUPABASE ───────────────────────────────────
    const paymentRecord = {
      id: paymentId,
      payment_link_id: pay_link_id,
      amount: amountNum,
      currency,
      description: description || "",
      customer_name: customer_name || "",
      customer_email: customer_email || "",
      status: finixResult.state === "SUCCEEDED" ? "succeeded" : "pending",
      gateway: "finix",
      gateway_transfer_id: finixResult.transferId || "",
      gateway_instrument_id: finixResult.instrumentId || "",
      card_brand: finixResult.brand || "",
      card_last4: finixResult.last4 || "",
      created_at: now,
      updated_at: now,
    };

    console.log("[DB] Inserting payment:", paymentId, "amount:", amountNum);

    const { error: payErr } = await supabase
      .from("zenipay_payments")
      .insert(paymentRecord);

    if (payErr) {
      console.error("[DB] zenipay_payments INSERT FAILED:", JSON.stringify(payErr));
      // Payment succeeded at Finix but DB failed — still return success to user
      // but flag it for reconciliation
      return NextResponse.json({
        success: true,
        warning: "Payment succeeded but database record failed — will be reconciled",
        paymentId,
        transferId: finixResult.transferId,
        state: finixResult.state,
        amount: amountNum,
        currency,
        dbError: payErr.message,
      });
    }

    console.log("[DB] Payment recorded:", paymentId);

    // ─── 3. FIND MERCHANT ────────────────────────────────────────────────
    let merchantId: string | null = null;
    let linkUses = 0;

    const { data: link } = await supabase
      .from("zenipay_pay_links")
      .select("merchant_id, uses")
      .eq("id", pay_link_id)
      .single();

    if (link) {
      merchantId = link.merchant_id;
      linkUses = link.uses || 0;
    }

    if (!merchantId) {
      const { data: allMerchants } = await supabase.from("zenipay_merchants").select("id, merchant_data");
      for (const m of (allMerchants || [])) {
        if ((m.merchant_data?.payLinks || []).some((l: { id: string }) => l.id === pay_link_id)) {
          merchantId = m.id;
          break;
        }
      }
    }

    // ─── 4. CREATE INVOICE ───────────────────────────────────────────────
    if (finixResult.state === "SUCCEEDED") {
      // Generate sequential invoice number: INV-2026-001
      const year = new Date().getFullYear();
      const { count } = await supabase
        .from("zenipay_invoices")
        .select("id", { count: "exact", head: true });
      const seq = String((count || 0) + 1).padStart(3, "0");
      const invoiceNumber = `INV-${year}-${seq}`;
      const invoiceId = `INV-${paymentId}`;

      const { error: invoiceErr } = await supabase.from("zenipay_invoices").insert({
        id: invoiceId,
        invoice_number: invoiceNumber,
        payment_id: paymentId,
        booking_id: `BK-${paymentId}`,
        customer_name: customer_name || "Client",
        customer_email: customer_email || "",
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
        notes: `ZeniPay Payment ${paymentId} | Finix: ${finixResult.transferId}`,
        created_at: now,
        updated_at: now,
      });

      if (invoiceErr) {
        console.error("[DB] Invoice insert failed:", JSON.stringify(invoiceErr));
      } else {
        console.log("[DB] Invoice created:", invoiceNumber);
      }
    }

    // ─── 5. UPDATE MERCHANT STATS ────────────────────────────────────────
    if (merchantId && finixResult.state === "SUCCEEDED") {
      try {
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
      } catch (e) {
        console.error("[DB] Merchant update failed:", e);
      }
    }

    // ─── 6. LEDGER ENTRY ─────────────────────────────────────────────────
    if (finixResult.state === "SUCCEEDED") {
      await supabase.from("zenipay_ledger").insert({
        id: `led_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        payment_id: paymentId,
        event_type: "customer_payment",
        wallet_type: "platform",
        direction: "credit",
        amount: amountNum,
        currency,
        reference: paymentId,
        note: `Finix payment: ${description || pay_link_id}`,
        created_at: now,
      });
    }

    // ─── 7. UPDATE PAY LINK USAGE ────────────────────────────────────────
    await supabase.from("zenipay_pay_links")
      .update({ uses: linkUses + 1, updated_at: now })
      .eq("id", pay_link_id);

    // ─── 8. RETURN SUCCESS ───────────────────────────────────────────────
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
