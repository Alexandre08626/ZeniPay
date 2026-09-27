// /app/invoices — invoice management on the new DashboardShell.
//
// Data comes from /api/zenipay/stats (recent_invoices). Creation posts to
// /api/zenipay/merchant-data (PUT _direct_invoice) — same shape as the
// existing ZenivaComplete createInvoice flow so auto-invoice logic keeps
// working.

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Download, Send, X, CheckCircle2, AlertTriangle, FileText } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BankingCard } from "@/components/dashboard/BankingCard";
import { DataTable } from "@/components/dashboard/DataTable";
import { GradientButton } from "@/components/dashboard/GradientButton";
import zp from "@/lib/design-system/zenipay-brand";

interface Invoice {
  id: string;
  invoice_number?: string;
  customer_name: string;
  customer_email?: string;
  subtotal?: number;
  tax?: number;
  total: number;
  currency?: string;
  status: string;
  payment_id?: string;
  items?: string | Array<{ description: string; qty: number; unit_price: number; total: number }>;
  notes?: string;
  created_at: string;
  paid_at?: string;
  amount_paid?: number;
  has_installments?: boolean;
  merchant_id?: string;
  merchant_name?: string;
  merchant_email?: string;
}

type StatusFilter = "all" | "draft" | "sent" | "partial" | "paid" | "overdue";

interface Quote {
  id: string;
  quote_number?: string;
  customer_name: string;
  customer_email?: string;
  items?: string;
  subtotal?: number;
  tax?: number;
  total: number;
  currency?: string;
  status: string;
  notes?: string;
  validity_days?: number;
  expires_at?: string;
  created_at: string;
}

type QuoteStatusFilter = "all" | "draft" | "sent" | "accepted" | "expired";

function mid() { return typeof window === "undefined" ? "" : sessionStorage.getItem("zp_client") || ""; }
function bname() { return typeof window === "undefined" ? "" : sessionStorage.getItem("zp_client_bname") || "My Business"; }
function bemail() { return typeof window === "undefined" ? "" : sessionStorage.getItem("zp_client_email") || ""; }

