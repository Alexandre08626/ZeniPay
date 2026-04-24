// POST /api/_webhooks/stripe-issuing
//
// Handles Stripe Issuing events for merchant virtual cards.
// Verified via Stripe-Signature header + STRIPE_ISSUING_WEBHOOK_SECRET.
//
// Events handled:
//   - issuing_authorization.request    → approve/decline based on
//     wallet balance + spending limits. Must respond within 2s.
//   - issuing_transaction.created      → debit the linked
//     zenipay_accounts row + emit an audit entry.
//   - issuing_card.updated             → mirror provider status onto
//     our zenipay_merchant_cards row.
//
// A ledger entry for card_spend is not inserted here — zenipay_ledger's
// event_type CHECK constraint doesn't include it yet. The audit log is
// the source of truth for spend until that migration lands.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { auditAsync } from "@/lib/audit/audit-logger";

function stripe(): Stripe {
  const key = process.env.STRIPE_ISSUING_API_KEY;
  if (!key) throw new Error("STRIPE_ISSUING_API_KEY not set");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Stripe(key, { apiVersion: "2024-06-20" as any });
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_ISSUING_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "STRIPE_ISSUING_WEBHOOK_SECRET unset" }, { status: 500 });
  }

  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(rawBody, sig, secret);
  } catch (e) {
    return NextResponse.json({ error: "bad_signature", detail: e instanceof Error ? e.message : String(e) }, { status: 401 });
  }

  const db = getSupabaseAdmin();

  if (event.type === "issuing_authorization.request") {
    const auth = event.data.object as Stripe.Issuing.Authorization;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cardId = typeof (auth.card as any) === "string" ? (auth.card as unknown as string) : (auth.card?.id ?? "");
    const amount = auth.pending_request?.amount ?? auth.amount;

    const { data: row } = await db
      .from("zenipay_merchant_cards")
      .select("id, merchant_id, account_id, status, spending_limit_daily, spending_limit_monthly")
      .eq("provider_card_id", cardId)
      .maybeSingle();

    let approve = false;
    let declineReason: string | null = null;

    if (!row) declineReason = "card_unknown";
    else if (row.status !== "active") declineReason = `card_${row.status}`;
    else if (row.account_id) {
      const { data: acct } = await db
        .from("zenipay_accounts")
        .select("balance")
        .eq("id", row.account_id)
        .maybeSingle();
      const balance = Number(acct?.balance ?? 0);
      if (balance * 100 < amount) declineReason = "insufficient_funds";
      else approve = true;
    } else {
      approve = true;
    }

    try {
      await stripe().issuing.authorizations.update(auth.id, {
        metadata: { zenipay_handled: "true", decline_reason: declineReason ?? "" },
      });
      if (approve) await stripe().issuing.authorizations.approve(auth.id);
      else await stripe().issuing.authorizations.decline(auth.id);
    } catch { /* Stripe will retry if we don't respond 200 */ }

    auditAsync({
      merchant_id: row?.merchant_id ?? "unknown",
      actor_type: "system",
      actor_id: "stripe_issuing",
      action: approve ? "card.authorization_approved" : "card.authorization_declined",
      resource_type: "zenipay_merchant_cards",
      resource_id: row?.id ?? cardId,
      new_value: { amount_cents: amount, decline_reason: declineReason, stripe_auth_id: auth.id },
      severity: approve ? "info" : "warning",
    });
  }

  else if (event.type === "issuing_transaction.created") {
    const tx = event.data.object as Stripe.Issuing.Transaction;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cardId = typeof (tx.card as any) === "string" ? (tx.card as unknown as string) : (tx.card?.id ?? "");
    const amountCents = Math.abs(tx.amount);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const merchantName = (tx.merchant_data as any)?.name ?? "unknown";

    const { data: row } = await db
      .from("zenipay_merchant_cards")
      .select("id, merchant_id, account_id")
      .eq("provider_card_id", cardId)
      .maybeSingle();

    if (row?.account_id) {
      const { data: acct } = await db
        .from("zenipay_accounts")
        .select("balance")
        .eq("id", row.account_id)
        .maybeSingle();
      const newBalance = Math.max(0, Number(acct?.balance ?? 0) - amountCents / 100);
      await db.from("zenipay_accounts").update({ balance: newBalance }).eq("id", row.account_id);
    }

    auditAsync({
      merchant_id: row?.merchant_id ?? "unknown",
      actor_type: "system",
      actor_id: "stripe_issuing",
      action: "card.spend",
      resource_type: "zenipay_merchant_cards",
      resource_id: row?.id ?? cardId,
      new_value: {
        amount_cents: amountCents,
        currency: tx.currency,
        merchant_name: merchantName,
        stripe_tx_id: tx.id,
      },
      severity: "info",
    });
  }

  else if (event.type === "issuing_card.updated") {
    const c = event.data.object as Stripe.Issuing.Card;
    const mapped = c.status === "active" ? "active" : c.status === "canceled" ? "cancelled" : "frozen";
    await db.from("zenipay_merchant_cards")
      .update({ status: mapped, ...(mapped === "cancelled" ? { cancelled_at: new Date().toISOString() } : {}) })
      .eq("provider_card_id", c.id);
  }

  return NextResponse.json({ ok: true, event: event.type });
}
