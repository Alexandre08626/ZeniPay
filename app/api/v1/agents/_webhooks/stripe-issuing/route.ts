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
import { createClient } from "@supabase/supabase-js";
import { ZeniCoreClient, ZeniCoreError } from "@/lib/zenicore/client";
import type { Currency } from "@/lib/zenicore/types";

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

  // Settlement: issuing_transaction.created carries the actual posted
  // amount + the authorization_id that matches the externalAuthId we used
  // on the hold. We call zc.settleCardAuth to flip the hold from pending
  // into a posted debit (with an optional fee leg into fee_clearing).
  if (verified.event_type === "issuing_transaction.created") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = verified.payload as any;
    const tx = payload?.data?.object ?? null;
    if (!tx) return NextResponse.json({ ok: false, reason: "missing_transaction_object" }, { status: 400 });

    const externalCardId: string | null = typeof tx.card === "string" ? tx.card : (tx.card?.id ?? null);
    const authRef: string | null = typeof tx.authorization === "string" ? tx.authorization : (tx.authorization?.id ?? null);
    // Stripe sends debit amounts as NEGATIVE cents; settle_card_auth expects
    // a positive amount unit. Use the absolute magnitude.
    const amountCentsSigned: number = typeof tx.amount === "number" ? tx.amount : 0;
    const amountCentsAbs = Math.abs(amountCentsSigned);
    const currency: string = typeof tx.currency === "string" ? tx.currency.toUpperCase() : "USD";
    const feeCentsSigned: number = typeof tx.merchant_fee === "number" ? tx.merchant_fee : 0;
    const feeCentsAbs = Math.abs(feeCentsSigned);
    const merchantRef: string = tx.merchant_data?.name ?? tx.merchant_data?.network_id ?? "(unknown)";

    if (!externalCardId || !authRef || amountCentsAbs === 0) {
      return NextResponse.json({ ok: true, reason: "ignored_incomplete_transaction", event_type: verified.event_type });
    }

    const db = getAgentsDb();
    const { data: cardRow } = await db
      .from("issued_cards")
      .select("id, organization_id")
      .eq("external_card_id", externalCardId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!cardRow) {
      return NextResponse.json({ ok: true, reason: "card_not_found", event_type: verified.event_type });
    }

    try {
      const zcSupabase = createClient(
        process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
        process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
      const zc = new ZeniCoreClient(zcSupabase);
      const { txGroupId } = await zc.settleCardAuth({
        cardId: (cardRow as { id: string }).id,
        amount: (amountCentsAbs / 100).toFixed(2),
        currency: currency as Currency,
        merchantRef,
        authRef,
        feeAmount: (feeCentsAbs / 100).toFixed(2),
        idempotencyKey: `settle_${tx.id ?? authRef}`,
        postedBy: `card_settlement:${(cardRow as { id: string }).id}`,
      });
      return NextResponse.json({
        ok: true,
        settled: true,
        event_type: verified.event_type,
        zenicore_tx_group: txGroupId,
      });
    } catch (err) {
      const message = err instanceof ZeniCoreError ? err.message
                    : err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { ok: false, settled: false, event_type: verified.event_type, error: message },
        { status: 500 },
      );
    }
  }

  // issuing_authorization.created (async confirmation) + everything else.
  return NextResponse.json({ ok: true, event_type: verified.event_type });
}
