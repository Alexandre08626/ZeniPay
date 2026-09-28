// Orvel's tools. Each one is a thin wrapper over the same server functions
// the dashboard uses (lib/zenipay/*), scoped to ONE merchant — the merchant
// id comes from the session, never from the model. Arguments are validated
// here; the model is treated as untrusted input.

import type { SupabaseClient } from "@supabase/supabase-js";
import { createMerchantInvoice, InvoiceError } from "@/lib/zenipay/invoices";
import { emailInvoice } from "@/lib/zenipay/auto-invoice";
import { listInstallments, sendInstallmentRequest, payUrl, invoiceNumberOf, invoiceDescriptionOf, type PlanLine } from "@/lib/zenipay/installments";
import { updateTolerant } from "@/lib/zenipay/db-tolerant";
import { refundPayment, RefundError } from "@/lib/zenipay/refund";
import type { OrvelPermission } from "./permissions";

export interface ToolCtx {
  supabase: SupabaseClient;
  merchantId: string;
}

export interface ToolOutcome {
  ok: boolean;
  data?: unknown;          // returned to the model
  error?: string;
  summary?: string;        // one line for the journal / UI
  undo?: Record<string, unknown> | null;
}

export interface OrvelTool {
  name: string;
  permission: OrvelPermission;
  description: string;
  parameters: Record<string, unknown>;   // JSON Schema
  run: (ctx: ToolCtx, args: Record<string, unknown>) => Promise<ToolOutcome>;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const str = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : NaN; };
const money = (n: number, cur = "CAD") => new Intl.NumberFormat("fr-CA", { style: "currency", currency: cur }).format(n);

async function findInvoice(ctx: ToolCtx, numberOrId: string) {
  const key = str(numberOrId, 80);
  if (!key) return null;
  const { data: byNum, error } = await ctx.supabase.from("zenipay_invoices").select("*")
    .eq("merchant_id", ctx.merchantId).eq("invoice_number", key).maybeSingle();
  if (byNum) return byNum;
  if (error && /^INV-\d{4}-\d{3,}$/i.test(key)) {
    // Legacy table: the number leads the description.
    const { data } = await ctx.supabase.from("zenipay_invoices").select("*")
      .eq("merchant_id", ctx.merchantId).ilike("description", `${key.toUpperCase()} —%`).limit(1);
    if (data && data[0]) return data[0];
  }
  if (/^[0-9a-f-]{36}$/i.test(key)) {
    const { data } = await ctx.supabase.from("zenipay_invoices").select("*")
      .eq("merchant_id", ctx.merchantId).eq("id", key).maybeSingle();
    return data || null;
  }
  return null;
}

function slimInvoice(i: Record<string, any>) {
  return {
    invoice_number: invoiceNumberOf(i),
    customer: i.customer_name || i.client_name,
    email: i.customer_email || i.client_email || "",
    total: Number(i.total ?? i.amount ?? 0),
    paid: Number(i.amount_paid ?? (i.status === "paid" ? i.total ?? i.amount : 0) ?? 0),
    currency: i.currency || "CAD",
    status: i.status,
    installments: !!i.has_installments,
    created: String(i.created_at || "").slice(0, 10),
  };
}

