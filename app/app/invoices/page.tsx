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
  merchant_id?: string;
  merchant_name?: string;
  merchant_email?: string;
}

type StatusFilter = "all" | "draft" | "sent" | "paid" | "overdue";

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

  const load = useCallback(async () => {
    if (!mid()) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/zenipay/stats?merchant_id=${encodeURIComponent(mid())}`).then((x) => x.json());
      setInvoices((r.recent_invoices ?? []) as Invoice[]);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => {
    const outstanding = invoices.filter((i) => i.status !== "paid");
    const overdue = invoices.filter((i) => i.status === "overdue");
    const draft = invoices.filter((i) => i.status === "draft");
    const paid = invoices.filter((i) => i.status === "paid");
    return {
      outstandingTotal: outstanding.reduce((s, i) => s + Number(i.total || 0), 0),
      outstandingCount: outstanding.length,
      paidTotal: paid.reduce((s, i) => s + Number(i.total || 0), 0),
      paidCount: paid.length,
      overdueCount: overdue.length,
      draftCount: draft.length,
    };
  }, [invoices]);

  const filtered = useMemo(() => {
    if (filter === "all") return invoices;
    return invoices.filter((i) => i.status === filter);
  }, [invoices, filter]);

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
          {(["all", "draft", "sent", "paid", "overdue"] as StatusFilter[]).map((f) => {
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

      {createOpen && (
        <CreateInvoiceModal
          onClose={() => setCreateOpen(false)}
          onCreated={async () => { setCreateOpen(false); await load(); }}
        />
      )}
      {selected && <InvoiceDetail invoice={selected} onClose={() => setSelected(null)} />}
    </DashboardShell>
  );
}

function StatusPill({ status }: { status: string }) {
  const key = status?.toLowerCase() || "";
  const m: Record<string, { bg: string; fg: string; icon?: "check" | "alert" }> = {
    paid: { bg: zp.semantic.successBg, fg: zp.semantic.success, icon: "check" },
    sent: { bg: zp.surface.bg3, fg: zp.text.muted },
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

function CreateInvoiceModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void | Promise<void> }) {
  const [form, setForm] = useState({
    customer_name: "", customer_email: "", description: "",
    amount: "", tax: "0", notes: "", status: "draft",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.customer_name.trim() || !form.amount) { setErr("Customer name and amount are required."); return; }
    setSaving(true); setErr(null);
    try {
      const invId = "INV-" + Date.now().toString(36).toUpperCase();
      const now = new Date().toISOString();
      const amt = parseFloat(form.amount) || 0;
      const taxAmt = parseFloat(form.tax) || 0;
      const total = amt + taxAmt;
      const invoiceData = {
        id: invId, invoice_number: invId, merchant_id: mid(),
        customer_name: form.customer_name, customer_email: form.customer_email,
        items: JSON.stringify([{ description: form.description || "Service", qty: 1, unit_price: amt, total: amt }]),
        subtotal: amt, tax: taxAmt, total, currency: "CAD", status: form.status,
        notes: form.notes, merchant_name: bname(), merchant_email: bemail(),
        created_at: now, updated_at: now,
      };
      const r = await fetch(`/api/zenipay/merchant-data?merchant_id=${encodeURIComponent(mid())}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _direct_invoice: invoiceData }),
      });
      if (!r.ok) throw new Error("Invoice creation failed");
      await onCreated();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setSaving(false); }
  };

  return (
    <ModalShell onClose={onClose} title="Create invoice" subtitle="Invoice your client in one click. Auto-linked to a payment link.">
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
          <Label>Status</Label>
          <select value={form.status} onChange={(e) => set("status", e.target.value)} style={inputStyle}>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
        <div>
          <Label>Total</Label>
          <div style={{ ...zp.amountStyle.large, fontSize: 22, color: zp.brand.cyan, fontWeight: zp.weight.semibold, padding: "10px 0" }}>
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
          placeholder="Internal note (not shown to customer)"
          style={{ ...inputStyle, resize: "vertical" as const }}
        />
      </div>
      {err && (
        <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: zp.radius.sm, background: zp.semantic.dangerBg, color: zp.semantic.danger, fontSize: 12, fontWeight: zp.weight.semibold }}>{err}</div>
      )}
      <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
        <GradientButton variant="secondary" size="md" onClick={onClose} style={{ flex: 1 }}>Cancel</GradientButton>
        <GradientButton variant="primary" size="md" onClick={submit} disabled={saving || !form.customer_name || !form.amount} style={{ flex: 1 }}>
          {saving ? "Creating…" : "Create invoice"}
        </GradientButton>
      </div>
    </ModalShell>
  );
}

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
            Total due
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

          <div style={{ display: "flex", gap: 8, marginTop: 22, flexWrap: "wrap" }}>
            <GradientButton variant="primary" size="md" icon={<Send size={14} />} onClick={() => alert("Send-invoice flow stays in /app/banking for now.")}>
              Send to customer
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
