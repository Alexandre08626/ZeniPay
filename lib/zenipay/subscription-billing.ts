// Facturation des abonnements : 1er paiement (carte saisie par la personne), prélèvements mensuels
// (carte enregistrée), relances, annulation. Voir lib/zenipay/subscriptions.ts pour le parcours complet.

import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { processFinixPaymentWithInstrument, createTransfer } from "@/modules/zenipay/gateways/finix";
import {
  type Subscription, ORVEL_PLANS, MAX_FAILED, RETRY_DAYS, MAX_ACTIVATION_TRIES,
  addMonth, updateSub, listSubs, recordCharge, notifyOrvel, emailReceipt, emailFailed,
} from "@/lib/zenipay/subscriptions";

const DAY = 86_400_000;

/** 1er paiement (ou nouvelle carte d'un abonnement en retard) avec le jeton Finix.js de la personne. */
export async function payWithNewCard(
  supabase: SupabaseClient, sub: Subscription, token: string, fraudSessionId?: string,
): Promise<{ ok: true; sub: Subscription } | { ok: false; error: string }> {
  if (!["incomplete", "past_due"].includes(sub.status)) return { ok: false, error: "Cet abonnement n'attend pas de paiement." };
  if (sub.activation_attempts >= MAX_ACTIVATION_TRIES) return { ok: false, error: "Trop d'essais refusés sur cette page. Recommence à partir d'Orvel." };
  const paymentId = crypto.randomUUID();
  let r: Awaited<ReturnType<typeof processFinixPaymentWithInstrument>>;
  try {
    r = await processFinixPaymentWithInstrument({
      instrumentId: token, amount: sub.total, currency: "CAD", paymentId, fraudSessionId,
      description: `Orvel ${ORVEL_PLANS[sub.plan].nom}`,
    });
  } catch (e) {
    r = { success: false, failureMessage: e instanceof Error ? e.message : String(e) } as never;
  }
  if (!r.success || r.threeDSRedirectUrl || !r.instrumentId?.startsWith("PI")) {
    const error = r.threeDSRedirectUrl
      ? "Ta banque demande une vérification supplémentaire que nous ne prenons pas encore en charge. Essaie une autre carte."
      : `Paiement refusé${r.failureMessage ? " : " + r.failureMessage : ""}. Vérifie ta carte ou essaie-en une autre.`;
    await updateSub(supabase, sub.id, { activation_attempts: sub.activation_attempts + 1, last_error: error });
    return { ok: false, error };
  }
  const start = new Date().toISOString();
  const end = addMonth(start);
  const next = (await updateSub(supabase, sub.id, {
    status: "active", instrument_id: r.instrumentId, card_brand: r.brand || null, card_last4: r.last4 || null,
    current_period_start: start, current_period_end: end, next_charge_at: end,
    periods: sub.periods + 1, failed_attempts: 0, last_payment_id: paymentId, last_error: null,
  })) || { ...sub };
  const ref = await recordCharge(supabase, next, { paymentId, transferId: r.transferId || "", state: r.state || "SUCCEEDED", brand: r.brand, last4: r.last4, instrumentId: r.instrumentId });
  await emailReceipt(next, ref);
  await notifyOrvel(supabase, next, sub.status === "incomplete" ? "subscription.activated" : "subscription.renewed");
  return { ok: true, sub: next };
}