function Stat({ label, value, sub, accent }: { label: string; value: React.ReactNode; sub?: string; accent?: "cyan" | "violet" | "green" | "neutral" }) {
  return (
    <BankingCard accent={accent ?? "neutral"}>
      <div style={{ fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted, letterSpacing: "0.12em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ ...zp.amountStyle.large, fontSize: 22, marginTop: 6, color: zp.text.primary }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: zp.text.muted, marginTop: 4 }}>{sub}</div>}
    </BankingCard>
  );
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Invoice | null>(null);

  const [devis, setDevis] = useState<Quote[]>([]);
  const [qFilter, setQFilter] = useState<QuoteStatusFilter>("all");
  const [createQuoteOpen, setCreateQuoteOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [quotesLoading, setQuotesLoading] = useState(false);

  const loadQuotes = useCallback(async () => {
    if (!mid()) return;
    setQuotesLoading(true);
    try {
      const r = await fetch(`/api/zenipay/quotes?merchant_id=${encodeURIComponent(mid())}`).then((x) => x.json());
      if (Array.isArray(r.quotes)) setDevis(r.quotes);
    } finally { setQuotesLoading(false); }
  }, []);

  const load = useCallback(async () => {
    if (!mid()) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/zenipay/stats?merchant_id=${encodeURIComponent(mid())}`).then((x) => x.json());
      // Normalize both the legacy (client_name/amount) and rich
      // (customer_name/subtotal/tax/total) invoice schemas into one shape.
      setInvoices(((r.recent_invoices ?? []) as Array<Record<string, any>>).map((i) => ({
        ...i,
        customer_name: i.customer_name || i.client_name || "—",
        customer_email: i.customer_email || i.client_email || "",
        total: i.total ?? i.amount ?? 0,
        invoice_number: i.invoice_number || i.id,
      })) as Invoice[]);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); void loadQuotes(); }, [load, loadQuotes]);

  const stats = useMemo(() => {
    const outstanding = invoices.filter((i) => i.status !== "paid");
    const overdue = invoices.filter((i) => i.status === "overdue");
    const draft = invoices.filter((i) => i.status === "draft");
    const paid = invoices.filter((i) => i.status === "paid");
    return {
      outstandingTotal: outstanding.reduce((s, i) => s + Math.max(0, Number(i.total || 0) - Number(i.amount_paid || 0)), 0),
      outstandingCount: outstanding.length,
      paidTotal: paid.reduce((s, i) => s + Number(i.total || 0), 0)
        + invoices.filter((i) => i.status === "partial").reduce((s, i) => s + Number(i.amount_paid || 0), 0),
      paidCount: paid.length,
      overdueCount: overdue.length,
      draftCount: draft.length,
    };
  }, [invoices]);

  const filtered = useMemo(() => {
    if (filter === "all") return invoices;
    return invoices.filter((i) => i.status === filter);
  }, [invoices, filter]);

  const qStats = useMemo(() => {
    const draft = devis.filter((q) => q.status === "draft");
    const sent = devis.filter((q) => q.status === "sent");
    const accepted = devis.filter((q) => q.status === "accepted");
    const expired = devis.filter((q) => q.expires_at && new Date(q.expires_at) < new Date() && q.status !== "accepted");
    return {
      total: devis.length,
      draftTotal: draft.reduce((s, q) => s + Number(q.total || 0), 0),
      draftCount: draft.length,
      sentTotal: sent.reduce((s, q) => s + Number(q.total || 0), 0),
      sentCount: sent.length,
      acceptedCount: accepted.length,
      expiredCount: expired.length,
    };
  }, [devis]);

  const isQuoteExpired = (q: Quote) => q.expires_at && new Date(q.expires_at) < new Date() && q.status !== "accepted";

  const qFiltered = useMemo(() => {
    if (qFilter === "all") return devis;
    if (qFilter === "expired") return devis.filter(isQuoteExpired);
    return devis.filter((q) => q.status === qFilter);
  }, [devis, qFilter]);

  return (
    <DashboardShell mode="merchant">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: zp.font.display, fontSize: 32, letterSpacing: "-0.03em", fontWeight: zp.weight.semibold, color: zp.text.primary }}>Invoices</h1>
          <p style={{ margin: "4px 0 0", color: zp.text.muted, fontSize: 13 }}>
            Bill clients. Get paid automatically via ZeniPay.
          </p>
        </div>
        <GradientButton variant="primary" size="md" onClick={() => setCreateOpen(true)} icon={<Plus size={14} />}>
          New invoice
        </GradientButton>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12, marginBottom: 18 }}>
        <Stat label="Outstanding" value={zp.fmtCurrency(stats.outstandingTotal)} sub={`${stats.outstandingCount} invoice${stats.outstandingCount === 1 ? "" : "s"}`} accent="cyan" />
        <Stat label="Paid" value={zp.fmtCurrency(stats.paidTotal)} sub={`${stats.paidCount} invoice${stats.paidCount === 1 ? "" : "s"}`} accent="green" />
        <Stat label="Overdue" value={String(stats.overdueCount)} sub={stats.overdueCount > 0 ? "Needs follow-up" : "All clear"} accent={stats.overdueCount > 0 ? "neutral" : "green"} />
        <Stat label="Drafts" value={String(stats.draftCount)} sub="Not sent yet" />
      </div>

      <BankingCard padding={14} style={{ marginBottom: 14 }}>
        <div style={{ display: "inline-flex", gap: 2, padding: 3, background: zp.surface.bg2, border: `1px solid ${zp.surface.border}`, borderRadius: zp.radius.sm }}>
          {(["all", "draft", "sent", "partial", "paid", "overdue"] as StatusFilter[]).map((f) => {
            const active = f === filter;
            const count =
              f === "all" ? invoices.length :
              invoices.filter((i) => i.status === f).length;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "6px 14px", borderRadius: zp.radius.xs, border: "none",
                  background: active ? zp.surface.bg1 : "transparent",
                  color: active ? zp.text.primary : zp.text.muted,
                  fontSize: 12, fontWeight: active ? zp.weight.semibold : zp.weight.medium,
                  boxShadow: active ? zp.elevation.sm : undefined, cursor: "pointer",
                  textTransform: "capitalize" as const,
                }}
              >
                {f} · {count}
              </button>
            );
          })}
        </div>
      </BankingCard>

      <BankingCard padding="none">
        <DataTable
          rows={filtered}
          loading={loading && invoices.length === 0}
          rowKey={(i) => i.id}
          onRowClick={(i) => setSelected(i)}
          columns={[
            { key: "num", header: "Invoice #", mono: true, width: 140, cell: (i) => (
              <span style={{ color: zp.brand.cyan, fontWeight: zp.weight.semibold }}>{i.invoice_number || i.id}</span>
            ) },
            { key: "client", header: "Client", cell: (i) => (
              <div>
                <div style={{ color: zp.text.primary, fontWeight: zp.weight.semibold }}>{i.customer_name || "—"}</div>
                {i.customer_email && <div style={{ fontSize: 11, color: zp.text.dim }}>{i.customer_email}</div>}
              </div>
            ) },
            { key: "total", header: "Amount", mono: true, align: "right", width: 150,
              cell: (i) => zp.fmtCurrency(Number(i.total || 0), i.currency || "CAD") },
            { key: "status", header: "Status", width: 110, cell: (i) => <StatusPill status={i.status} /> },
            { key: "date", header: "Created", cell: (i) => zp.fmtDate(i.created_at), width: 130 },
          ]}
          empty={
            <div>
              <p style={{ margin: "0 0 12px", color: zp.text.primary, fontWeight: zp.weight.semibold }}>No invoices yet</p>
              <GradientButton variant="primary" size="md" onClick={() => setCreateOpen(true)} icon={<Plus size={14} />}>Create your first invoice</GradientButton>
            </div>
          }
        />
      </BankingCard>

      <div style={{ height: 1, background: zp.surface.border, margin: "28px 0 20px" }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: zp.font.display, fontSize: 22, letterSpacing: "-0.03em", fontWeight: zp.weight.semibold, color: zp.text.primary }}>📋 Devis / Quotes</h2>
          <p style={{ margin: "4px 0 0", color: zp.text.muted, fontSize: 12 }}>
            {devis.length} devis total
          </p>
        </div>
        <GradientButton variant="primary" size="md" onClick={() => setCreateQuoteOpen(true)} icon={<Plus size={14} />}>
          + Devis
        </GradientButton>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 18 }}>
        <Stat label="Pending" value={zp.fmtCurrency(qStats.sentTotal + qStats.draftTotal)} sub={`${qStats.sentCount + qStats.draftCount} devis`} accent="cyan" />
        <Stat label="Accepted" value={String(qStats.acceptedCount)} sub="Approved by customer" accent="green" />
        <Stat label="Expired" value={String(qStats.expiredCount)} sub="Past validity date" accent={qStats.expiredCount > 0 ? "neutral" : "green"} />
        <Stat label="Total" value={String(qStats.total)} sub={`${qStats.draftCount} drafts · ${qStats.sentCount} sent`} />
      </div>

      <BankingCard padding={14} style={{ marginBottom: 14 }}>
        <div style={{ display: "inline-flex", gap: 2, padding: 3, background: zp.surface.bg2, border: `1px solid ${zp.surface.border}`, borderRadius: zp.radius.sm }}>
          {(["all", "draft", "sent", "accepted", "expired"] as QuoteStatusFilter[]).map((f) => {
            const active = f === qFilter;
            const count = f === "all" ? devis.length : f === "expired" ? devis.filter(isQuoteExpired).length : devis.filter((q) => q.status === f).length;
            return (
              <button
                key={f}
                onClick={() => setQFilter(f)}
                style={{
                  padding: "6px 14px", borderRadius: zp.radius.xs, border: "none",
                  background: active ? zp.surface.bg1 : "transparent",
                  color: active ? zp.text.primary : zp.text.muted,
                  fontSize: 12, fontWeight: active ? zp.weight.semibold : zp.weight.medium,
                  boxShadow: active ? zp.elevation.sm : undefined, cursor: "pointer",
                  textTransform: "capitalize" as const,
                }}
              >
                {f} · {count}
              </button>
            );
          })}
        </div>
      </BankingCard>

      <BankingCard padding="none">
        <DataTable
          rows={qFiltered}
          loading={quotesLoading && devis.length === 0}
          rowKey={(q) => q.id}
          onRowClick={(q) => setSelectedQuote(q)}
          columns={[
            { key: "num", header: "Quote #", mono: true, width: 140, cell: (q) => (
              <span style={{ color: zp.brand.violet, fontWeight: zp.weight.semibold }}>{q.quote_number || q.id}</span>
            ) },
            { key: "client", header: "Client", cell: (q) => (
              <div>
                <div style={{ color: zp.text.primary, fontWeight: zp.weight.semibold }}>{q.customer_name || "—"}</div>
                {q.customer_email && <div style={{ fontSize: 11, color: zp.text.dim }}>{q.customer_email}</div>}
              </div>
            ) },
            { key: "total", header: "Amount", mono: true, align: "right", width: 150,
              cell: (q) => zp.fmtCurrency(Number(q.total || 0), q.currency || "CAD") },
            { key: "status", header: "Status", width: 110, cell: (q) => <QuoteStatusPill quote={q} /> },
            { key: "expires", header: "Expires", cell: (q) => {
              const expired = isQuoteExpired(q);
              return <span style={{ fontSize: 12, fontWeight: zp.weight.medium, color: expired ? zp.semantic.danger : zp.text.muted }}>{q.expires_at ? zp.fmtDate(q.expires_at) : "—"}</span>;
            }, width: 120 },
            { key: "date", header: "Created", cell: (q) => zp.fmtDate(q.created_at), width: 120 },
          ]}
          empty={
            <div>
              <p style={{ margin: "0 0 12px", color: zp.text.primary, fontWeight: zp.weight.semibold }}>No devis yet</p>
              <GradientButton variant="primary" size="md" onClick={() => setCreateQuoteOpen(true)} icon={<Plus size={14} />}>Create your first devis</GradientButton>
            </div>
          }
        />
      </BankingCard>

      {createOpen && (
        <CreateInvoiceModal
          onClose={() => setCreateOpen(false)}
          onCreated={async () => { setCreateOpen(false); await load(); }}
        />
      )}
      {createQuoteOpen && (
        <CreateQuoteModal
          onClose={() => setCreateQuoteOpen(false)}
          onCreated={async () => { setCreateQuoteOpen(false); await loadQuotes(); }}
        />
      )}
      {selected && <InvoiceDetail key={selected.id} invoice={selected} onClose={() => setSelected(null)} />}
      {selectedQuote && <QuoteDetail quote={selectedQuote} onClose={() => setSelectedQuote(null)} onStatusUpdate={async (id, status) => { await fetch("/api/zenipay/quotes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) }); await loadQuotes(); setSelectedQuote(null); }} />}
    </DashboardShell>
  );
}

function StatusPill({ status }: { status: string }) {
  const key = status?.toLowerCase() || "";
  const m: Record<string, { bg: string; fg: string; icon?: "check" | "alert" }> = {
    paid: { bg: zp.semantic.successBg, fg: zp.semantic.success, icon: "check" },
    sent: { bg: zp.surface.bg3, fg: zp.text.muted },
    partial: { bg: zp.surface.bg3, fg: zp.brand.cyan },
    draft: { bg: zp.surface.bg3, fg: zp.text.muted },
    overdue: { bg: zp.semantic.dangerBg, fg: zp.semantic.danger, icon: "alert" },
  };
  const s = m[key] ?? { bg: zp.surface.bg3, fg: zp.text.muted };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 10, fontWeight: zp.weight.semibold, padding: "3px 10px",
      borderRadius: zp.radius.pill, background: s.bg, color: s.fg,
      letterSpacing: "0.06em", textTransform: "uppercase" as const,
    }}>
      {s.icon === "check" && <CheckCircle2 size={10} />}
      {s.icon === "alert" && <AlertTriangle size={10} />}
      {status || "—"}
    </span>
  );
}

function QuoteStatusPill({ quote }: { quote: Quote }) {
  const isExpired = quote.expires_at && new Date(quote.expires_at) < new Date() && quote.status !== "accepted";
  const displayStatus = isExpired && quote.status === "draft" ? "expired" : quote.status;
  const m: Record<string, { bg: string; fg: string; icon?: "check" | "alert" }> = {
    accepted: { bg: zp.semantic.successBg, fg: zp.semantic.success, icon: "check" },
    sent: { bg: zp.surface.bg3, fg: zp.text.muted },
    draft: { bg: zp.surface.bg3, fg: zp.text.muted },
    expired: { bg: zp.semantic.dangerBg, fg: zp.semantic.danger, icon: "alert" },
  };
  const s = m[displayStatus] ?? { bg: zp.surface.bg3, fg: zp.text.muted };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 10, fontWeight: zp.weight.semibold, padding: "3px 10px",
      borderRadius: zp.radius.pill, background: s.bg, color: s.fg,
      letterSpacing: "0.06em", textTransform: "uppercase" as const,
    }}>
      {s.icon === "check" && <CheckCircle2 size={10} />}
      {s.icon === "alert" && <AlertTriangle size={10} />}
      {displayStatus || "—"}
    </span>
  );
}

type PlanRow = { label: string; mode: "percent" | "amount"; value: string; due_date: string };

function ymd(offsetDays: number) {
  const d = new Date(); d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString("en-CA");
}
function presetPlan(kind: "2" | "3"): PlanRow[] {
  return kind === "2"
    ? [
        { label: "Deposit", mode: "percent", value: "50", due_date: ymd(0) },
        { label: "Balance", mode: "percent", value: "", due_date: ymd(30) },
      ]
    : [
        { label: "Deposit 1", mode: "percent", value: "30", due_date: ymd(0) },
        { label: "Deposit 2", mode: "percent", value: "30", due_date: ymd(30) },
        { label: "Balance", mode: "percent", value: "", due_date: ymd(60) },
      ];
}
// Same rule as the server (lib/zenipay/installments.ts resolvePlan): the
// last line is the balance and absorbs rounding.
function previewPlan(total: number, rows: PlanRow[]): number[] {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const amts = rows.map((r) => {
    const v = parseFloat(r.value) || 0;
    return r.mode === "percent" ? r2((total * v) / 100) : r2(v);
  });
  if (amts.length) amts[amts.length - 1] = r2(total - amts.slice(0, -1).reduce((s, a) => s + a, 0));
  return amts;
}
function withExtraRow(p: PlanRow[]): PlanRow[] {
  const last = p[p.length - 1];
  return [...p.slice(0, -1), { label: `Deposit ${p.length}`, mode: "percent", value: "10", due_date: last?.due_date || ymd(0) }, last];
}

function CreateInvoiceModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void | Promise<void> }) {
  const [form, setForm] = useState({
    customer_name: "", customer_email: "", description: "",
    amount: "", tax: "0", notes: "", status: "sent",
  });
  const [split, setSplit] = useState(false);
  const [plan, setPlan] = useState<PlanRow[]>(() => presetPlan("3"));
  const [sendNow, setSendNow] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const setRow = (i: number, patch: Partial<PlanRow>) => setPlan((p) => p.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const total = (parseFloat(form.amount) || 0) + (parseFloat(form.tax) || 0);
  const amounts = previewPlan(total, plan);
  const planError = split && total > 0 && amounts.some((a) => !(a > 0))
    ? "Each installment must be more than $0 (deposits exceed the total?)."
    : null;

  const submit = async () => {
    if (!form.customer_name.trim() || !form.amount) { setErr("Customer name and amount are required."); return; }
    if (split && !form.customer_email.trim()) { setErr("Customer email is required for installments — each payment link is emailed."); return; }
    if (planError) { setErr(planError); return; }
    setSaving(true); setErr(null);
    try {
      const body: Record<string, unknown> = {
        customer_name: form.customer_name.trim(),
        customer_email: form.customer_email.trim(),
        description: form.description.trim() || "Service",
        amount: parseFloat(form.amount) || 0,
        tax: parseFloat(form.tax) || 0,
        currency: "CAD",
        notes: form.notes,
        status: form.status,
        send_now: sendNow,
      };
      if (split) {
        body.installments = plan.map((r, i) => ({
          label: r.label.trim() || (i === plan.length - 1 ? "Balance" : `Deposit ${i + 1}`),
          due_date: r.due_date,
          ...(i === plan.length - 1 ? {} : r.mode === "percent" ? { percent: parseFloat(r.value) || 0 } : { amount: parseFloat(r.value) || 0 }),
        }));
      }
      const res = await fetch(`/api/zenipay/invoices?merchant_id=${encodeURIComponent(mid())}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Invoice creation failed");
      const emailed: string[] = j.emailed || [];
      const num = j.invoice?.invoice_number || "";
      setDone(emailed.length ? `Invoice ${num} created — emailed: ${emailed.join(", ")}.` : `Invoice ${num} created.`);
      await onCreated();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setSaving(false); }
  };

  if (done) {
    return (
      <ModalShell onClose={onClose} title="Invoice created">
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: zp.semantic.success, fontSize: 14, fontWeight: zp.weight.semibold }}>
          <CheckCircle2 size={18} /> {done}
        </div>
        {split && <p style={{ fontSize: 12, color: zp.text.muted, marginTop: 10 }}>Future installments are emailed automatically on their due date, with reminders 3 and 7 days later if unpaid.</p>}
        <div style={{ marginTop: 18 }}><GradientButton variant="primary" size="md" onClick={onClose}>Close</GradientButton></div>
      </ModalShell>
    );
  }

  const chip = (active: boolean): React.CSSProperties => ({
    padding: "7px 12px", borderRadius: zp.radius.sm, fontSize: 12, fontWeight: zp.weight.semibold, cursor: "pointer",
    border: `1px solid ${active ? zp.brand.cyan : zp.surface.border}`, background: active ? zp.surface.bg3 : "transparent", color: zp.text.primary,
  });

  return (
    <ModalShell onClose={onClose} title="Create invoice" subtitle="Bill in full or split into deposits — each payment link is emailed automatically.">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <div>
          <Label>Customer name *</Label>
          <Input value={form.customer_name} onChange={(v) => set("customer_name", v)} placeholder="John Doe" />
        </div>
        <div>
          <Label>Customer email{split ? " *" : ""}</Label>
          <Input value={form.customer_email} onChange={(v) => set("customer_email", v)} placeholder="john@email.com" type="email" />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <Label>Description</Label>
          <Input value={form.description} onChange={(v) => set("description", v)} placeholder="Service or product" />
        </div>
        <div>
          <Label>Amount (CAD) *</Label>
          <Input value={form.amount} onChange={(v) => set("amount", v)} placeholder="0.00" type="number" step="0.01" />
        </div>
        <div>
          <Label>Tax</Label>
          <Input value={form.tax} onChange={(v) => set("tax", v)} placeholder="0.00" type="number" step="0.01" />
        </div>
        {!split && (
          <div>
            <Label>Status</Label>
            <select value={form.status} onChange={(e) => set("status", e.target.value)} style={inputStyle}>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        )}
        <div>
          <Label>Total</Label>
          <div style={{ ...zp.amountStyle.large, fontSize: 22, color: zp.brand.cyan, fontWeight: zp.weight.semibold, padding: "10px 0" }}>
            {zp.fmtCurrency(total)}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <Label>Payment</Label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" style={chip(!split)} onClick={() => setSplit(false)}>Pay in full</button>
          <button type="button" style={chip(split && plan.length === 2)} onClick={() => { setSplit(true); setPlan(presetPlan("2")); }}>2 payments</button>
          <button type="button" style={chip(split && plan.length === 3)} onClick={() => { setSplit(true); setPlan(presetPlan("3")); }}>3 payments</button>
          <button type="button" style={chip(split && plan.length > 3)} onClick={() => { setSplit(true); setPlan((p) => (p.length > 3 ? p : withExtraRow(p))); }}>Custom</button>
        </div>
      </div>

      {split && (
        <div style={{ marginTop: 12, background: zp.surface.bg2, border: `1px solid ${zp.surface.border}`, borderRadius: zp.radius.sm, padding: 12 }}>
          {plan.map((r, i) => {
            const last = i === plan.length - 1;
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(90px,1.2fr) minmax(110px,1fr) minmax(120px,1fr) auto", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <input value={r.label} onChange={(e) => setRow(i, { label: e.target.value })} style={inputStyle} aria-label="Label" />
                {last ? (
                  <div style={{ fontSize: 12, color: zp.text.muted, padding: "0 4px" }}>Remaining balance</div>
                ) : (
                  <div style={{ display: "flex", gap: 4 }}>
                    <input value={r.value} onChange={(e) => setRow(i, { value: e.target.value })} type="number" step="0.01" style={{ ...inputStyle, minWidth: 0 }} aria-label="Value" />
                    <select value={r.mode} onChange={(e) => setRow(i, { mode: e.target.value as PlanRow["mode"] })} style={{ ...inputStyle, width: 58, padding: "0 4px" }} aria-label="Unit">
                      <option value="percent">%</option>
                      <option value="amount">$</option>
                    </select>
                  </div>
                )}
                <input type="date" value={r.due_date} onChange={(e) => setRow(i, { due_date: e.target.value })} style={inputStyle} aria-label="Due date" />
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontFamily: zp.font.mono, fontSize: 13, color: amounts[i] > 0 ? zp.text.primary : zp.semantic.danger, minWidth: 80, textAlign: "right" }}>{zp.fmtCurrency(amounts[i] || 0)}</span>
                  {!last && plan.length > 2 ? (
                    <button type="button" aria-label="Remove" onClick={() => setPlan((p) => p.filter((_, j) => j !== i))} style={{ background: "transparent", border: "none", color: zp.text.muted, cursor: "pointer" }}><X size={14} /></button>
                  ) : <span style={{ width: 20 }} />}
                </div>
              </div>
            );
          })}
          {plan.length < 12 && (
            <button type="button" onClick={() => setPlan(withExtraRow)}
              style={{ background: "transparent", border: "none", color: zp.brand.cyan, fontSize: 12, fontWeight: zp.weight.semibold, cursor: "pointer", padding: 0 }}>
              + Add installment
            </button>
          )}
          {planError && <div style={{ marginTop: 8, fontSize: 12, color: zp.semantic.danger }}>{planError}</div>}
          <p style={{ fontSize: 11, color: zp.text.muted, margin: "8px 0 0" }}>Installments due today are emailed on creation; the others go out automatically on their date. The customer gets a receipt with the remaining balance after each payment.</p>
        </div>
      )}

      {!split && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, fontSize: 13, color: zp.text.primary, cursor: "pointer" }}>
          <input type="checkbox" checked={sendNow} onChange={(e) => setSendNow(e.target.checked)} /> Email the invoice to the customer now
        </label>
      )}

      <div style={{ marginTop: 14 }}>
        <Label>Notes</Label>
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={2}
          placeholder="Internal note (not shown to customer)"
          style={{ ...inputStyle, resize: "vertical" as const }}
        />
      </div>
      {err && (
        <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: zp.radius.sm, background: zp.semantic.dangerBg, color: zp.semantic.danger, fontSize: 12, fontWeight: zp.weight.semibold }}>{err}</div>
      )}
      <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
        <GradientButton variant="secondary" size="md" onClick={onClose} style={{ flex: 1 }}>Cancel</GradientButton>
        <GradientButton variant="primary" size="md" onClick={submit} disabled={saving || !form.customer_name || !form.amount || !!planError} style={{ flex: 1 }}>
          {saving ? "Creating…" : split ? `Create & send ${plan.length} payment links` : "Create invoice"}
        </GradientButton>
      </div>
    </ModalShell>
  );
}