export const TOOLS: OrvelTool[] = [
  // ── read_data ────────────────────────────────────────────────────────
  {
    name: "get_summary",
    permission: "read_data",
    description: "Vue d'ensemble : comptes et soldes, factures ouvertes (total à recevoir), 5 derniers paiements.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    async run(ctx) {
      const [{ data: accounts }, { data: invoices }, { data: payments }] = await Promise.all([
        ctx.supabase.from("zenipay_accounts").select("*").eq("merchant_id", ctx.merchantId),
        ctx.supabase.from("zenipay_invoices").select("*").eq("merchant_id", ctx.merchantId).order("created_at", { ascending: false }).limit(200),
        ctx.supabase.from("zenipay_payments").select("*").eq("merchant_id", ctx.merchantId).order("created_at", { ascending: false }).limit(5),
      ]);
      const open = (invoices || []).filter((i: any) => !["paid", "cancelled", "refunded"].includes(i.status));
      return {
        ok: true,
        data: {
          accounts: (accounts || []).map((a: any) => ({ name: a.account_name, last4: String(a.account_number || "").slice(-4), balance: Number(a.balance || 0), currency: a.currency, primary: !!a.is_primary })),
          open_invoices: open.length,
          receivable: round2(open.reduce((s: number, i: any) => s + Number(i.total ?? i.amount ?? 0) - Number(i.amount_paid || 0), 0)),
          recent_payments: (payments || []).map((p: any) => ({ ref: p.metadata?.reference || p.id, customer: p.customer_name, amount: Number(p.amount), status: p.status, date: String(p.created_at).slice(0, 10) })),
        },
      };
    },
  },
  {
    name: "list_invoices",
    permission: "read_data",
    description: "Liste les factures. Filtres optionnels : statut (draft, sent, partial, paid, overdue, cancelled) et nom du client.",
    parameters: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["draft", "sent", "partial", "paid", "overdue", "cancelled", "refunded"] },
        customer: { type: "string", description: "Nom (ou partie du nom) du client" },
        limit: { type: "number" },
      },
      additionalProperties: false,
    },
    async run(ctx, a) {
      let q = ctx.supabase.from("zenipay_invoices").select("*").eq("merchant_id", ctx.merchantId)
        .order("created_at", { ascending: false }).limit(Math.min(Math.max(num(a.limit) || 20, 1), 50));
      if (str(a.status)) q = q.eq("status", str(a.status));
      const { data } = await q;
      const c = str(a.customer).toLowerCase();
      const rows = (data || []).filter((i: any) => !c || String(i.customer_name || i.client_name || "").toLowerCase().includes(c));
      return { ok: true, data: rows.map(slimInvoice) };
    },
  },
  {
    name: "get_invoice",
    permission: "read_data",
    description: "Détail d'une facture par son numéro (ex. INV-2026-0003), avec ses versements et liens de paiement.",
    parameters: { type: "object", properties: { invoice_number: { type: "string" } }, required: ["invoice_number"], additionalProperties: false },
    async run(ctx, a) {
      const inv = await findInvoice(ctx, str(a.invoice_number));
      if (!inv) return { ok: false, error: "Facture introuvable." };
      const inst = await listInstallments(ctx.supabase, inv.id, ctx.merchantId);
      return {
        ok: true,
        data: {
          ...slimInvoice(inv),
          description: invoiceDescriptionOf(inv),
          installments: inst.map((i) => ({ seq: i.seq, label: i.label, amount: i.amount, due_date: i.due_date, status: i.status, pay_url: i.status === "paid" ? undefined : payUrl(i.pay_token) })),
        },
      };
    },
  },
  {
    name: "list_payments",
    permission: "read_data",
    description: "Liste les paiements reçus (les plus récents d'abord). Filtre optionnel par nom de client.",
    parameters: { type: "object", properties: { customer: { type: "string" }, limit: { type: "number" } }, additionalProperties: false },
    async run(ctx, a) {
      const { data } = await ctx.supabase.from("zenipay_payments").select("*").eq("merchant_id", ctx.merchantId)
        .order("created_at", { ascending: false }).limit(Math.min(Math.max(num(a.limit) || 20, 1), 50));
      const c = str(a.customer).toLowerCase();
      return {
        ok: true,
        data: (data || [])
          .filter((p: any) => !c || String(p.customer_name || "").toLowerCase().includes(c))
          .map((p: any) => ({
            ref: p.metadata?.reference || p.id, customer: p.customer_name, email: p.customer_email,
            amount: Number(p.amount), currency: p.currency, status: p.status,
            refunded: Number(p.metadata?.refunded_amount || 0), method: p.payment_method, date: String(p.created_at).slice(0, 16),
          })),
      };
    },
  },

  // ── invoices ─────────────────────────────────────────────────────────
  {
    name: "create_invoice",
    permission: "invoices",
    description:
      "Crée une facture et l'envoie au client. Pour un paiement en plusieurs fois, fournir `installments` (2 à 12 lignes) : chaque ligne a un libellé, un pourcentage OU un montant, et une date AAAA-MM-JJ ; la dernière ligne est le solde (sans montant). Les versements dus aujourd'hui partent tout de suite par courriel, les autres automatiquement à leur date.",
    parameters: {
      type: "object",
      properties: {
        customer_name: { type: "string" },
        customer_email: { type: "string" },
        description: { type: "string" },
        amount: { type: "number", description: "Montant avant taxes, en dollars" },
        tax: { type: "number", description: "Taxes en dollars (0 si incluses ou aucune)" },
        currency: { type: "string", enum: ["CAD", "USD"] },
        installments: {
          type: "array",
          items: {
            type: "object",
            properties: { label: { type: "string" }, percent: { type: "number" }, amount: { type: "number" }, due_date: { type: "string" } },
            required: ["label", "due_date"],
          },
        },
        send_now: { type: "boolean", description: "Envoyer la facture par courriel maintenant (défaut : oui)" },
      },
      required: ["customer_name", "amount"],
      additionalProperties: false,
    },
    async run(ctx, a) {
      try {
        const plan = Array.isArray(a.installments) ? (a.installments as PlanLine[]).map((l) => ({
          label: str(l.label, 80), due_date: str(l.due_date, 10),
          ...(Number.isFinite(Number(l.percent)) && l.percent != null ? { percent: Number(l.percent) } : {}),
          ...(Number.isFinite(Number(l.amount)) && l.amount != null ? { amount: Number(l.amount) } : {}),
        })) : undefined;
        const r = await createMerchantInvoice(ctx.supabase, ctx.merchantId, {
          customer_name: str(a.customer_name, 120),
          customer_email: str(a.customer_email, 200),
          description: str(a.description) || "Service",
          amount: num(a.amount),
          tax: Number.isFinite(num(a.tax)) ? num(a.tax) : 0,
          currency: str(a.currency) || "CAD",
          status: "sent",
          installments: plan && plan.length ? plan : undefined,
          send_now: a.send_now !== false,
        });
        const inv = r.invoice as Record<string, any>;
        return {
          ok: true,
          summary: `Facture ${inv.invoice_number} — ${inv.customer_name || a.customer_name}, ${money(Number(inv.total), inv.currency)}${r.installments.length ? ` en ${r.installments.length} versements` : ""}`,
          data: {
            invoice_number: inv.invoice_number, total: Number(inv.total), currency: inv.currency,
            emailed: r.emailed,
            installments: r.installments.map((i) => ({ label: i.label, amount: i.amount, due_date: i.due_date, pay_url: payUrl(i.pay_token) })),
          },
          undo: { type: "cancel_invoice", invoice_id: inv.id },
        };
      } catch (e) {
        const msg = e instanceof InvoiceError ? (e.message === "MIGRATION_REQUIRED" ? "Les versements ne sont pas encore activés (migration de base de données à appliquer)." : e.message) : "Création impossible.";
        return { ok: false, error: msg };
      }
    },
  },
  {
    name: "send_invoice",
    permission: "invoices",
    description: "Envoie (ou renvoie) une facture existante par courriel au client. `email` optionnel pour corriger/ajouter l'adresse.",
    parameters: { type: "object", properties: { invoice_number: { type: "string" }, email: { type: "string" } }, required: ["invoice_number"], additionalProperties: false },
    async run(ctx, a) {
      const inv = await findInvoice(ctx, str(a.invoice_number));
      if (!inv) return { ok: false, error: "Facture introuvable." };
      const to = str(a.email, 200) || inv.customer_email || inv.client_email || "";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { ok: false, error: "Aucun courriel valide pour ce client — demandez-le." };
      const total = Number(inv.total ?? inv.amount ?? 0), tax = Number(inv.tax || 0), subtotal = Number(inv.subtotal ?? total - tax);
      const ok = await emailInvoice({
        id: inv.id, invoice_number: invoiceNumberOf(inv), merchant_id: ctx.merchantId,
        merchant_name: inv.merchant_name || "", merchant_email: inv.merchant_email || "",
        customer_name: inv.customer_name || inv.client_name || "Client", customer_email: to,
        description: invoiceDescriptionOf(inv) || "Service", subtotal, tax, tax_rate: subtotal > 0 ? round2((tax / subtotal) * 100) : 0,
        total, currency: inv.currency || "CAD", payment_ref: invoiceNumberOf(inv),
        paid_at: inv.paid_at || inv.created_at, status: inv.status,
      });
      if (!ok) return { ok: false, error: "L'envoi du courriel a échoué." };
      if (to !== (inv.customer_email || inv.client_email)) {
        await updateTolerant(ctx.supabase, "zenipay_invoices", { customer_email: to, client_email: to }, (q) => q.eq("id", inv.id));
      }
      return { ok: true, summary: `Facture ${invoiceNumberOf(inv)} envoyée à ${to}`, data: { sent_to: to } };
    },
  },

  // ── reminders ────────────────────────────────────────────────────────
  {
    name: "send_installment_link",
    permission: "reminders",
    description: "Envoie au client le lien de paiement (ou un rappel) d'un versement non payé d'une facture. `seq` = numéro du versement (1, 2, 3…) ; sans `seq`, le prochain versement non payé.",
    parameters: { type: "object", properties: { invoice_number: { type: "string" }, seq: { type: "number" } }, required: ["invoice_number"], additionalProperties: false },
    async run(ctx, a) {
      const inv = await findInvoice(ctx, str(a.invoice_number));
      if (!inv) return { ok: false, error: "Facture introuvable." };
      const list = await listInstallments(ctx.supabase, inv.id, ctx.merchantId);
      const target = Number.isFinite(num(a.seq)) ? list.find((i) => i.seq === num(a.seq)) : list.find((i) => i.status === "pending" || i.status === "sent");
      if (!target) return { ok: false, error: "Aucun versement à relancer sur cette facture." };
      if (target.status === "paid") return { ok: false, error: `${target.label} est déjà payé.` };
      if (target.status === "cancelled") return { ok: false, error: `${target.label} est annulé.` };
      const ok = await sendInstallmentRequest(ctx.supabase, target, target.sent_at ? "reminder" : "request");
      if (!ok) return { ok: false, error: "Envoi impossible (courriel du client manquant ?)." };
      return { ok: true, summary: `${target.sent_at ? "Rappel" : "Lien"} ${target.label} (${invoiceNumberOf(inv)}) envoyé`, data: { label: target.label, amount: target.amount, pay_url: payUrl(target.pay_token) } };
    },
  },

  // ── pay_links ────────────────────────────────────────────────────────
  {
    name: "create_pay_link",
    permission: "pay_links",
    description: "Crée un lien de paiement à montant fixe à partager avec un client.",
    parameters: { type: "object", properties: { amount: { type: "number" }, description: { type: "string" }, currency: { type: "string", enum: ["CAD", "USD"] } }, required: ["amount"], additionalProperties: false },
    async run(ctx, a) {
      const amount = round2(num(a.amount));
      if (!(amount > 0) || amount > 50000) return { ok: false, error: "Montant invalide (entre 0 et 50 000 $)." };
      const currency = str(a.currency) === "USD" ? "USD" : "CAD";
      const id = `LINK-${Date.now().toString(36).toUpperCase()}`;
      const base = (process.env.NEXT_PUBLIC_BASE_URL || "https://zenipay.ca").replace(/\/$/, "");
      const url = `${base}/pay/${id}`;
      const now = new Date().toISOString();
      const { error } = await ctx.supabase.from("zenipay_pay_links").insert({
        id, url, amount, currency, description: str(a.description) || "", merchant_id: ctx.merchantId,
        status: "active", uses: 0, created_at: now, updated_at: now,
      });
      if (error) return { ok: false, error: "Création du lien impossible." };
      return { ok: true, summary: `Lien de paiement ${money(amount, currency)} créé`, data: { url, amount, currency }, undo: { type: "deactivate_pay_link", id } };
    },
  },

  // ── refunds (real money) ─────────────────────────────────────────────
  {
    name: "refund_payment",
    permission: "refunds",
    description: "Rembourse un paiement (argent réel, par Finix, sur la carte du client). `payment_ref` = référence ZNV-… du paiement. `amount` optionnel pour un remboursement partiel.",
    parameters: { type: "object", properties: { payment_ref: { type: "string" }, amount: { type: "number" }, reason: { type: "string" } }, required: ["payment_ref"], additionalProperties: false },
    async run(ctx, a) {
      try {
        const r = await refundPayment(ctx.supabase, ctx.merchantId, str(a.payment_ref, 80), {
          amount: Number.isFinite(num(a.amount)) ? num(a.amount) : undefined,
          reason: str(a.reason, 200) || "Remboursement par Orvel",
        });
        return { ok: true, summary: `Remboursement ${money(r.refunded_now)} — ${r.reference}`, data: r };
      } catch (e) {
        return { ok: false, error: e instanceof RefundError ? e.message : "Remboursement impossible." };
      }
    },
  },

  // ── internal_transfers (real money, inside ZeniPay) ──────────────────
  {
    name: "transfer_between_accounts",
    permission: "internal_transfers",
    description: "Déplace de l'argent entre deux comptes ZeniPay du marchand. Désigner chaque compte par son nom ou ses 4 derniers chiffres (voir get_summary).",
    parameters: { type: "object", properties: { from_account: { type: "string" }, to_account: { type: "string" }, amount: { type: "number" }, memo: { type: "string" } }, required: ["from_account", "to_account", "amount"], additionalProperties: false },
    async run(ctx, a) {
      const amount = round2(num(a.amount));
      if (!(amount > 0)) return { ok: false, error: "Montant invalide." };
      const { data: accounts } = await ctx.supabase.from("zenipay_accounts").select("*").eq("merchant_id", ctx.merchantId);
      const pick = (q: string) => {
        const k = q.toLowerCase().trim();
        const hits = (accounts || []).filter((x: any) => String(x.account_number || "").endsWith(k) || String(x.account_name || "").toLowerCase() === k);
        const loose = hits.length ? hits : (accounts || []).filter((x: any) => String(x.account_name || "").toLowerCase().includes(k));
        return loose.length === 1 ? loose[0] : null;
      };
      const from = pick(str(a.from_account, 60)), to = pick(str(a.to_account, 60));
      if (!from || !to) return { ok: false, error: "Compte introuvable ou ambigu — précisez le nom exact ou les 4 derniers chiffres." };
      if (from.id === to.id) return { ok: false, error: "Les deux comptes sont identiques." };
      if (Number(from.balance || 0) < amount) return { ok: false, error: `Solde insuffisant (${money(Number(from.balance || 0), from.currency)}).` };
      const t = await moveBetweenAccounts(ctx, from.id, to.id, amount, str(a.memo, 140) || "Virement par Orvel");
      if (!t.ok) return t;
      return {
        ok: true,
        summary: `${money(amount, from.currency)} : ${from.account_name} → ${to.account_name}`,
        data: { amount, from: from.account_name, to: to.account_name },
        undo: { type: "reverse_transfer", from_id: to.id, to_id: from.id, amount },
      };
    },
  },
];

