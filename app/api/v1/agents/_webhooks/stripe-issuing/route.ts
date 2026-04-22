// POST /api/v1/agents/_webhooks/stripe-issuing
//
// Stripe Issuing delivers:
//   issuing_authorization.request   — synchronous decision (<1500ms target)
//   issuing_authorization.created   — async confirmation (record-only)
//   issuing_transaction.created     — settlement (credits our tracking)
//
// Signature verification is MANDATORY. No signature → 401, no processing.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";       // node:crypto / stripe SDK

import { NextRequest, NextResponse } from "next/server";
import { stripeIssuingProvider } from "@/lib/agents/issuing/stripe-issuing/provider";
import { authorizeCardSpend } from "@/lib/agents/issuing/authorize";
import { getAgentsDb } from "@/lib/agents/supabase-client";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => { headers[k] = v; });

  const verified = stripeIssuingProvider.verifyWebhook(rawBody, headers);
  if (!verified.signature_valid) {
    return new Response(JSON.stringify({ error: "invalid_signature" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  // Authorization request (hot path)
  if (verified.event_type === "issuing_authorization.request") {
    const auth = await stripeIssuingProvider.handleAuthorizationWebhook(verified);
    if (!auth) return NextResponse.json({ approved: false, reason: "unknown_event" }, { status: 400 });

    const db = getAgentsDb();
    const { data: card } = await db
      .from("issued_cards")
      .select("id")
      .eq("external_card_id", auth.card_id)
      .is("deleted_at", null)
      .maybeSingle();

    if (!card) {
      // Unknown card — best-effort decline, don't block Stripe's 2s cutoff.
      void auth.reply.decline({ reason: "card_not_found" });
      return NextResponse.json({ approved: false, reason: "card_not_found" });
    }

    const result = await authorizeCardSpend({
      cardId: (card as { id: string }).id,
      externalAuthId: auth.id,
      amountCents: auth.amount_cents,
      currency: auth.currency,
      merchantName: auth.merchant_name,
      merchantCategory: auth.merchant_category,
      merchantNetworkId: auth.merchant_network_id,
      merchantCountry: auth.merchant_country,
      idempotencyKey: auth.id,
      occurredAt: auth.occurred_at,
    });

    // Respond to Stripe (fire-and-forget the provider callback so we don't
    // double the latency; our in-DB record is authoritative regardless).
    if (result.approved) void auth.reply.approve();
    else void auth.reply.decline({ reason: result.reason });

    return NextResponse.json({
      approved: result.approved,
      reason: result.reason,
      metadata: {
        card_authorization_id: result.card_authorization_id,
        latency_ms: result.latency_ms,
      },
    });
  }

  // Authorization created (async confirmation) + Transaction created
  // (settlement). We log these and let the cron reconcile.
  return NextResponse.json({ ok: true, event_type: verified.event_type });
}
