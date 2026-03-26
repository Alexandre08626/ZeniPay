export const dynamic = "force-dynamic";

import { createHmac } from "crypto";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

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

  // Verify signature (skip in sandbox if no secret)
  if (webhookSecret) {
    if (!verifySignature(rawBody, signature, webhookSecret)) {
      console.warn("[Webhook] Invalid Finix signature — rejected");
      return Response.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = (payload.type as string) || (payload.event_type as string) || "unknown";
  const supabase = getSupabase();

  // Log webhook event
  if (supabase) {
    await supabase.from("zenipay_webhook_logs").insert({
      id: `wh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      event_type: eventType,
      event_id: (payload.id as string) || "",
      source: "finix",
      payload,
      status: "received",
      created_at: new Date().toISOString(),
    });
  }

  if (!supabase) {
    return Response.json({ received: true, warning: "No database connection" });
  }

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
            .select("id, customer_name, customer_email, description, amount, currency")
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

              await supabase.from("zenipay_invoices").insert({
                id: `INV-${payment.id}`,
                invoice_number: `INV-${year}-${seq}`,
                payment_id: payment.id,
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

      case "settlement.created":
      case "dispute.created": {
        console.log(`[Webhook] ${eventType}:`, JSON.stringify(data).slice(0, 200));
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
