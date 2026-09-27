export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { processFinixPaymentWithInstrument } from "@/modules/zenipay/gateways/finix";
import { getSupabaseAdmin } from "../../../../../modules/zenipay/services/supabase";
import { getActiveRate, type Currency } from "@/modules/zenipay/services/fx";
import { newRowId, createPaidInvoice, emailInvoice } from "@/lib/zenipay/auto-invoice";
import { resolvePayTarget, chargeableAmount } from "@/lib/zenipay/pay-target";
import { markInstallmentPaid } from "@/lib/zenipay/installments";

// Finix is currently only configured for CAD settlement. Any non-CAD
// pay link gets its amount converted to CAD via agents.fx_rates before
// the charge hits the processor. The original (display) amount is kept
// so the customer's invoice shows what they were quoted.
const PROCESSOR_CURRENCY: Currency = "CAD";
const SUPPORTED_CURRENCIES = new Set<Currency>(["CAD", "USD", "EUR", "USDC"]);

/**
 * Finix Payment Processing — ALL writes via Supabase JS client (no edge function)
 * POST /api/zenipay/finix/process-payment
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      pay_link_id, amount: clientAmount, description: clientDescription,
      customer_name, customer_email, instrument_id,
      fraud_session_id,
    } = body;

    if (!pay_link_id || !customer_name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!instrument_id) {
      return NextResponse.json(
        { error: "instrument_id required — tokenize card client-side via Finix.js" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // ─── 0. WHAT IS BEING PAID (server-side truth) ────────────────────────
    // Merchant, amount and currency come from the pay link / installment
    // record, NEVER from the request body (tampered amount or merchant).
    const target = await resolvePayTarget(supabase, String(pay_link_id));
    if (!target) {
      return NextResponse.json({ error: "Payment link not found" }, { status: 404 });
    }
    if (["paid", "cancelled", "expired", "inactive", "disabled"].includes(String(target.status).toLowerCase())) {
      return NextResponse.json(
        { error: target.status === "paid" ? "ALREADY_PAID" : "LINK_INACTIVE", message: target.status === "paid" ? "Ce versement est déjà payé." : "Ce lien de paiement n'est plus actif." },
        { status: 409 },
      );
    }
    const amount = chargeableAmount(target, clientAmount);
    if (amount == null) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    const currency = target.currency || "CAD";
    const description = target.description || clientDescription;
    const merchantId: string = target.merchantId;

    // ─── IDEMPOTENCY CHECK ───────────────────────────────────────────────
    const idempotencyKey = body.idempotency_key || "pay_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    const { data: cached } = await supabase.from("zenipay_idempotency_keys").select("result").eq("key", idempotencyKey).single();
    if (cached?.result) {
      return NextResponse.json(cached.result);
    }
    const now = new Date().toISOString();
    // `id` columns are UUID in production — the ZNV reference is display-only.
    const paymentId = newRowId();
    const paymentRef = `ZNV-${Date.now().toString(36).toUpperCase()}`;
    const displayAmount = parseFloat(String(amount));
    const displayCurrency = String(currency).toUpperCase() as Currency;
    if (!SUPPORTED_CURRENCIES.has(displayCurrency)) {
      return NextResponse.json(
        { error: `Unsupported currency: ${displayCurrency}` },
        { status: 400 },
      );
    }

    // Finix only settles CAD right now — convert any non-CAD pay link
    // to CAD using the active fx_rates row before charging.
    let chargeAmount = displayAmount;
    let fxRateUsed: number | null = null;
    if (displayCurrency !== PROCESSOR_CURRENCY) {
      try {
        fxRateUsed = await getActiveRate(displayCurrency, PROCESSOR_CURRENCY);
        chargeAmount = Math.round(displayAmount * fxRateUsed * 100) / 100;
      } catch (fxErr) {
        return NextResponse.json(
          {
            error: "FX_UNAVAILABLE",
            message: `Could not fetch ${displayCurrency} → ${PROCESSOR_CURRENCY} rate: ${fxErr instanceof Error ? fxErr.message : String(fxErr)}`,
          },
          { status: 503 },
        );
      }
    }
    // amountNum is what we record/credit downstream — always CAD because
    // that's what Finix actually settles. Display values are tracked
    // separately on the payment row.
    const amountNum = chargeAmount;
    const finixCurrency: Currency = PROCESSOR_CURRENCY;
    const fxNote = fxRateUsed
      ? `Original ${displayCurrency} ${displayAmount.toFixed(2)} · charged CAD ${chargeAmount.toFixed(2)} @ ${fxRateUsed.toFixed(4)}`
      : "";
    const finalDescription = [description || `Payment ${paymentRef}`, fxNote].filter(Boolean).join(" | ");

    // ─── 1. PROCESS PAYMENT THROUGH FINIX ────────────────────────────────
    // PCI-compliant flow: client tokenizes via Finix.js, server only touches tokens.
    let finixResult;
    try {
      finixResult = await processFinixPaymentWithInstrument({
        instrumentId: instrument_id,
        amount: chargeAmount,
        currency: finixCurrency,
        description: finalDescription,
        paymentId: paymentRef,
        fraudSessionId: fraud_session_id,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Finix] Payment processing failed:", msg, {
        paymentRef,
        instrumentPrefix: instrument_id ? String(instrument_id).slice(0, 6) : null,
        env: process.env.FINIX_ENV || "sandbox",
        hasMerchantId: !!process.env.FINIX_MERCHANT_ID,
        hasApiUser: !!process.env.FINIX_API_USERNAME,
        hasApiPass: !!process.env.FINIX_API_PASSWORD,
      });
      return NextResponse.json(
        { error: "Payment processing failed", message: msg, paymentId: paymentRef },
        { status: 402 }
      );
    }

    if (!finixResult.success) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const finixMsg = (finixResult as any).failureMessage as string | null | undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const finixCode = (finixResult as any).failureCode as string | null | undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transferId = (finixResult as any).transferId as string | null | undefined;

      // Persist the failed attempt so /admin/transactions and the
      // merchant feed actually show declined payments instead of
      // them disappearing into the void. merchantId hasn't been
      // resolved yet on this code path — use the body value if any.
      try {
        await supabase.from("zenipay_payments").upsert({
          id: paymentId,
          merchant_id: merchantId,
          amount: amountNum,
          currency: finixCurrency,
          description: finalDescription,
          customer_name: customer_name ?? "",
          customer_email: customer_email ?? "",
          status: "failed",
          gateway: "finix",
          metadata: {
            reference: paymentRef,
            payment_link_id: pay_link_id ?? null,
            gateway_transfer_id: transferId ?? "",
            gateway_instrument_id: instrument_id ?? "",
            failure_code: finixCode ?? null,
            failure_message: finixMsg ?? null,
          },
        });
      } catch (e) {
        console.error("[DB] failed-payment upsert error:", e);
      }

      return NextResponse.json({
        error: "Payment declined",
        message: finixMsg || "Payment declined by the processor.",
        state: finixResult.state,
        failure_code: finixCode ?? null,
        paymentId: paymentRef,
      }, { status: 402 });
    }

    // ─── 1b. CHECK FOR 3D SECURE REDIRECT ────────────────────────────────
    // If the card issuer requires 3DS authentication, Finix returns PENDING
    // with a redirect URL. Store the pending payment and return the URL.
    if (finixResult.state === "PENDING" && finixResult.threeDSRedirectUrl) {
      const { error: payErr3ds } = await supabase.from("zenipay_payments").upsert({
        id: paymentId,
        merchant_id: merchantId,
        amount: amountNum,
        currency: finixCurrency,
        description: finalDescription,
        customer_name: customer_name || "",
        customer_email: customer_email || "",
        status: "pending_3ds",
        gateway: "finix",
        metadata: {
          reference: paymentRef,
          payment_link_id: pay_link_id,
          installment_id: target.installment?.id ?? null,
          gateway_transfer_id: finixResult.transferId || "",
          gateway_instrument_id: finixResult.instrumentId || "",
          card_brand: finixResult.brand || "",
          card_last4: finixResult.last4 || "",
        },
        created_at: now,
        updated_at: now,
      }, { onConflict: "id" });

      if (payErr3ds) console.error("[DB] 3DS pending payment insert failed");

      return NextResponse.json({
        success: true,
        requires_3ds: true,
        redirect_url: finixResult.threeDSRedirectUrl,
        paymentId: paymentRef,
        payment_id: paymentId,
        transferId: finixResult.transferId,
        state: finixResult.state,
        amount: amountNum,
        currency: finixCurrency,
        display_amount: displayAmount,
        display_currency: displayCurrency,
        fx_rate: fxRateUsed,
        card: { brand: finixResult.brand, last4: finixResult.last4 },
      });
    }

    // ─── 2. MERCHANT ─ resolved in step 0 from the link/installment record.

    const paymentStatus = finixResult.state === "SUCCEEDED" ? "succeeded" : "pending";

    // ─── 3. INSERT PAYMENT ────────────────────────────────────────────────
    // Production `zenipay_payments` only has a subset of columns
    // (id, merchant_id, amount, currency, status, payment_method,
    //  gateway, customer_*, description, metadata, created_at, updated_at).
    // All Finix-specific fields are flattened into the `metadata` JSONB so
    // the insert never fails on missing columns.
    const { error: payErr } = await supabase.from("zenipay_payments").upsert({
      id: paymentId,
      merchant_id: merchantId || "unknown",
      amount: amountNum,
      currency: finixCurrency,
      description: finalDescription,
      customer_name: customer_name || "",
      customer_email: customer_email || "",
      status: paymentStatus,
      payment_method: "card",
      gateway: "finix",
      metadata: {
        reference: paymentRef,
        payment_link_id: pay_link_id,
        installment_id: target.installment?.id ?? null,
        gateway_transfer_id: finixResult.transferId || "",
        gateway_instrument_id: finixResult.instrumentId || "",
        card_brand: finixResult.brand || "",
        card_last4: finixResult.last4 || "",
        display_amount: displayAmount,
        display_currency: displayCurrency,
        fx_rate: fxRateUsed,
      },
      created_at: now,
      updated_at: now,
    }, { onConflict: "id" });

    if (payErr) console.error("[DB] Payment insert failed", payErr);

    // ─── 4. CREATE + EMAIL INVOICE (automated on money-in) ────────────────
    // Every successful payment creates a paid invoice (tax-inclusive,
    // merchant config.tax_rate, default 5 %) and emails it to the payer with
    // the merchant in BCC. Awaited so the serverless function isn't frozen
    // before the email leaves.
    if (finixResult.state === "SUCCEEDED" && target.installment) {
      // Installment of an existing invoice: mark it paid, move the invoice
      // to partial/paid and email a receipt with the remaining balance.
      try {
        await markInstallmentPaid(supabase, target.installment, { paymentId, paymentRef });
      } catch (e) {
        console.error("[installments] mark paid failed", e instanceof Error ? e.message : String(e));
      }
    } else if (finixResult.state === "SUCCEEDED") {
      const invoice = await createPaidInvoice(supabase, {
        merchantId,
        paymentId,
        paymentRef,
        customerName: customer_name || "Client",
        customerEmail: customer_email || "",
        description: description || `Payment link ${pay_link_id}`,
        total: amountNum,
        currency: finixCurrency,
        taxInclusive: true,
      });
      if (invoice) await emailInvoice(invoice);
    }

    // ─── 5. CREDIT MERCHANT BALANCE ───────────────────────────────────────
    // The merchant dashboard reads its balance from `zenipay_accounts.balance`
    // (primary `is_primary` account). Production `zenipay_merchants` uses
    // `config` JSONB — there is NO `merchant_data` / `balance` / `volume` /
    // `tx_count` column. We credit the accounts row (what the UI shows) and
    // mirror the running totals into `config` JSONB.
    if (merchantId && finixResult.state === "SUCCEEDED") {
      try {
        const fee = amountNum * 0.029 + 0.30;

        // 5a. Credit the merchant's primary account (the dashboard source of
        // truth). Direct update — same pattern as banking-ops send_transfer.
        const { data: pa } = await supabase
          .from("zenipay_accounts")
          .select("id, balance")
          .eq("merchant_id", merchantId)
          .eq("is_primary", true)
          .maybeSingle();
        if (pa) {
          const prevBalance = Number(pa.balance || 0);
          const credit = amountNum;
          await supabase
            .from("zenipay_accounts")
            .update({ balance: prevBalance + credit, updated_at: now })
            .eq("id", pa.id);
        }

        // 5b. Mirror totals + transaction list into the merchant's `config` JSONB.
        const { data: merchant } = await supabase
          .from("zenipay_merchants")
          .select("config")
          .eq("id", merchantId).single();
        const cfg = (merchant?.config || {}) as Record<string, unknown>;
        const existingBalance = Number(cfg.balance || 0);
        const existingVolume  = Number(cfg.volume || 0);
        const existingTxCount = Number(cfg.tx_count || 0);
        const existingTxs     = (cfg.transactions || []) as unknown[];

        const txn: Record<string, unknown> = {
          id: paymentRef, payment_id: paymentId, pay_link_id, amount: amountNum, currency: finixCurrency,
          display_amount: displayAmount, display_currency: displayCurrency, fx_rate: fxRateUsed,
          description: finalDescription, customer_name: customer_name || "", customer_email: customer_email || "",
          card_last4: finixResult.last4, card_brand: finixResult.brand,
          status: "succeeded", gateway: "finix", fee,
          transfer_id: finixResult.transferId, createdAt: now,
        };

        await supabase.from("zenipay_merchants").update({
          config: {
            ...cfg,
            balance:  existingBalance  + amountNum,
            volume:   existingVolume   + amountNum,
            tx_count: existingTxCount  + 1,
            transactions: [txn, ...existingTxs.slice(0, 99)],
          },
          updated_at: now,
        }).eq("id", merchantId);

        // 5c. Skim platform fee to ZeniPay corporate.
        if (fee > 0) {
          const ZP_CORP_MERCHANT = "acc_1774740862294";
          try {
            const { data: corpAcct } = await supabase
              .from("zenipay_accounts")
              .select("id, balance")
              .eq("merchant_id", ZP_CORP_MERCHANT)
              .eq("is_primary", true)
              .maybeSingle();
            if (corpAcct) {
              const corpPrev = Number(corpAcct.balance || 0);
              await supabase
                .from("zenipay_accounts")
                .update({ balance: corpPrev + fee, updated_at: now })
                .eq("id", corpAcct.id);
            }
            await supabase.from("zenipay_ledger").insert({
              id: `led_${Date.now()}_fee_${Math.random().toString(36).slice(2, 6)}`,
              payment_id: paymentId,
              merchant_id: ZP_CORP_MERCHANT,
              event_type: "platform_fee_collected",
              wallet_type: "platform",
              direction: "credit",
              amount: fee,
              currency: finixCurrency,
              reference: paymentRef,
              note: `Platform fee from ${merchantId} on payment ${paymentRef}`,
              created_at: now,
            });
          } catch (feeErr) {
            console.error("[DB] Platform fee skim failed:", feeErr instanceof Error ? feeErr.message : String(feeErr));
          }
        }
      } catch (e) {
        console.error("[DB] Merchant update failed", e instanceof Error ? e.message : String(e));
      }
    }

    // ─── 6. LEDGER ENTRY ──────────────────────────────────────────────────
    if (finixResult.state === "SUCCEEDED") {
      await supabase.from("zenipay_ledger").insert({
        id: `led_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        payment_id: paymentId,
        merchant_id: merchantId || "unknown",
        event_type: "customer_payment",
        wallet_type: "platform",
        direction: "credit",
        amount: amountNum,
        currency: finixCurrency,
        reference: paymentRef,
        note: `Finix payment: ${finalDescription || pay_link_id}`,
        created_at: now,
      });
    }

    // ─── 7. UPDATE PAY LINK USAGE ─────────────────────────────────────────
    if (target.kind === "link") {
      await supabase.from("zenipay_pay_links")
        .update({ uses: target.uses + 1, updated_at: now }).eq("id", pay_link_id);
    }

    // ─── 8. RETURN SUCCESS ────────────────────────────────────────────────
    const responsePayload = {
      success: true, paymentId: paymentRef, payment_id: paymentId,
      transferId: finixResult.transferId,
      state: finixResult.state,
      amount: amountNum, currency: finixCurrency,
      display_amount: displayAmount,
      display_currency: displayCurrency,
      fx_rate: fxRateUsed,
      card: { brand: finixResult.brand, last4: finixResult.last4 },
    };

    // Save idempotency key
    await supabase.from("zenipay_idempotency_keys").upsert({
      key: idempotencyKey,
      operation: "process_payment",
      result: responsePayload,
      created_at: now,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: "key" });

    return NextResponse.json(responsePayload);

  } catch (err) {
    console.error("[Finix] Fatal error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
