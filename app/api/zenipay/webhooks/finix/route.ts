export const dynamic = "force-dynamic";

import { createHmac } from "crypto";
import { getSupabaseAdmin } from "../../../../../modules/zenipay/services/supabase";
import { FundingClient } from "@/lib/zenicore/funding-client";
import type { Currency } from "@/lib/zenicore/types";

function verifySignature(body: string, signature: string, secret: string): boolean {
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("finix-signature") || request.headers.get("x-finix-signature") || "";
  const webhookSecret = process.env.FINIX_WEBHOOK_SECRET || "";

  // Verify signature — mandatory in production
  const isProduction = process.env.FINIX_ENV === "production";
  if (!webhookSecret && isProduction) {
    return Response.json({ error: "Webhook secret not configured" }, { status: 500 });
  }
  if (webhookSecret && !verifySignature(rawBody, signature, webhookSecret)) {
    console.warn("[Webhook] Invalid Finix signature — rejected");
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = (payload.type as string) || (payload.event_type as string) || "unknown";
  const supabase = getSupabaseAdmin();

  // Log webhook event
  await supabase.from("zenipay_webhook_logs").insert({
    id: `wh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    event_type: eventType,
    event_id: (payload.id as string) || "",
    source: "finix",
    payload,
    status: "received",
    created_at: new Date().toISOString(),
  });

  try {
    const data = (payload.data || payload) as Record<string, unknown>;
    const transferId = data.id as string;
    const state = ((data.state as string) || "").toUpperCase();
    const now = new Date().toISOString();

    switch (eventType) {
      case "transfer.succeeded":
      case "TRANSFER_SUCCEEDED":
      case "TRANSFER.SUCCEEDED":
      case "transfer.updated":
      case "TRANSFER_UPDATED":
      case "TRANSFER.UPDATED": {
        // PR 8 Money IN: if this transfer is an Agents treasury-fund SALE
        // (tagged by /api/v1/agents/treasury/fund/card), route it to the
        // ZeniCore funding ingestor instead of the merchant invoice flow.
        // Idempotent — if Finix redelivers the same transfer_id, the
        // wrapper returns state='duplicate' and we just log it.
        const isUpdatedEvent = /UPDATED/i.test(eventType);
        const treasuryFundResult = await tryRouteTreasuryFund({
          supabase, data, transferId, state, isUpdatedEvent,
          eventId: (payload.id as string) || "",
        });
        if (treasuryFundResult === "handled") break;

        if (transferId) {
          // Update payment status
          await supabase
            .from("zenipay_payments")
            .update({ status: "succeeded", updated_at: now })
            .eq("gateway_transfer_id", transferId);

          // Check if invoice already exists
          const { data: payment } = await supabase
            .from("zenipay_payments")
            .select("id, customer_name, customer_email, description, amount, currency, merchant_id")
            .eq("gateway_transfer_id", transferId)
            .single();

          if (payment) {
            const { data: existingInv } = await supabase
              .from("zenipay_invoices")
              .select("id")
              .eq("payment_id", payment.id)
              .single();

            if (!existingInv) {
              const year = new Date().getFullYear();
              const { count } = await supabase
                .from("zenipay_invoices")
                .select("id", { count: "exact", head: true });
              const seq = String((count || 0) + 1).padStart(3, "0");

              // Lookup merchant info for invoice branding
              let merchantName = "";
              let merchantEmail = "";
              let merchantLogo = "";
              if (payment.merchant_id) {
                const { data: merchant } = await supabase
                  .from("zenipay_merchants")
                  .select("business_name, email")
                  .eq("id", payment.merchant_id)
                  .single();
                if (merchant) {
                  merchantName = merchant.business_name || "";
                  merchantEmail = merchant.email || "";
                }
              }

              await supabase.from("zenipay_invoices").insert({
                id: `INV-${payment.id}`,
                invoice_number: `INV-${year}-${seq}`,
                payment_id: payment.id,
                merchant_id: payment.merchant_id || null,
                merchant_name: merchantName,
                merchant_email: merchantEmail,
                merchant_logo: merchantLogo,
                customer_name: payment.customer_name || "Client",
                customer_email: payment.customer_email || "",
                items: JSON.stringify([{
                  description: payment.description || "Payment",
                  qty: 1,
                  unit_price: payment.amount,
                  total: payment.amount,
                }]),
                subtotal: payment.amount,
                tax: 0,
                total: payment.amount,
                currency: payment.currency || "USD",
                status: "paid",
                paid_at: now,
                created_at: now,
                updated_at: now,
              });
            }
          }
        }
        break;
      }

      case "transfer.failed":
      case "TRANSFER_FAILED": {
        if (transferId) {
          await supabase
            .from("zenipay_payments")
            .update({ status: "failed", updated_at: now })
            .eq("gateway_transfer_id", transferId);
        }
        break;
      }

      case "transfer.reversed":
      case "TRANSFER_REVERSED": {
        if (transferId) {
          await supabase
            .from("zenipay_payments")
            .update({ status: "refunded", updated_at: now })
            .eq("gateway_transfer_id", transferId);
        }
        break;
      }

      case "merchant.verification_required":
      case "MERCHANT.VERIFICATION_REQUIRED": {
        const vrMerchantId = (data.id as string) || "";
        if (vrMerchantId) {
          await supabase
            .from("zenipay_merchants")
            .update({ onboarding_state: "verification_required", updated_at: now })
            .eq("finix_merchant_id", vrMerchantId);
        }
        break;
      }

      case "merchant.verification_failed":
      case "MERCHANT.VERIFICATION_FAILED": {
        const vfMerchantId = (data.id as string) || "";
        if (vfMerchantId) {
          await supabase
            .from("zenipay_merchants")
            .update({ onboarding_state: "rejected", updated_at: now })
            .eq("finix_merchant_id", vfMerchantId);
        }
        break;
      }

      case "settlement.created":
      case "SETTLEMENT.CREATED": {
        await supabase.from("zenipay_webhook_events").insert({
          id: `whe_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          event_type: eventType,
          entity_id: (data.id as string) || "",
          payload: data,
          created_at: now,
        });
        break;
      }

      case "settlement.updated":
      case "SETTLEMENT.UPDATED": {
        await supabase.from("zenipay_webhook_events").insert({
          id: `whe_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          event_type: eventType,
          entity_id: (data.id as string) || "",
          payload: data,
          created_at: now,
        });
        break;
      }

      case "settlement.failed":
      case "SETTLEMENT.FAILED": {
        await supabase.from("zenipay_webhook_events").insert({
          id: `whe_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          event_type: eventType,
          entity_id: (data.id as string) || "",
          payload: data,
          created_at: now,
        });
        // Update relevant payout status if settlement ID is tracked
        const settlementId = data.id as string;
        if (settlementId) {
          await supabase
            .from("zenipay_payouts")
            .update({ status: "failed", updated_at: now })
            .eq("settlement_id", settlementId);
        }
        break;
      }

      case "dispute.created":
      case "DISPUTE.CREATED": {
        const disputeData = data as Record<string, unknown>;
        await supabase.from("zenipay_disputes").insert({
          id: `dsp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          dispute_id: (disputeData.id as string) || "",
          transfer_id: (disputeData.transfer as string) || "",
          amount: (disputeData.amount as number) || 0,
          reason: (disputeData.reason as string) || "",
          state: (disputeData.state as string) || "PENDING",
          payload: disputeData,
          created_at: now,
          updated_at: now,
        });
        break;
      }

      case "merchant.created":
      case "merchant.underwritten":
      case "merchant.updated": {
        const merchantData = (payload.data || payload) as Record<string, unknown>;
        const finixMerchantId = merchantData.id as string;
        const onboardingState = merchantData.onboarding_state as string;

        if (finixMerchantId && onboardingState) {
          await supabase
            .from("zenipay_merchants")
            .update({
              onboarding_state: onboardingState.toLowerCase(),
              updated_at: now,
            })
            .eq("finix_merchant_id", finixMerchantId);
        }
        break;
      }

      default:
    }

    // Update log status
    await supabase.from("zenipay_webhook_logs")
      .update({ status: "processed", processed_at: now })
      .eq("event_id", payload.id as string);

    return Response.json({ received: true });

  } catch (err) {
    console.error("[Webhook] Processing error:", err);
    return Response.json({ received: true, error: "Processing error logged" });
  }
}

// ---------------------------------------------------------------------------
// PR 8 — treasury-fund SALE bridge.
//
// Finix transfers originated by POST /api/v1/agents/treasury/fund/card carry
// tags.zenipay_purpose = "agents_treasury_fund" + zenipay_organization_id +
// zenipay_funding_source_id. When the final SUCCEEDED event arrives, we call
// zc_ingest_funding_event to credit the treasury. Duplicate deliveries are
// swallowed by the wrapper (state='duplicate') so this handler is safe to
// retry.
//
// Returns "handled" if the event matched a treasury fund purpose (we
// short-circuit the merchant flow), or "skipped" otherwise.

async function tryRouteTreasuryFund(ctx: {
  supabase: ReturnType<typeof getSupabaseAdmin>;
  data: Record<string, unknown>;
  transferId: string;
  state: string;
  isUpdatedEvent: boolean;
  eventId: string;
}): Promise<"handled" | "skipped"> {
  const { supabase, data, transferId, state, isUpdatedEvent, eventId } = ctx;
  const tags = (data.tags && typeof data.tags === "object")
    ? (data.tags as Record<string, unknown>)
    : {};
  const purpose = typeof tags.zenipay_purpose === "string" ? tags.zenipay_purpose : "";
  if (purpose !== "agents_treasury_fund") return "skipped";

  // UPDATED events that don't reflect terminal success yet — ignore for now;
  // the next SUCCEEDED delivery will credit.
  if (isUpdatedEvent && state !== "SUCCEEDED") return "handled";

  const organizationId = typeof tags.zenipay_organization_id === "string"
    ? tags.zenipay_organization_id : "";
  const fundingSourceId = typeof tags.zenipay_funding_source_id === "string"
    ? tags.zenipay_funding_source_id : "";
  const amountCents = typeof data.amount === "number" ? (data.amount as number) : null;
  const currency = (typeof data.currency === "string" ? data.currency : "CAD") as Currency;

  if (!organizationId || !transferId || amountCents == null) {
    await supabase.from("finix_payment_logs").insert({
      id: `fpl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      payment_id: transferId || eventId || "unknown",
      event: "agents_treasury_fund.malformed",
      data: { tags, data, reason: "missing_required_fields" },
      created_at: new Date().toISOString(),
    }).then(() => {}, () => { /* logging is best-effort */ });
    return "handled";
  }

  if (state !== "SUCCEEDED") return "handled"; // Non-terminal; wait.

  try {
    const fc = new FundingClient(supabase);
    const result = await fc.ingestFundingEvent({
      rail: "card",
      organizationId,
      fundingSourceId: fundingSourceId || null,
      externalEventId: transferId,
      amount: amountCents / 100,
      currency,
      rawPayload: data,
      postedBy: "finix_webhook",
    });
    await supabase.from("finix_payment_logs").insert({
      id: `fpl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      payment_id: transferId,
      event: `agents_treasury_fund.${result.state}`,
      data: { event_id: result.eventId, tx_group: result.txGroup, reason: result.reason },
      created_at: new Date().toISOString(),
    }).then(() => {}, () => { /* best-effort */ });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase.from("finix_payment_logs").insert({
      id: `fpl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      payment_id: transferId,
      event: "agents_treasury_fund.error",
      data: { error: message, tags, raw: data },
      created_at: new Date().toISOString(),
    }).then(() => {}, () => { /* best-effort */ });
  }
  return "handled";
}