/** Debit/credit two of the merchant's accounts + a zenipay_transfers record. */
export async function moveBetweenAccounts(ctx: ToolCtx, fromId: string, toId: string, amount: number, memo: string): Promise<ToolOutcome> {
  const now = new Date().toISOString();
  const { data: src } = await ctx.supabase.from("zenipay_accounts").select("*").eq("id", fromId).eq("merchant_id", ctx.merchantId).maybeSingle();
  const { data: dst } = await ctx.supabase.from("zenipay_accounts").select("*").eq("id", toId).eq("merchant_id", ctx.merchantId).maybeSingle();
  if (!src || !dst) return { ok: false, error: "Compte introuvable." };
  if (Number(src.balance || 0) < amount) return { ok: false, error: "Solde insuffisant." };
  // Conditional debit: only if the balance hasn't changed since we read it.
  const { data: debited } = await ctx.supabase.from("zenipay_accounts")
    .update({ balance: round2(Number(src.balance) - amount), updated_at: now })
    .eq("id", src.id).eq("balance", src.balance).select("id");
  if (!debited || debited.length === 0) return { ok: false, error: "Le solde a changé pendant l'opération — réessayez." };
  await ctx.supabase.from("zenipay_accounts").update({ balance: round2(Number(dst.balance || 0) + amount), updated_at: now }).eq("id", dst.id);
  await ctx.supabase.from("zenipay_transfers").insert({
    merchant_id: ctx.merchantId, from_account_id: src.id, to_account_id: dst.id,
    transfer_type: "internal", amount, fee: 0, memo, status: "completed", created_at: now, updated_at: now,
  });
  return { ok: true };
}

export function toolByName(name: string): OrvelTool | undefined {
  return TOOLS.find((t) => t.name === name);
}
