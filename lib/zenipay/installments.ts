// Invoice installments (dépôt 1, dépôt 2, solde…).
//
// Each installment has its own unguessable pay token (`INS-…`) that works
// with the normal /pay/<token> checkout. Money flow:
//   create invoice + plan → installments due today are emailed at once,
//   later ones by the daily cron → customer pays → markInstallmentPaid
//   updates the invoice (partial → paid) and emails a receipt with the
//   remaining balance.

import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/send";

export interface PlanLine {
  label: string;
  amount?: number;   // dollars — or
  percent?: number;  // % of the invoice total
  due_date: string;  // YYYY-MM-DD
}

export interface Installment {
  id: string;
  invoice_id: string;
  merchant_id: string;
  seq: number;
  label: string;
  amount: number;
  currency: string;
  due_date: string;
  status: "pending" | "sent" | "paid" | "cancelled";
  pay_token: string;
  payment_id: string | null;
  payment_ref: string | null;
  paid_at: string | null;
  sent_at: string | null;
  reminder_count: number;
}

export const MAX_INSTALLMENTS = 12;
const round2 = (n: number) => Math.round(n * 100) / 100;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function newPayToken(): string {
  // 80 bits of randomness, URL-safe, readable.
  return "INS-" + crypto.randomBytes(10).toString("base64url").toUpperCase().replace(/[-_]/g, "X");
}

/**
 * Turn the merchant's plan into exact dollar amounts. The last line always
 * absorbs rounding so the installments add up to the total to the cent.
 * Throws a French message on invalid input (shown as-is in the UI).
 */
export function resolvePlan(total: number, plan: PlanLine[]): Array<{ label: string; amount: number; due_date: string }> {
  if (!Array.isArray(plan) || plan.length < 2) throw new Error("Il faut au moins 2 versements.");
  if (plan.length > MAX_INSTALLMENTS) throw new Error(`Maximum ${MAX_INSTALLMENTS} versements.`);
  if (!(total > 0)) throw new Error("Le total de la facture doit être plus grand que 0.");

  const out = plan.map((p, i) => {
    if (!p || !DATE_RE.test(String(p.due_date || ""))) throw new Error(`Versement ${i + 1} : date invalide.`);
    const hasAmt = typeof p.amount === "number" && Number.isFinite(p.amount);
    const hasPct = typeof p.percent === "number" && Number.isFinite(p.percent);
    if (!hasAmt && !hasPct && i !== plan.length - 1) throw new Error(`Versement ${i + 1} : montant ou % requis.`);
    const amount = hasAmt ? round2(p.amount as number) : hasPct ? round2((total * (p.percent as number)) / 100) : 0;
    return { label: String(p.label || (i === plan.length - 1 ? "Solde" : `Dépôt ${i + 1}`)).slice(0, 80), amount, due_date: p.due_date };
  });

  // The last line is the balance: whatever is left.
  const beforeLast = round2(out.slice(0, -1).reduce((s, l) => s + l.amount, 0));
  out[out.length - 1].amount = round2(total - beforeLast);

  out.forEach((l, i) => { if (!(l.amount > 0)) throw new Error(`Versement ${i + 1} : le montant doit être plus grand que 0 (la somme des dépôts dépasse le total ?).`); });
  for (let i = 1; i < out.length; i++) {
    if (out[i].due_date < out[i - 1].due_date) throw new Error("Les dates des versements doivent être en ordre.");
  }
  return out;
}

export async function createInstallments(
  supabase: SupabaseClient,
  args: { invoiceId: string; merchantId: string; currency: string; lines: Array<{ label: string; amount: number; due_date: string }> },
): Promise<Installment[]> {
  const now = new Date().toISOString();
  const rows = args.lines.map((l, i) => ({
    invoice_id: args.invoiceId,
    merchant_id: args.merchantId,
    seq: i + 1,
    label: l.label,
    amount: l.amount,
    currency: args.currency,
    due_date: l.due_date,
    status: "pending",
    pay_token: newPayToken(),
    created_at: now,
    updated_at: now,
  }));
  const { data, error } = await supabase.from("zenipay_invoice_installments").insert(rows).select("*");
  if (error) {
    if (error.code === "42P01") throw new Error("MIGRATION_REQUIRED");
    throw new Error(error.message);
  }
  return (data || []) as Installment[];
}

export async function listInstallments(supabase: SupabaseClient, invoiceId: string): Promise<Installment[]> {
  const { data } = await supabase
    .from("zenipay_invoice_installments").select("*")
    .eq("invoice_id", invoiceId).order("seq", { ascending: true });
  return ((data || []) as Installment[]).map((i) => ({ ...i, amount: Number(i.amount) }));
}

export async function findInstallmentByToken(supabase: SupabaseClient, token: string): Promise<Installment | null> {
  if (!/^INS-[A-Z0-9]{8,32}$/.test(token)) return null;
  try {
    const { data } = await supabase
      .from("zenipay_invoice_installments").select("*").eq("pay_token", token).maybeSingle();
    return data ? ({ ...data, amount: Number(data.amount) } as Installment) : null;
  } catch { return null; }
}

