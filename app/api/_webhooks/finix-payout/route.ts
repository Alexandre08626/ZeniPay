// POST /api/_webhooks/finix-payout
//
// Receives Finix transfer lifecycle events for outbound payouts.
//
//   SUCCEEDED / SUCCESS       → zenipay_payout_requests.status='completed'
//   FAILED / CANCELED         → status='failed', record failure_reason,
//                                credit the merchant's source account back.
//
// Idempotent: matches by finix_transfer_id (set when we fire the payout
// to Finix) or by idempotency_key (set when we create the request).
//
// Webhook auth: FINIX_WEBHOOK_SECRET must match the secret header Finix
// sends. Matches the pattern used by the existing Finix-SALE webhook.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

function authorized(req: NextRequest): boolean {
  const secret = process.env.FINIX_WEBHOOK_SECRET;
  if (!secret) return true; // Dev mode: allow unsigned posts until the secret is configured.
  const headerValue = req.headers.get("x-finix-webhook-secret") ??
                      req.headers.get("finix-webhook-secret") ??
                      req.headers.get("x-webhook-secret");
  return !!headerValue && headerValue === secret;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;

  // Finix events carry either { type, data: {...transfer} } or a direct
  // transfer payload depending on subscription config. Normalize here.
  const type = String((body.type ?? body.event_type ?? body.state ?? "") as string).toLowerCase();
  const transfer = (body.data ?? body) as Record<string, unknown>;
  const finixTransferId = String(transfer.id ?? transfer.transfer_id ?? "");
  const idempotencyKey  = (transfer.idempotency_id ?? transfer.idempotency_key ?? null) as string | null;
  const failureReason   = (transfer.failure_message ?? transfer.failure_reason ?? null) as string | null;

  if (!finixTransferId && !idempotencyKey) {
    return NextResponse.json({ error: "no transfer id or idempotency key on payload" }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  // Locate the payout row — prefer finix_transfer_id, fall back to the
  // idempotency_key we attached when submitting.
  let payoutQuery = db.from("zenipay_payout_requests").select("*");
  if (finixTransferId) payoutQuery = payoutQuery.eq("finix_transfer_id", finixTransferId);
  else if (idempotencyKey) payoutQuery = payoutQuery.eq("idempotency_key", idempotencyKey);
  const { data: payout } = await payoutQuery.maybeSingle();
  if (!payout) {
    // Nothing to do — webhook arrived before the write, or transfer isn't ours.
    return NextResponse.json({ ignored: true, reason: "payout_not_found" });
  }
  if (payout.status === "completed" || payout.status === "failed") {
    return NextResponse.json({ ignored: true, reason: `already_${payout.status}` });
  }

  const now = new Date().toISOString();
  const isSuccess = /succeed|success|completed|settle/i.test(type) || transfer.state === "SUCCEEDED";
  const isFail    = /fail|cancel|declin|return/i.test(type)      || transfer.state === "FAILED";

  if (isSuccess) {
    await db.from("zenipay_payout_requests")
      .update({ status: "completed", finix_transfer_id: finixTransferId || payout.finix_transfer_id, updated_at: now })
      .eq("id", payout.id);
    return NextResponse.json({ ok: true, status: "completed" });
  }

  if (isFail) {
    // Credit the merchant's source account back — the cash never left Finix.
    if (payout.from_account_id) {
      const { data: acct } = await db.from("zenipay_accounts")
        .select("balance").eq("id", payout.from_account_id).maybeSingle();
      if (acct) {
        await db.from("zenipay_accounts")
          .update({ balance: Number(acct.balance ?? 0) + Number(payout.amount_units), updated_at: now })
          .eq("id", payout.from_account_id);
      }
    }
    // Mirror a correction ledger row so /app/transactions shows the refund.
    await db.from("zenipay_ledger").insert({
      id: `led_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      merchant_id: payout.merchant_id,
      event_type:  "payout_failed_refund",
      wallet_type: "platform",
      direction:   "credit",
      amount:      Number(payout.amount_units),
      currency:    payout.currency,
      reference:   payout.id,
      note:        `Withdrawal failed · refunded${failureReason ? ` (${failureReason})` : ""}`,
      created_at:  now,
    });
    await db.from("zenipay_payout_requests")
      .update({ status: "failed", failure_reason: failureReason, updated_at: now })
      .eq("id", payout.id);
    return NextResponse.json({ ok: true, status: "failed", refunded: true });
  }

  return NextResponse.json({ ignored: true, reason: `unhandled_event_${type}` });
}