interface InstallmentRow {
  id: string; seq: number; label: string; amount: number; currency: string;
  due_date: string; status: string; pay_url: string; paid_at: string | null; sent_at: string | null; payment_ref: string | null;
}

function InstallmentsPanel({ invoice }: { invoice: Invoice }) {
  const [rows, setRows] = useState<InstallmentRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const url = `/api/zenipay/invoices/${encodeURIComponent(invoice.id)}/installments?merchant_id=${encodeURIComponent(mid())}`;
  const load = useCallback(async () => {
    const j = await fetch(url).then((r) => r.json()).catch(() => ({}));
    setRows(Array.isArray(j.installments) ? j.installments : []);
  }, [url]);
  useEffect(() => { void load(); }, [load]);

  const act = async (row: InstallmentRow, action: "send" | "cancel") => {
    setBusy(row.id + action); setMsg(null);
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, installment_id: row.id }) });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? (action === "send" ? `Payment link for ${row.label} emailed.` : `${row.label} cancelled.`) : j.error || "Failed.");
    setBusy(null);
    void load();
  };

  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ fontSize: 11, color: zp.text.muted, fontWeight: zp.weight.semibold, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>
        Installments
      </div>
      <div style={{ background: zp.surface.bg2, borderRadius: zp.radius.sm, padding: 12 }}>
        {rows === null && <div style={{ fontSize: 12, color: zp.text.muted }}>Loading…</div>}
        {rows?.length === 0 && <div style={{ fontSize: 12, color: zp.text.muted }}>No installments found.</div>}
        {rows?.map((r, i) => (
          <div key={r.id} style={{ padding: "8px 0", borderBottom: i < rows.length - 1 ? `1px solid ${zp.surface.border}` : "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 13, color: zp.text.primary, fontWeight: zp.weight.semibold }}>{r.label}</div>
                <div style={{ fontSize: 11, color: zp.text.muted }}>
                  {r.status === "paid" && r.paid_at ? `Paid ${zp.fmtDateTime(r.paid_at)}` : `Due ${r.due_date}`}
                  {r.status !== "paid" && r.sent_at ? " · link sent" : ""}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: zp.font.mono, fontSize: 13, color: zp.text.primary }}>{zp.fmtCurrency(Number(r.amount), r.currency || "CAD")}</span>
                <StatusPill status={r.status} />
              </div>
            </div>
            {r.status !== "paid" && r.status !== "cancelled" && (
              <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
                <button type="button" onClick={() => act(r, "send")} disabled={!!busy} style={linkBtn}>
                  {busy === r.id + "send" ? "Sending…" : r.sent_at ? "Send reminder" : "Send link now"}
                </button>
                <button type="button" onClick={() => { if (navigator.clipboard) void navigator.clipboard.writeText(r.pay_url); setMsg("Link copied."); }} style={linkBtn}>Copy link</button>
                <button type="button" onClick={() => act(r, "cancel")} disabled={!!busy} style={{ ...linkBtn, color: zp.text.muted }}>Cancel</button>
              </div>
            )}
          </div>
        ))}
        {msg && <div style={{ fontSize: 12, color: zp.text.muted, marginTop: 8 }}>{msg}</div>}
      </div>
    </div>
  );
}