// ── Invoice context (for emails) ────────────────────────────────────────

interface InvoiceCtx {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_email: string;
  merchant_name: string;
  merchant_email: string;
  total: number;
  currency: string;
  description: string;
}

async function loadInvoiceCtx(supabase: SupabaseClient, invoiceId: string): Promise<InvoiceCtx | null> {
  const { data: row } = await supabase.from("zenipay_invoices").select("*").eq("id", invoiceId).maybeSingle();
  if (!row) return null;
  let merchantName = row.merchant_name || "";
  let merchantEmail = row.merchant_email || "";
  if ((!merchantName || !merchantEmail) && row.merchant_id) {
    const { data: m } = await supabase.from("zenipay_merchants").select("*").eq("id", row.merchant_id).maybeSingle();
    const cfg = (m?.config || {}) as Record<string, unknown>;
    merchantName ||= String(m?.business_name || cfg.business_name || cfg.businessName || m?.company || m?.name || "");
    merchantEmail ||= String(m?.email || cfg.email || "");
  }
  let description = row.description || "";
  try {
    const items = typeof row.items === "string" ? JSON.parse(row.items) : row.items;
    if (!description && Array.isArray(items) && items[0]?.description) description = items[0].description;
  } catch { /* keep */ }
  return {
    id: row.id,
    invoice_number: row.invoice_number || row.id,
    customer_name: row.customer_name || row.client_name || "Client",
    customer_email: row.customer_email || row.client_email || "",
    merchant_name: merchantName,
    merchant_email: merchantEmail,
    total: Number(row.total ?? row.amount ?? 0),
    currency: row.currency || "CAD",
    description,
  };
}

/**
 * Called once a payment for an installment has SUCCEEDED. Idempotent: an
 * already-paid installment is left alone (returns false).
 */
export async function markInstallmentPaid(
  supabase: SupabaseClient,
  inst: Installment,
  payment: { paymentId: string; paymentRef: string },
): Promise<boolean> {
  const now = new Date().toISOString();
  const { data: updated } = await supabase
    .from("zenipay_invoice_installments")
    .update({ status: "paid", paid_at: now, payment_id: payment.paymentId, payment_ref: payment.paymentRef, updated_at: now })
    .eq("id", inst.id)
    .neq("status", "paid")
    .select("id");
  if (!updated || updated.length === 0) return false;

  const all = await listInstallments(supabase, inst.invoice_id);
  const live = all.filter((i) => i.status !== "cancelled");
  const paid = round2(live.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0));
  const due = round2(live.reduce((s, i) => s + i.amount, 0));
  const fullyPaid = paid >= due - 0.005;

  const patch: Record<string, unknown> = { amount_paid: paid, status: fullyPaid ? "paid" : "partial", updated_at: now };
  if (fullyPaid) patch.paid_at = now;
  const { error } = await supabase.from("zenipay_invoices").update(patch).eq("id", inst.invoice_id);
  if (error) {
    // Pre-migration table: no amount_paid / "partial" — keep what works.
    await supabase.from("zenipay_invoices")
      .update(fullyPaid ? { status: "paid", paid_at: now, updated_at: now } : { status: "sent", updated_at: now })
      .eq("id", inst.invoice_id);
  }

  const ctx = await loadInvoiceCtx(supabase, inst.invoice_id);
  if (ctx) {
    const remaining = round2(due - paid);
    const next = live.find((i) => i.status !== "paid");
    await sendInstallmentEmail(ctx, { ...inst, status: "paid", paid_at: now, payment_ref: payment.paymentRef }, "receipt", { paid, remaining, next });
  }
  return true;
}

// ── Emails ──────────────────────────────────────────────────────────────

const esc = (s: string) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const money = (n: number, cur: string) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: cur === "USDC" ? "USD" : cur }).format(n);
const fmtDate = (d: string) =>
  new Date(d + (d.length === 10 ? "T12:00:00" : "")).toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function payUrl(token: string): string {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || "https://zenipay.ca").replace(/\/$/, "");
  return `${base}/pay/${token}`;
}