/** Prélèvement mensuel sur la carte enregistrée. */
export async function renew(supabase: SupabaseClient, sub: Subscription, now = new Date()): Promise<Subscription> {
  const paymentId = crypto.randomUUID();
  let state = "FAILED", transferId = "", failure = "";
  try {
    const t = await createTransfer({
      merchantId: process.env.FINIX_MERCHANT_ID || "", instrumentId: sub.instrument_id || "",
      amountCents: Math.round(sub.total * 100), currency: "CAD", description: `Orvel ${ORVEL_PLANS[sub.plan].nom}`,
      // Une clé par période et par essai : un cron relancé ne peut pas prélever deux fois.
      idempotencyKey: `sub_${sub.id}_p${sub.periods + 1}_a${sub.failed_attempts}`,
      tags: { purpose: "orvel_subscription", subscription_id: sub.id, period: String(sub.periods + 1) },
    });
    state = t.state; transferId = t.transferId || "";
    if (t.threeDSRedirectUrl) state = "FAILED";
    failure = String((t.raw as any)?.failure_message || (t.raw as any)?.state_reason || "");
  } catch (e) { failure = e instanceof Error ? e.message : String(e); }

  if (state === "SUCCEEDED" || state === "PENDING") {
    // À l'heure : la nouvelle période suit l'ancienne. En retard : elle commence aujourd'hui.
    const start = sub.status === "active" && sub.current_period_end ? sub.current_period_end : now.toISOString();
    const end = addMonth(start);
    const next = (await updateSub(supabase, sub.id, {
      status: "active", current_period_start: start, current_period_end: end, next_charge_at: end,
      periods: sub.periods + 1, failed_attempts: 0, last_payment_id: paymentId, last_error: null,
    })) || sub;
    const ref = await recordCharge(supabase, next, { paymentId, transferId, state });
    await emailReceipt(next, ref);
    await notifyOrvel(supabase, next, "subscription.renewed");
    return next;
  }

  const failed = sub.failed_attempts + 1;
  if (failed >= MAX_FAILED) {
    const next = (await updateSub(supabase, sub.id, {
      status: "canceled", failed_attempts: failed, current_period_end: now.toISOString(), next_charge_at: null, last_error: failure || "refusé",
    })) || sub;
    await emailFailed(next, true);
    await notifyOrvel(supabase, next, "subscription.canceled");
    return next;
  }
  // Période de grâce : le forfait reste actif jusqu'au prochain essai.
  const retry = new Date(now.getTime() + RETRY_DAYS * DAY).toISOString();
  const next = (await updateSub(supabase, sub.id, {
    status: "past_due", failed_attempts: failed, next_charge_at: retry, current_period_end: retry, last_error: failure || "refusé",
  })) || sub;
  await emailFailed(next, false);
  await notifyOrvel(supabase, next, "subscription.past_due");
  return next;
}

/** Annulation demandée par la personne (depuis Orvel). */
export async function cancel(supabase: SupabaseClient, sub: Subscription): Promise<Subscription> {
  if (sub.status === "canceled") return sub;
  // Pas encore payé, ou en retard de paiement : fin immédiate. Payé : fin à l'échéance, sans autre prélèvement.
  const immediate = sub.status === "incomplete" || sub.status === "past_due";
  const next = (await updateSub(supabase, sub.id, immediate
    ? { status: "canceled", cancel_at_period_end: true, next_charge_at: null, current_period_end: new Date().toISOString() }
    : { cancel_at_period_end: true })) || sub;
  if (sub.status !== "incomplete") await notifyOrvel(supabase, next, immediate ? "subscription.canceled" : "subscription.updated");
  return next;
}

/** Tâche quotidienne : échéances, fins d'abonnement annulé, avis non reçus, pages de paiement abandonnées. */
export async function tick(supabase: SupabaseClient, now = new Date()) {
  const out = { renewed: 0, failed: 0, ended: 0, notified: 0, abandoned: 0 };
  for (const sub of await listSubs(supabase)) {
    if (sub.status === "incomplete") {
      if (now.getTime() - new Date(sub.created_at).getTime() > 2 * DAY) { await updateSub(supabase, sub.id, { status: "canceled" }); out.abandoned++; }
      continue;
    }
    const due = sub.next_charge_at && new Date(sub.next_charge_at).getTime() <= now.getTime();
    if (due && sub.cancel_at_period_end) {
      const next = (await updateSub(supabase, sub.id, { status: "canceled", next_charge_at: null })) || sub;
      await notifyOrvel(supabase, next, "subscription.canceled"); out.ended++;
      continue;
    }
    if (due) {
      const next = await renew(supabase, sub, now);
      if (next.status === "active") out.renewed++; else out.failed++;
      continue;
    }
    if (sub.webhook_pending && (await notifyOrvel(supabase, sub, "subscription.updated"))) out.notified++;
  }
  return out;
}