const linkBtn: React.CSSProperties = { background: "transparent", border: "none", padding: 0, color: zp.brand.cyan, fontSize: 12, fontWeight: zp.weight.semibold, cursor: "pointer" };

function InvoiceDetail({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const items: Array<{ description: string; qty: number; unit_price: number; total: number }> =
    typeof invoice.items === "string"
      ? (() => { try { return JSON.parse(invoice.items as string); } catch { return []; } })()
      : (invoice.items ?? []);

  // The invoice issuer is the merchant. Older rows may not have
  // merchant_name/email persisted — fall back to the logged-in
  // merchant's session values so the viewer always sees a "From"
  // line instead of "—".
  const issuerName  = invoice.merchant_name  || bname() || "Your business";
  const issuerEmail = invoice.merchant_email || bemail() || "";

  const [to, setTo] = useState(invoice.customer_email || "");
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const send = async () => {
    setSending(true); setSendMsg(null);
    try {
      const r = await fetch(`/api/zenipay/invoices/send?merchant_id=${encodeURIComponent(mid())}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice_id: invoice.id, to: to.trim() || undefined }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        const text = j.error === "NO_CUSTOMER_EMAIL" ? "Enter the customer's email first."
          : j.error === "EMAIL_FAILED" ? "Email could not be sent. Try again."
          : j.error || "Send failed.";
        setSendMsg({ ok: false, text });
      } else {
        setSendMsg({ ok: true, text: `Invoice emailed to ${j.sent_to}` });
      }
    } catch (e) {
      setSendMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally { setSending(false); }
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: zp.surface.overlay, backdropFilter: "blur(4px)", zIndex: zp.zIndex.modal, display: "flex", justifyContent: "flex-end" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "min(520px, 100vw)", height: "100vh", background: zp.surface.bg1, boxShadow: zp.elevation.lg, overflowY: "auto" }}
      >
        <div style={{ padding: "22px 24px", borderBottom: `1px solid ${zp.surface.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <StatusPill status={invoice.status} />
            <h2 style={{ margin: "10px 0 2px", fontSize: 22, fontFamily: zp.font.display, fontWeight: zp.weight.semibold, color: zp.text.primary, letterSpacing: "-0.02em" }}>
              {invoice.invoice_number || invoice.id}
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: zp.text.muted }}>{invoice.customer_name}</p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: zp.surface.bg3, border: "none", borderRadius: zp.radius.sm, width: 30, height: 30, cursor: "pointer", color: zp.text.primary, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          <div style={{ ...zp.amountStyle.hero, fontSize: 44, marginBottom: 4, color: zp.text.primary }}>
            {zp.fmtCurrency(Number(invoice.total || 0), invoice.currency || "CAD")}
          </div>
          <div style={{ fontSize: 11, color: zp.text.muted, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: zp.weight.semibold }}>
            {invoice.status === "partial"
              ? `Total · ${zp.fmtCurrency(Number(invoice.amount_paid || 0), invoice.currency || "CAD")} paid · ${zp.fmtCurrency(Math.max(0, Number(invoice.total || 0) - Number(invoice.amount_paid || 0)), invoice.currency || "CAD")} left`
              : "Total due"}
          </div>

          <div style={{ height: 1, background: zp.surface.border, margin: "18px 0" }} />

          <div style={{ marginBottom: 18, padding: "12px 14px", background: zp.surface.bg2, borderRadius: zp.radius.sm, border: `1px solid ${zp.surface.border}` }}>
            <div style={{ fontSize: 10, color: zp.text.muted, fontWeight: zp.weight.semibold, letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: 4 }}>
              From
            </div>
            <div style={{ fontSize: 14, color: zp.text.primary, fontWeight: zp.weight.semibold }}>
              {issuerName}
            </div>
            {issuerEmail && (
              <div style={{ fontSize: 12, color: zp.text.muted, marginTop: 2 }}>
                {issuerEmail}
              </div>
            )}
          </div>

          <dl style={{ margin: 0 }}>
            <DRow label="From" value={issuerName} />
            <DRow label="Client" value={invoice.customer_name || "—"} />
            {invoice.customer_email && <DRow label="Email" value={invoice.customer_email} />}
            <DRow label="Issued" value={zp.fmtDateTime(invoice.created_at)} />
            {invoice.paid_at && <DRow label="Paid" value={zp.fmtDateTime(invoice.paid_at)} />}
            <DRow label="Subtotal" value={zp.fmtCurrency(Number(invoice.subtotal || invoice.total || 0), invoice.currency || "CAD")} mono />
            {invoice.tax != null && Number(invoice.tax) !== 0 && (
              <DRow label="Tax" value={zp.fmtCurrency(Number(invoice.tax), invoice.currency || "CAD")} mono />
            )}
            <DRow label="Total" value={zp.fmtCurrency(Number(invoice.total), invoice.currency || "CAD")} mono bold />
          </dl>

          {items.length > 0 && (
            <div style={{ marginTop: 22 }}>
              <div style={{ fontSize: 11, color: zp.text.muted, fontWeight: zp.weight.semibold, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>
                Line items
              </div>
              <div style={{ background: zp.surface.bg2, borderRadius: zp.radius.sm, padding: 12 }}>
                {items.map((it, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: i < items.length - 1 ? `1px solid ${zp.surface.border}` : "none", fontSize: 13, color: zp.text.primary }}>
                    <span>{it.description} × {it.qty}</span>
                    <span style={{ fontFamily: zp.font.mono }}>{zp.fmtCurrency(Number(it.total ?? (it.qty * it.unit_price)), invoice.currency || "CAD")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 22 }}>
            <Label>Customer email</Label>
            <Input value={to} onChange={setTo} placeholder="client@email.com" type="email" />
          </div>
          {sendMsg && (
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: sendMsg.ok ? zp.semantic.success : zp.semantic.danger }}>
              {sendMsg.ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />} {sendMsg.text}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <GradientButton variant="primary" size="md" icon={<Send size={14} />} onClick={send} disabled={sending || !to.trim()}>
              {sending ? "Sending…" : "Send to customer"}
            </GradientButton>
            <GradientButton variant="secondary" size="md" icon={<Download size={14} />} onClick={() => window.print()}>
              Download PDF
            </GradientButton>
            <GradientButton variant="ghost" size="md" icon={<FileText size={14} />} onClick={() => {
              if (navigator.clipboard) navigator.clipboard.writeText(JSON.stringify(invoice, null, 2));
            }}>
              Copy JSON
            </GradientButton>
          </div>

          {invoice.has_installments && <InstallmentsPanel invoice={invoice} />}

          {invoice.notes && (
            <div style={{ marginTop: 22, padding: 12, background: zp.surface.bg2, borderRadius: zp.radius.sm, fontSize: 12, color: zp.text.muted }}>
              {invoice.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateQuoteModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void | Promise<void> }) {
  const [form, setForm] = useState({
    customer_name: "", customer_email: "", description: "",
    amount: "", tax: "0", notes: "", validity_days: "30",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.customer_name.trim() || !form.amount) { setErr("Customer name and amount are required."); return; }
    setSaving(true); setErr(null);
    try {
      const qteId = "QTE-" + Date.now().toString(36).toUpperCase();
      const amt = parseFloat(form.amount) || 0;
      const taxAmt = parseFloat(form.tax) || 0;
      const total = amt + taxAmt;
      const validityDays = parseInt(form.validity_days) || 30;
      const payload = {
        id: qteId,
        quote_number: qteId,
        merchant_id: mid(),
        customer_name: form.customer_name,
        customer_email: form.customer_email,
        items: JSON.stringify([{ description: form.description || "Service", qty: 1, unit_price: amt, total: amt }]),
        subtotal: amt,
        tax: taxAmt,
        total,
        currency: "CAD",
        status: "draft",
        notes: form.notes,
        validity_days: validityDays,
      };
      const r = await fetch("/api/zenipay/quotes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error("Devis creation failed");
      await onCreated();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setSaving(false); }
  };

  return (
    <ModalShell onClose={onClose} title="Create devis" subtitle="Send a professional quote to your client.">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <Label>Customer name *</Label>
          <Input value={form.customer_name} onChange={(v) => set("customer_name", v)} placeholder="John Doe" />
        </div>
        <div>
          <Label>Customer email</Label>
          <Input value={form.customer_email} onChange={(v) => set("customer_email", v)} placeholder="john@email.com" type="email" />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <Label>Description</Label>
          <Input value={form.description} onChange={(v) => set("description", v)} placeholder="Service or product" />
        </div>
        <div>
          <Label>Amount (CAD) *</Label>
          <Input value={form.amount} onChange={(v) => set("amount", v)} placeholder="0.00" type="number" step="0.01" />
        </div>
        <div>
          <Label>Tax</Label>
          <Input value={form.tax} onChange={(v) => set("tax", v)} placeholder="0.00" type="number" step="0.01" />
        </div>
        <div>
          <Label>Validity (days)</Label>
          <input value={form.validity_days} onChange={(e) => set("validity_days", e.target.value)} placeholder="30" type="number" min="1" style={inputStyle} />
        </div>
        <div>
          <Label>Total</Label>
          <div style={{ ...zp.amountStyle.large, fontSize: 22, color: zp.brand.violet, fontWeight: zp.weight.semibold, padding: "10px 0" }}>
            {zp.fmtCurrency((parseFloat(form.amount) || 0) + (parseFloat(form.tax) || 0))}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <Label>Notes</Label>
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={2}
          placeholder="Quote terms..."
          style={{ ...inputStyle, resize: "vertical" as const }}
        />
      </div>
      {err && (
        <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: zp.radius.sm, background: zp.semantic.dangerBg, color: zp.semantic.danger, fontSize: 12, fontWeight: zp.weight.semibold }}>{err}</div>
      )}
      <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
        <GradientButton variant="secondary" size="md" onClick={onClose} style={{ flex: 1 }}>Cancel</GradientButton>
        <GradientButton variant="primary" size="md" onClick={submit} disabled={saving || !form.customer_name || !form.amount} style={{ flex: 1 }}>
          {saving ? "Creating…" : "Create devis"}
        </GradientButton>
      </div>
    </ModalShell>
  );
}

function QuoteDetail({ quote, onClose, onStatusUpdate }: { quote: Quote; onClose: () => void; onStatusUpdate: (id: string, status: string) => Promise<void> }) {
  const isExpired = quote.expires_at && new Date(quote.expires_at) < new Date() && quote.status !== "accepted";
  const displayStatus = isExpired && quote.status === "draft" ? "expired" : quote.status;

  let items: Array<{ description: string; qty: number; unit_price: number; total: number }> = [];
  try {
    if (quote.items) {
      const raw = typeof quote.items === "string" ? JSON.parse(quote.items) : quote.items;
      if (Array.isArray(raw)) items = raw;
    }
  } catch {}

  const issuerName  = bname() || "Your business";
  const issuerEmail = bemail() || "";

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: zp.surface.overlay, backdropFilter: "blur(4px)", zIndex: zp.zIndex.modal, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(520px, 100vw)", height: "100vh", background: zp.surface.bg1, boxShadow: zp.elevation.lg, overflowY: "auto" }}>
        <div style={{ padding: "22px 24px", borderBottom: `1px solid ${zp.surface.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <QuoteStatusPill quote={quote} />
            <h2 style={{ margin: "10px 0 2px", fontSize: 22, fontFamily: zp.font.display, fontWeight: zp.weight.semibold, color: zp.text.primary, letterSpacing: "-0.02em" }}>
              {quote.quote_number || quote.id}
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: zp.text.muted }}>{quote.customer_name}</p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: zp.surface.bg3, border: "none", borderRadius: zp.radius.sm, width: 30, height: 30, cursor: "pointer", color: zp.text.primary, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          <div style={{ ...zp.amountStyle.hero, fontSize: 44, marginBottom: 4, color: zp.text.primary }}>
            {zp.fmtCurrency(Number(quote.total || 0), quote.currency || "CAD")}
          </div>
          <div style={{ fontSize: 11, color: zp.text.muted, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: zp.weight.semibold }}>
            Total
          </div>

          <div style={{ height: 1, background: zp.surface.border, margin: "18px 0" }} />

          <div style={{ marginBottom: 18, padding: "12px 14px", background: zp.surface.bg2, borderRadius: zp.radius.sm, border: `1px solid ${zp.surface.border}` }}>
            <div style={{ fontSize: 10, color: zp.text.muted, fontWeight: zp.weight.semibold, letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: 4 }}>
              From
            </div>
            <div style={{ fontSize: 14, color: zp.text.primary, fontWeight: zp.weight.semibold }}>
              {issuerName}
            </div>
            {issuerEmail && <div style={{ fontSize: 12, color: zp.text.muted, marginTop: 2 }}>{issuerEmail}</div>}
          </div>

          <dl style={{ margin: 0 }}>
            <DRow label="From" value={issuerName} />
            <DRow label="Client" value={quote.customer_name || "—"} />
            {quote.customer_email && <DRow label="Email" value={quote.customer_email} />}
            <DRow label="Issued" value={zp.fmtDateTime(quote.created_at)} />
            <DRow label="Expires" value={quote.expires_at ? zp.fmtDate(quote.expires_at) : "—"} />
            {quote.validity_days && <DRow label="Validity" value={`${quote.validity_days} days`} />}
            <DRow label="Subtotal" value={zp.fmtCurrency(Number(quote.subtotal || quote.total || 0), quote.currency || "CAD")} mono />
            {quote.tax != null && Number(quote.tax) !== 0 && (
              <DRow label="Tax" value={zp.fmtCurrency(Number(quote.tax), quote.currency || "CAD")} mono />
            )}
            <DRow label="Total" value={zp.fmtCurrency(Number(quote.total), quote.currency || "CAD")} mono bold />
          </dl>

          {items.length > 0 && (
            <div style={{ marginTop: 22 }}>
              <div style={{ fontSize: 11, color: zp.text.muted, fontWeight: zp.weight.semibold, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>
                Line items
              </div>
              <div style={{ background: zp.surface.bg2, borderRadius: zp.radius.sm, padding: 12 }}>
                {items.map((it, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: i < items.length - 1 ? `1px solid ${zp.surface.border}` : "none", fontSize: 13, color: zp.text.primary }}>
                    <span>{it.description} × {it.qty}</span>
                    <span style={{ fontFamily: zp.font.mono }}>{zp.fmtCurrency(Number(it.total ?? (it.qty * it.unit_price)), quote.currency || "CAD")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 22, flexWrap: "wrap" }}>
            {displayStatus === "draft" && (
              <GradientButton variant="primary" size="md" icon={<Send size={14} />} onClick={() => onStatusUpdate(quote.id, "sent")}>
                Send to customer
              </GradientButton>
            )}
            {displayStatus === "sent" && (
              <GradientButton variant="primary" size="md" icon={<CheckCircle2 size={14} />} onClick={() => onStatusUpdate(quote.id, "accepted")}>
                Mark accepted
              </GradientButton>
            )}
            <GradientButton variant="secondary" size="md" icon={<Download size={14} />} onClick={() => window.print()}>
              Download PDF
            </GradientButton>
          </div>

          {quote.notes && (
            <div style={{ marginTop: 22, padding: 12, background: zp.surface.bg2, borderRadius: zp.radius.sm, fontSize: 12, color: zp.text.muted }}>
              {quote.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DRow({ label, value, mono, bold }: { label: string; value: React.ReactNode; mono?: boolean; bold?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", padding: "8px 0", borderBottom: `1px solid ${zp.surface.border}`, alignItems: "center" }}>
      <dt style={{ fontSize: 11, color: zp.text.muted, fontWeight: zp.weight.semibold, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>{label}</dt>
      <dd style={{ margin: 0, fontSize: 13, color: zp.text.primary, fontFamily: mono ? zp.font.mono : undefined, fontWeight: bold ? zp.weight.semibold : undefined, textAlign: mono ? "right" as const : "left" as const }}>{value}</dd>
    </div>
  );
}

function ModalShell({ title, subtitle, children, onClose }: { title: string; subtitle?: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: zp.surface.overlay, backdropFilter: "blur(6px)", zIndex: zp.zIndex.modal, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: zp.surface.bg1, borderRadius: zp.radius.lg, width: "100%", maxWidth: 600, maxHeight: "92vh", overflow: "auto", boxShadow: zp.elevation.lg }}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${zp.surface.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontFamily: zp.font.display, fontSize: 20, fontWeight: zp.weight.semibold, color: zp.text.primary, letterSpacing: "-0.02em" }}>{title}</h2>
            {subtitle && <p style={{ margin: "3px 0 0", fontSize: 12, color: zp.text.muted }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: "transparent", border: "none", fontSize: 20, color: zp.text.muted, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ padding: 22 }}>{children}</div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label style={{ display: "block", fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6 }}>{children}</label>;
}
function Input({ value, onChange, placeholder, type = "text", step }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; step?: string }) {
  return <input type={type} step={step} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />;
}
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: zp.radius.sm,
  border: `1px solid ${zp.surface.border}`, background: zp.surface.bg2,
  color: zp.text.primary, fontSize: 14, boxSizing: "border-box", outline: "none", fontFamily: zp.font.sans,
};