export function renderInstallmentEmail(
  ctx: InvoiceCtx,
  inst: Installment,
  kind: "request" | "reminder" | "receipt",
  extra?: { paid?: number; remaining?: number; next?: Installment },
): { subject: string; html: string } {
  const from = esc(ctx.merchant_name || "ZeniPay");
  const cur = inst.currency || ctx.currency;
  const btn = (href: string, text: string) =>
    `<a href="${esc(href)}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 22px;border-radius:10px">${text}</a>`;
  const row = (l: string, v: string, bold = false) =>
    `<tr><td style="padding:6px 0;color:#64748b;font-size:13px">${l}</td><td style="padding:6px 0;text-align:right;font-size:13px;color:#0f172a;${bold ? "font-weight:700" : ""}">${v}</td></tr>`;

  let subject: string;
  let intro: string;
  let body: string;
  if (kind === "receipt") {
    subject = `Reçu — ${inst.label} payé (facture ${ctx.invoice_number})`;
    intro = `Merci, nous avons bien reçu votre paiement pour <b>${esc(inst.label)}</b>.<br><span style="color:#94a3b8;font-size:12px">Thank you, your payment was received.</span>`;
    body = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${row(esc(inst.label), money(inst.amount, cur), true)}
      ${row("Référence", esc(inst.payment_ref || ""))}
      ${row("Total de la facture", money(ctx.total, cur))}
      ${row("Payé à ce jour", money(extra?.paid ?? inst.amount, cur))}
      ${row("Solde restant", money(extra?.remaining ?? 0, cur), true)}
    </table>
    ${extra?.next && (extra.remaining ?? 0) > 0
      ? `<p style="font-size:13px;color:#334155;margin-top:16px">Prochain versement : <b>${esc(extra.next.label)}</b> — ${money(extra.next.amount, cur)}, le ${esc(fmtDate(extra.next.due_date))}. Vous recevrez un lien de paiement à cette date.</p>`
      : `<p style="font-size:13px;color:#166534;margin-top:16px;font-weight:700">Votre facture est maintenant payée en entier. Merci !</p>`}`;
  } else {
    const reminder = kind === "reminder";
    subject = `${reminder ? "Rappel — " : ""}${inst.label} à payer — facture ${ctx.invoice_number} (${money(inst.amount, cur)})`;
    intro = `${reminder ? "Petit rappel : v" : "V"}otre versement <b>${esc(inst.label)}</b> est dû le ${esc(fmtDate(inst.due_date))}.<br><span style="color:#94a3b8;font-size:12px">${reminder ? "Reminder: y" : "Y"}our installment is due.</span>`;
    body = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${row(esc(inst.label), money(inst.amount, cur), true)}
      ${row("Total de la facture", money(ctx.total, cur))}
    </table>
    <div style="margin:22px 0 6px">${btn(payUrl(inst.pay_token), `Payer ${money(inst.amount, cur)}`)}</div>
    <div style="font-size:11px;color:#94a3b8;word-break:break-all">${esc(payUrl(inst.pay_token))}</div>`;
  }

  const html = `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;padding:28px"><tr><td>
  <div style="font-size:18px;font-weight:700;color:#0f172a">${from}</div>
  ${ctx.merchant_email ? `<div style="font-size:12px;color:#94a3b8;margin-top:2px">${esc(ctx.merchant_email)}</div>` : ""}
  <div style="margin-top:20px;font-size:20px;font-weight:700;color:#0f172a">Facture ${esc(ctx.invoice_number)}</div>
  ${ctx.description ? `<div style="font-size:13px;color:#64748b;margin-top:4px">${esc(ctx.description)}</div>` : ""}
  <p style="font-size:14px;color:#334155;margin:20px 0 4px">Bonjour ${esc(ctx.customer_name)},</p>
  <p style="font-size:14px;color:#334155;margin:0 0 18px">${intro}</p>
  ${body}
  <p style="font-size:11px;color:#94a3b8;margin-top:26px">Paiement traité par ZeniPay pour ${from}. Pour toute question, répondez à ce courriel.</p>
</td></tr></table></td></tr></table></body></html>`;
  return { subject, html };
}

export async function sendInstallmentEmail(
  ctx: InvoiceCtx,
  inst: Installment,
  kind: "request" | "reminder" | "receipt",
  extra?: { paid?: number; remaining?: number; next?: Installment },
): Promise<boolean> {
  if (!EMAIL_RE.test(ctx.customer_email || "")) {
    console.warn("[installments] no valid customer email", ctx.invoice_number);
    return false;
  }
  const { subject, html } = renderInstallmentEmail(ctx, inst, kind, extra);
  try {
    await sendEmail({
      to: ctx.customer_email,
      bcc: ctx.merchant_email || undefined,
      subject,
      html,
      fromName: ctx.merchant_name || "ZeniPay",
      replyTo: ctx.merchant_email || undefined,
    });
    return true;
  } catch (e) {
    console.error("[installments] email failed", ctx.invoice_number, e instanceof Error ? e.message : String(e));
    return false;
  }
}

/** Email the payment link for one installment and stamp sent_at. */
export async function sendInstallmentRequest(
  supabase: SupabaseClient,
  inst: Installment,
  kind: "request" | "reminder" = "request",
): Promise<boolean> {
  const ctx = await loadInvoiceCtx(supabase, inst.invoice_id);
  if (!ctx) return false;
  const ok = await sendInstallmentEmail(ctx, inst, kind);
  if (ok) {
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { updated_at: now };
    if (kind === "request") { patch.sent_at = now; if (inst.status === "pending") patch.status = "sent"; }
    else { patch.reminder_count = (inst.reminder_count || 0) + 1; patch.last_reminder_at = now; }
    await supabase.from("zenipay_invoice_installments").update(patch).eq("id", inst.id);
  }
  return ok;
}

/** Today in Montréal time, YYYY-MM-DD. */
export function todayMontreal(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
