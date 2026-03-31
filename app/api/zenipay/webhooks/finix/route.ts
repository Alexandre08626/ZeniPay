export const dynamic = "force-dynamic";

import { createHmac } from "crypto";
import { getSupabaseAdmin } from "../../../../../modules/zenipay/services/supabase";

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
      case "TRANSFER.SUCCEEDED": {
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
          console.log(`[Webhook] Merchant ${vrMerchantId} → verification_required`);
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
          console.log(`[Webhook] Merchant ${vfMerchantId} → rejected`);
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
        console.log(`[Webhook] Settlement created: ${data.id}`);
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
        console.log(`[Webhook] Settlement updated: ${data.id}`);
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
        console.log(`[Webhook] Settlement failed: ${data.id}`);
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
        console.log(`[Webhook] Dispute created: ${disputeData.id}`);
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
          console.log(`[Webhook] Merchant ${finixMerchantId} → ${onboardingState}`);
        }
        break;
      }

      default:
        console.log(`[Webhook] Unhandled: ${eventType}`);
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
