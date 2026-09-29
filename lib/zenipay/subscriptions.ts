// Abonnements mensuels (forfaits Orvel AI : Plus 39 $, Pro 275 $).
//
// Parcours :
//  1. Orvel (requête signée) crée un abonnement « incomplete » → page /abonnement/<id>.
//  2. La personne entre sa carte (Finix.js) et accepte le prélèvement mensuel → 1er paiement, carte
//     enregistrée chez Finix (PI…), abonnement « active », période d'un mois.
//  3. Le cron quotidien prélève la carte enregistrée à chaque échéance. Échec → « past_due », nouvel essai
//     dans 3 jours ; après 3 échecs → « canceled ». Annulation demandée → fin à l'échéance, sans prélèvement.
//  4. Chaque changement est signalé à Orvel par un avis signé (HMAC) ; Orvel ajuste le forfait du compte.
//
// Stockage : table zenipay_subscriptions (migration 20260928000001) ; tant qu'elle n'existe pas en production,
// repli sur la clé « zp_subscriptions » du marchand ORVEL_MERCHANT_ID (même principe que les versements).

import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingTable, readConfigKey, updateConfigKey } from "@/lib/zenipay/merchant-store";
import { sendEmail } from "@/lib/email/send";

export type SubStatus = "incomplete" | "active" | "past_due" | "canceled";
export type Subscription = {
  id: string; product: "orvel"; plan: "plus" | "pro"; external_ref: string;
  customer_email: string; customer_name: string; merchant_id: string;
  amount: number; tps: number; tvq: number; total: number; currency: "CAD";
  status: SubStatus; cancel_at_period_end: boolean;
  instrument_id: string | null; card_brand: string | null; card_last4: string | null;
  current_period_start: string | null; current_period_end: string | null; next_charge_at: string | null;
  failed_attempts: number; periods: number; activation_attempts: number;
  return_url: string; webhook_pending: boolean; last_payment_id: string | null; last_error: string | null;
  created_at: string; updated_at: string;
};

export const ORVEL_PLANS = { plus: { nom: "Plus", prix: 39 }, pro: { nom: "Pro", prix: 275 } } as const;
export const MAX_FAILED = 3;           // prélèvements refusés avant la fin de l'abonnement
export const RETRY_DAYS = 3;           // délai entre deux essais
export const MAX_ACTIVATION_TRIES = 5; // cartes refusées sur une même page de paiement (anti « card testing »)
const TABLE = "zenipay_subscriptions";
const CFG_KEY = "zp_subscriptions";

const round2 = (n: number) => Math.round(n * 100) / 100;
/** Taxes du Québec, seulement si les numéros d'inscription TPS/TVQ sont configurés (sinon aucune taxe perçue). */
export function orvelPrice(plan: "plus" | "pro") {
  const amount = ORVEL_PLANS[plan].prix;
  const taxes = !!(process.env.ORVEL_TPS_NO && process.env.ORVEL_TVQ_NO);
  const tps = taxes ? round2(amount * 0.05) : 0;
  const tvq = taxes ? round2(amount * 0.09975) : 0;
  return { amount, tps, tvq, total: round2(amount + tps + tvq), taxes };
}

/** Même jour le mois suivant (31 janv. → 28/29 févr.). */
/** Vendeur inscrit aux taxes (nom légal sur les reçus). */
export const orvelSellerName = () => process.env.ORVEL_LEGAL_NAME || "International Luxury Management";

/**
 * Un abonnement jamais payé (« incomplete ») prend le prix en vigueur —
 * p. ex. quand les numéros TPS/TVQ viennent d'être configurés. Un
 * abonnement déjà payé garde le prix convenu.
 */
export async function withCurrentPrice(supabase: SupabaseClient, sub: Subscription): Promise<Subscription> {
  if (sub.status !== "incomplete") return sub;
  const p = orvelPrice(sub.plan);
  if (p.total === sub.total && p.tps === sub.tps && p.tvq === sub.tvq) return sub;
  return (await updateSub(supabase, sub.id, { amount: p.amount, tps: p.tps, tvq: p.tvq, total: p.total })) || sub;
}

export function addMonth(iso: string): string {
  const d = new Date(iso);
  const day = d.getUTCDate();
  const n = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()));
  const last = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() + 1, 0)).getUTCDate();
  n.setUTCDate(Math.min(day, last));
  return n.toISOString();
}

export const orvelMerchantId = () => process.env.ORVEL_MERCHANT_ID || "";

