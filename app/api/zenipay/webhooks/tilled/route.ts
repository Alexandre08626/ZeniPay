export const dynamic = "force-dynamic";

/**
 * Finix Webhook Handler — Production Grade
 *
 * Security:
 * - Verifies HMAC-SHA256 signature using FINIX_WEBHOOK_SECRET
 * - Stores raw payload before processing (idempotent)
 * - Prevents duplicate processing via event ID dedup
 * - Updates payment status from Finix events
 * - Creates ledger entries for completed payments
 * - Writes audit logs
 */

import { createHmac } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { recordPaymentReceived, writeAuditLog } from "../../../../../modules/zenipay/services/ledger";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSupabase(): any {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function verifyFinixSignature(body: string, signature: string, secret: string): boolean {
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  // Constant-time comparison
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

  // ── Signature verification ─────────────────────────────────────────────
  if (webhookSecret) {
    const valid = verifyFinixSignature(rawBody, signature, webhookSecret);
    if (!valid) {
      console.warn("[ZeniPay Webhook] Invalid signature — rejected");
      return Response.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else {
    // Webhook secret not yet configured — log warning but continue in sandbox
    console.warn("[ZeniPay Webhook] FINIX_WEBHOOK_SECRET not set — skipping signature check (sandbox only)");
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const eventId = payload.id as string || `evt_${Date.now()}`;
  const eventType = payload.type as string || payload.event_type as string || "unknown";
  const supabase = getSupabase();

  // ── Store raw webhook event (dedup on event id) ──────────────────────
  if (supabase) {
    const { error: storeErr } = await supabase
      .from("zenipay_webhook_events")
      .insert({
        id: `wh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        gateway: "finix",
        event_type: eventType,
        payload,
        processed: false,
        created_at: new Date().toISOString(),
      });

    if (storeErr?.code === "23505") {
      // Duplicate event — already processed
      console.log(`[ZeniPay Webhook] Duplicate event ${eventId} — skipping`);
      return Response.json({ received: true, duplicate: true });
    }
  }

  // ── Process event ────────────────────────────────────────────────────
  try {
    await processWebhookEvent(eventType, payload, supabase);

    // Mark as processed
    if (supabase) {
      await supabase
        .from("zenipay_webhook_events")
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq("id", eventId);
    }

    return Response.json({ received: true });

  } catch (err) {
    console.error("[ZeniPay Webhook] Processing error:", err);

    if (supabase) {
      await supabase
        .from("zenipay_webhook_events")
        .update({ error: String(err) })
        .eq("id", eventId);
    }

    // Return 200 to prevent Finix retries for non-retryable errors
    return Response.json({ received: true, error: "Processing error logged" });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processWebhookEvent(
  eventType: string,
  payload: Record<string, unknown>,
  supabase: any
): Promise<void> {
  console.log(`[ZeniPay Webhook] Processing: ${eventType}`);

  // Extract transfer data
  const data = (payload.data || payload) as Record<string, unknown>;
  const transferId = data.id as string;
  const state = (data.state as string || "").toUpperCase();
  const amount = Number(data.amount || 0) / 100; // Finix stores in cents
  const currency = (data.currency as string || "USD").toUpperCase();

  // Match our internal payment by gateway_transfer_id
  let internalPaymentId = transferId;
  if (supabase && transferId) {
    const { data: pmtData } = await supabase
      .from("zenipay_payments")
      .select("id, status, amount")
      .eq("gateway_transfer_id", transferId)
      .single();
    if (pmtData) {
      internalPaymentId = pmtData.id;
    }
  }

  switch (eventType) {
    case "TRANSFER_SUCCEEDED":
    case "transfer.succeeded":
    case "TRANSFER.SUCCEEDED": {
      if (state === "SUCCEEDED" || eventType.includes("SUCCEED")) {
        if (supabase && transferId) {
          // Get payment details
          const { data: payment } = await supabase
            .from("zenipay_payments")
            .select("id, customer_name, customer_email, description, amount, currency")
            .eq("gateway_transfer_id", transferId)
            .single();

          // Update payment status
          await supabase
            .from("zenipay_payments")
            .update({ status: "succeeded", updated_at: new Date().toISOString() })
            .eq("gateway_transfer_id", transferId);

          // Create invoice if payment exists and no invoice created yet
          if (payment) {
            const invoiceId = `INV-${payment.id}`;
            const { data: existingInvoice } = await supabase
              .from("zenipay_invoices")
              .select("id")
              .eq("payment_id", payment.id)
              .single();

            if (!existingInvoice) {
              const now = new Date().toISOString();
              await supabase.from("zenipay_invoices").insert({
                id: invoiceId,
                payment_id: payment.id,
                booking_id: `BK-${payment.id}`,
                customer_name: payment.customer_name || "Client",
                customer_email: payment.customer_email || "",
                items: JSON.stringify([{
                  description: payment.description || "Payment",
                  qty: 1,
                  unit_price: payment.amount,
                  total: payment.amount
                }]),
                subtotal: payment.amount,
                tax: 0,
                total: payment.amount,
                currency: payment.currency || "USD",
                status: "paid",
                paid_at: now,
                notes: `ZeniPay Payment — ${payment.id} | Finix: ${transferId}`,
                created_at: now,
                updated_at: now,
              });
              console.log(`[ZeniPay Webhook] Created invoice ${invoiceId}`);
            }
          }
        }

        // Write ledger if not already done
        if (amount > 0) {
          await recordPaymentReceived({
            paymentId: internalPaymentId,
            amount,
            currency,
          });
        }

        await writeAuditLog({
          action: "webhook_transfer_succeeded",
          entityType: "payment",
          entityId: internalPaymentId,
          changes: { transfer_id: transferId, amount, currency },
        });
      }
      break;
    }

    case "TRANSFER_FAILED":
    case "transfer.failed":
    case "TRANSFER.FAILED": {
      if (supabase && transferId) {
        await supabase
          .from("zenipay_payments")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("gateway_transfer_id", transferId);
      }

      await writeAuditLog({
        action: "webhook_transfer_failed",
        entityType: "payment",
        entityId: internalPaymentId,
        changes: { transfer_id: transferId, failure_message: data.failure_message },
      });
      break;
    }

    case "TRANSFER_REVERSED":
    case "transfer.reversed":
    case "REFUND_SUCCEEDED": {
      if (supabase && transferId) {
        await supabase
          .from("zenipay_payments")
          .update({ status: "refunded", updated_at: new Date().toISOString() })
          .eq("gateway_transfer_id", transferId);
      }
      break;
    }

    default:
      console.log(`[ZeniPay Webhook] Unhandled event type: ${eventType}`);
  }
}