// ─── Signature Orvel ↔ ZeniPay : « t=<unix>,v1=<HMAC-SHA256(secret, t.corps)> », 5 minutes de tolérance ───
const secret = () => process.env.ORVEL_ZENIPAY_SECRET || "";
export function signBody(body: string, nowSec = Math.floor(Date.now() / 1000)): string {
  return `t=${nowSec},v1=${crypto.createHmac("sha256", secret()).update(`${nowSec}.${body}`).digest("hex")}`;
}
export function verifyBody(header: string | null, body: string, nowSec = Math.floor(Date.now() / 1000)): boolean {
  if (secret().length < 32) return false;
  const m = /^t=(\d+),v1=([0-9a-f]{64})$/.exec(String(header || ""));
  if (!m || Math.abs(nowSec - Number(m[1])) > 300) return false;
  const expected = crypto.createHmac("sha256", secret()).update(`${m[1]}.${body}`).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(m[2]));
}

// ─── Stockage (table, ou repli dans la config du marchand Orvel) ───
export async function getSub(supabase: SupabaseClient, id: string): Promise<Subscription | null> {
  const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).maybeSingle();
  if (!error) return (data as Subscription) ?? null;
  if (!isMissingTable(error)) throw new Error(error.message);
  const all = await readConfigKey<Subscription[]>(supabase, orvelMerchantId(), CFG_KEY, []);
  return all.find((s) => s.id === id) ?? null;
}

export async function listSubs(supabase: SupabaseClient): Promise<Subscription[]> {
  const { data, error } = await supabase.from(TABLE).select("*").neq("status", "canceled");
  if (!error) return (data as Subscription[]) || [];
  if (!isMissingTable(error)) throw new Error(error.message);
  return (await readConfigKey<Subscription[]>(supabase, orvelMerchantId(), CFG_KEY, [])).filter((s) => s.status !== "canceled");
}

export async function insertSub(supabase: SupabaseClient, sub: Subscription): Promise<void> {
  const { error } = await supabase.from(TABLE).insert(sub);
  if (!error) return;
  if (!isMissingTable(error)) throw new Error(error.message);
  await updateConfigKey<Subscription[]>(supabase, orvelMerchantId(), CFG_KEY, [], (cur) => [...cur.filter((s) => s.id !== sub.id), sub]);
}

export async function updateSub(supabase: SupabaseClient, id: string, patch: Partial<Subscription>): Promise<Subscription | null> {
  const row = { ...patch, updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from(TABLE).update(row).eq("id", id).select("*").maybeSingle();
  if (!error) return (data as Subscription) ?? null;
  if (!isMissingTable(error)) throw new Error(error.message);
  let out: Subscription | null = null;
  await updateConfigKey<Subscription[]>(supabase, orvelMerchantId(), CFG_KEY, [], (cur) =>
    cur.map((s) => (s.id === id ? (out = { ...s, ...row }) : s)));
  return out;
}

export function newSubscription(args: { plan: "plus" | "pro"; external_ref: string; email: string; name: string; return_url: string }): Subscription {
  const p = orvelPrice(args.plan);
  const now = new Date().toISOString();
  return {
    id: "SUB-" + crypto.randomUUID(), product: "orvel", plan: args.plan, external_ref: args.external_ref,
    customer_email: args.email, customer_name: args.name, merchant_id: orvelMerchantId(),
    amount: p.amount, tps: p.tps, tvq: p.tvq, total: p.total, currency: "CAD",
    status: "incomplete", cancel_at_period_end: false,
    instrument_id: null, card_brand: null, card_last4: null,
    current_period_start: null, current_period_end: null, next_charge_at: null,
    failed_attempts: 0, periods: 0, activation_attempts: 0,
    return_url: args.return_url, webhook_pending: false, last_payment_id: null, last_error: null,
    created_at: now, updated_at: now,
  };
}

// ─── Avis signé vers Orvel ───
export async function notifyOrvel(supabase: SupabaseClient, sub: Subscription, type: string): Promise<boolean> {
  const url = process.env.ORVEL_WEBHOOK_URL || "https://orvel.zenitech.dev/api/zenipay-webhook";
  const body = JSON.stringify({
    type, sent_at: new Date().toISOString(),
    subscription: {
      id: sub.id, product: sub.product, plan: sub.plan, external_ref: sub.external_ref, status: sub.status,
      current_period_end: sub.current_period_end, cancel_at_period_end: sub.cancel_at_period_end,
    },
  });
  let ok = false;
  try {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json", "x-zenipay-signature": signBody(body) }, body, signal: AbortSignal.timeout(15000) });
    ok = r.ok;
  } catch { ok = false; }
  if (ok === !sub.webhook_pending) return ok; // déjà dans le bon état
  await updateSub(supabase, sub.id, { webhook_pending: !ok }); // non reçu → renvoyé par le cron
  sub.webhook_pending = !ok;
  return ok;
}

// ─── Comptabilité d'un paiement réussi (même inscription qu'un paiement par lien) ───
const ZP_CORP_MERCHANT = "acc_1774740862294";
export async function recordCharge(supabase: SupabaseClient, sub: Subscription, r: {
  paymentId: string; transferId: string; state: string; brand?: string | null; last4?: string | null; instrumentId?: string | null;
}): Promise<string> {
  const now = new Date().toISOString();
  const ref = "ZNV-" + Date.now().toString(36).toUpperCase();
  const description = `Orvel AI — forfait ${ORVEL_PLANS[sub.plan].nom} (mensuel)`;
  const { error: payErr } = await supabase.from("zenipay_payments").upsert({
    id: r.paymentId, merchant_id: sub.merchant_id || "unknown", amount: sub.total, currency: "CAD", description,
    customer_name: sub.customer_name || "", customer_email: sub.customer_email || "",
    status: r.state === "SUCCEEDED" ? "succeeded" : "pending", payment_method: "card", gateway: "finix",
    metadata: {
      reference: ref, subscription_id: sub.id, subscription_period: sub.periods + 1,
      gateway_transfer_id: r.transferId || "", gateway_instrument_id: r.instrumentId || sub.instrument_id || "",
      card_brand: r.brand || sub.card_brand || "", card_last4: r.last4 || sub.card_last4 || "",
      subtotal: sub.amount, tps: sub.tps, tvq: sub.tvq,
    },
    created_at: now, updated_at: now,
  }, { onConflict: "id" });
  if (payErr) console.error("[subscriptions] payment insert failed", payErr);
  if (r.state !== "SUCCEEDED" || !sub.merchant_id) return ref;
  try {
    const amount = sub.total;
    const fee = sub.merchant_id === ZP_CORP_MERCHANT ? 0 : round2(amount * 0.029 + 0.30);
    const { data: pa } = await supabase.from("zenipay_accounts").select("id, balance").eq("merchant_id", sub.merchant_id).eq("is_primary", true).maybeSingle();
    if (pa) await supabase.from("zenipay_accounts").update({ balance: Number(pa.balance || 0) + amount, updated_at: now }).eq("id", pa.id);
    const { data: merchant } = await supabase.from("zenipay_merchants").select("config").eq("id", sub.merchant_id).single();
    const cfg = (merchant?.config || {}) as Record<string, unknown>;
    const txn = { id: ref, payment_id: r.paymentId, subscription_id: sub.id, amount, currency: "CAD", description,
      customer_name: sub.customer_name, customer_email: sub.customer_email, card_last4: r.last4 || sub.card_last4,
      card_brand: r.brand || sub.card_brand, status: "succeeded", gateway: "finix", fee, transfer_id: r.transferId, createdAt: now };
    await supabase.from("zenipay_merchants").update({ config: { ...cfg,
      balance: Number(cfg.balance || 0) + amount, volume: Number(cfg.volume || 0) + amount, tx_count: Number(cfg.tx_count || 0) + 1,
      transactions: [txn, ...((cfg.transactions || []) as unknown[]).slice(0, 99)] }, updated_at: now }).eq("id", sub.merchant_id);
    if (fee > 0) {
      const { data: corp } = await supabase.from("zenipay_accounts").select("id, balance").eq("merchant_id", ZP_CORP_MERCHANT).eq("is_primary", true).maybeSingle();
      if (corp) await supabase.from("zenipay_accounts").update({ balance: Number(corp.balance || 0) + fee, updated_at: now }).eq("id", corp.id);
      await supabase.from("zenipay_ledger").insert({ id: `led_${Date.now()}_fee_${Math.random().toString(36).slice(2, 6)}`, payment_id: r.paymentId,
        merchant_id: ZP_CORP_MERCHANT, event_type: "platform_fee_collected", wallet_type: "platform", direction: "credit", amount: fee,
        currency: "CAD", reference: ref, note: `Platform fee from ${sub.merchant_id} on subscription ${sub.id}`, created_at: now });
    }
  } catch (e) { console.error("[subscriptions] merchant update failed", e instanceof Error ? e.message : String(e)); }
  await supabase.from("zenipay_ledger").insert({ id: `led_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, payment_id: r.paymentId,
    merchant_id: sub.merchant_id, event_type: "customer_payment", wallet_type: "platform", direction: "credit", amount: sub.total,
    currency: "CAD", reference: ref, note: `Abonnement ${sub.id} (${description})`, created_at: now });
  return ref;
}

// ─── Courriels à l'abonné ───
const money = (n: number) => n.toLocaleString("fr-CA", { style: "currency", currency: "CAD" });
const dateFr = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-CA", { timeZone: "America/Toronto", day: "numeric", month: "long", year: "numeric" }) : "");
const esc = (s: string) => String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
function wrap(inner: string) {
  return `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#1a1a2e;max-width:540px">${inner}<p style="color:#888;font-size:12px;margin-top:28px">Orvel AI — vendu par ${esc(orvelSellerName())}${process.env.ORVEL_TPS_NO ? ` · TPS ${esc(process.env.ORVEL_TPS_NO)} · TVQ ${esc(process.env.ORVEL_TVQ_NO || "")}` : ""}. Paiement traité par ZeniPay. Pour annuler : Orvel → Mon profil → Mon forfait.</p></div>`;
}

export async function emailReceipt(sub: Subscription, ref: string) {
  const taxes = sub.tps || sub.tvq
    ? `<tr><td>TPS (5 %)${process.env.ORVEL_TPS_NO ? " — n° " + esc(process.env.ORVEL_TPS_NO) : ""}</td><td style="text-align:right">${money(sub.tps)}</td></tr>
       <tr><td>TVQ (9,975 %)${process.env.ORVEL_TVQ_NO ? " — n° " + esc(process.env.ORVEL_TVQ_NO) : ""}</td><td style="text-align:right">${money(sub.tvq)}</td></tr>` : "";
  await sendEmail({
    to: sub.customer_email, fromName: "Orvel AI (ZeniPay)",
    subject: `Reçu Orvel — forfait ${ORVEL_PLANS[sub.plan].nom} (${ref})`,
    html: wrap(`<p>Bonjour ${esc(sub.customer_name)},</p><p>Merci ! Voici ton reçu pour ton abonnement Orvel.</p>
<table style="width:100%;border-collapse:collapse;font-size:14px">
<tr><td>Forfait ${ORVEL_PLANS[sub.plan].nom} — du ${dateFr(sub.current_period_start)} au ${dateFr(sub.current_period_end)}</td><td style="text-align:right">${money(sub.amount)}</td></tr>
${taxes}<tr><td><b>Total payé</b> (${esc(sub.card_brand || "carte")} •••• ${esc(sub.card_last4 || "")})</td><td style="text-align:right"><b>${money(sub.total)}</b></td></tr></table>
<p>Référence : ${ref}. Prochain prélèvement le ${dateFr(sub.current_period_end)}, sauf si tu annules avant.</p>`),
  }).catch((e) => console.error("[subscriptions] receipt email failed", e?.message));
}

export async function emailFailed(sub: Subscription, final: boolean) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://zenipay.ca";
  await sendEmail({
    to: sub.customer_email, fromName: "Orvel AI (ZeniPay)",
    subject: final ? "Orvel — ton forfait a pris fin (paiement refusé)" : "Orvel — ton paiement n'a pas passé",
    html: wrap(final
      ? `<p>Bonjour ${esc(sub.customer_name)},</p><p>Après ${MAX_FAILED} essais, le paiement de ton forfait ${ORVEL_PLANS[sub.plan].nom} a été refusé. Ton compte Orvel est revenu au forfait Gratuit (tes conversations et ton profil sont conservés).</p><p>Tu peux reprendre un forfait en tout temps dans Orvel → Mon profil → Mon forfait.</p>`
      : `<p>Bonjour ${esc(sub.customer_name)},</p><p>Le paiement mensuel de ton forfait ${ORVEL_PLANS[sub.plan].nom} (${money(sub.total)}) a été refusé par ta banque. On réessaie automatiquement dans ${RETRY_DAYS} jours.</p><p><a href="${base}/abonnement/${sub.id}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#3d7bff;color:#fff;text-decoration:none;font-weight:600">Mettre à jour ma carte</a></p>`),
  }).catch((e) => console.error("[subscriptions] failure email failed", e?.message));
}
