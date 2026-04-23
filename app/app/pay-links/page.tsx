// /app/pay-links — payment links dashboard on the new DashboardShell.
//
// Lists every row in zenipay_pay_links, counts opens / conversions from the
// `uses` column the existing API already returns, and lets the merchant
// copy the shareable URL (served by /pay/[slug] — untouched by this PR).

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Copy, Trash2, QrCode, ExternalLink, X } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BankingCard } from "@/components/dashboard/BankingCard";
import { DataTable } from "@/components/dashboard/DataTable";
import { GradientButton } from "@/components/dashboard/GradientButton";
import zp from "@/lib/design-system/zenipay-brand";

function Stat({ label, value, sub, accent }: { label: string; value: React.ReactNode; sub?: string; accent?: "cyan" | "violet" | "green" | "neutral" }) {
  return (
    <BankingCard accent={accent ?? "neutral"}>
      <div style={{ fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted, letterSpacing: "0.12em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ ...zp.amountStyle.large, fontSize: 22, marginTop: 6, color: zp.text.primary }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: zp.text.muted, marginTop: 4 }}>{sub}</div>}
    </BankingCard>
  );
}

interface PayLink {
  id: string;
  url: string;
  amount: number;
  currency?: string;
  description: string;
  status: string;
  uses: number;
  created_at: string;
  expires_at?: string;
  merchant_id?: string;
}

function mid() { return typeof window === "undefined" ? "" : sessionStorage.getItem("zp_client") || ""; }

export default function PayLinksPage() {
  const [links, setLinks] = useState<PayLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [justCreated, setJustCreated] = useState<{ url: string; id: string } | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "archived">("all");

  const load = useCallback(async () => {
    if (!mid()) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/zenipay/create-link?merchant_id=${encodeURIComponent(mid())}`).then((x) => x.json());
      setLinks((r.links ?? []) as PayLink[]);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => {
    const active = links.filter((l) => l.status === "active");
    const totalCollected = links.reduce((s, l) => s + (Number(l.amount || 0) * Number(l.uses || 0)), 0);
    const totalUses = links.reduce((s, l) => s + Number(l.uses || 0), 0);
    return {
      active: active.length,
      totalCollected,
      conversionRate: links.length > 0 ? Math.round((totalUses / links.length) * 100) / 100 : 0,
    };
  }, [links]);

  const filtered = useMemo(() => {
    if (filter === "all") return links;
    if (filter === "active") return links.filter((l) => l.status === "active");
    return links.filter((l) => l.status !== "active");
  }, [links, filter]);

  const copyLink = (url: string) => { if (navigator.clipboard) navigator.clipboard.writeText(url); };

  const remove = async (id: string) => {
    if (!confirm("Delete this payment link? Shared copies will stop working.")) return;
    await fetch(`/api/zenipay/create-link?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await load();
  };

  return (
    <DashboardShell mode="merchant">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: zp.font.display, fontSize: 32, letterSpacing: "-0.03em", fontWeight: zp.weight.semibold, color: zp.text.primary }}>Payment links</h1>
          <p style={{ margin: "4px 0 0", color: zp.text.muted, fontSize: 13 }}>Share a URL. Accept money. Track who pays.</p>
        </div>
        <GradientButton variant="primary" size="md" onClick={() => setCreateOpen(true)} icon={<Plus size={14} />}>
          Create payment link
        </GradientButton>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 18 }}>
        <Stat label="Active links" value={String(stats.active)} sub={`${links.length} total`} accent="cyan" />
        <Stat label="Total collected" value={zp.fmtCurrency(stats.totalCollected)} sub="Sum over all links" accent="cyan" />
        <Stat label="Avg uses / link" value={stats.conversionRate.toFixed(2)} sub="Paid conversions" accent="cyan" />
      </div>

      <BankingCard padding={14} style={{ marginBottom: 14 }}>
        <div style={{ display: "inline-flex", gap: 2, padding: 3, background: zp.surface.bg2, border: `1px solid ${zp.surface.border}`, borderRadius: zp.radius.sm }}>
          {(["all", "active", "archived"] as const).map((f) => {
            const active = f === filter;
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
              >{f}</button>
            );
          })}
        </div>
      </BankingCard>

      <BankingCard padding="none">
        <DataTable
          rows={filtered}
          loading={loading && links.length === 0}
          rowKey={(l) => l.id}
          columns={[
            { key: "desc", header: "Description", cell: (l) => (
              <div style={{ minWidth: 0 }}>
                <div style={{ color: zp.text.primary, fontWeight: zp.weight.semibold }}>{l.description || "Payment link"}</div>
                <div style={{ fontSize: 11, color: zp.text.dim, fontFamily: zp.font.mono, marginTop: 2, maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{l.url}</div>
              </div>
            ) },
            { key: "amount", header: "Amount", mono: true, align: "right", width: 150,
              cell: (l) => (<span style={{ color: zp.brand.cyan, fontWeight: zp.weight.semibold }}>{zp.fmtCurrency(Number(l.amount || 0), l.currency || "CAD")}</span>) },
            { key: "uses", header: "Uses", mono: true, align: "right", width: 80,
              cell: (l) => <span style={{ color: zp.text.primary }}>{Number(l.uses || 0)}</span> },
            { key: "status", header: "Status", width: 110, cell: (l) => <StatusPill status={l.status} /> },
            { key: "date", header: "Created", cell: (l) => zp.fmtDate(l.created_at), width: 130 },
            { key: "act", header: "", align: "right", width: 150,
              cell: (l) => (
                <div style={{ display: "inline-flex", gap: 6 }}>
                  <button onClick={(e) => { e.stopPropagation(); copyLink(l.url); }} title="Copy URL" style={iconBtn}><Copy size={13} /></button>
                  <a href={l.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} title="Open public page" style={iconBtn}><ExternalLink size={13} /></a>
                  <button onClick={(e) => { e.stopPropagation(); void remove(l.id); }} title="Delete" style={{ ...iconBtn, color: zp.semantic.danger }}><Trash2 size={13} /></button>
                </div>
              ) },
          ]}
          empty={
            <div>
              <p style={{ margin: "0 0 12px", color: zp.text.primary, fontWeight: zp.weight.semibold }}>You haven&apos;t created any links yet</p>
              <GradientButton variant="primary" size="md" onClick={() => setCreateOpen(true)} icon={<Plus size={14} />}>Create your first link</GradientButton>
            </div>
          }
        />
      </BankingCard>

      {createOpen && (
        <CreateLinkModal
          onClose={() => setCreateOpen(false)}
          onCreated={async (created) => { setJustCreated(created); setCreateOpen(false); await load(); }}
        />
      )}
      {justCreated && <LinkCreatedToast url={justCreated.url} onDismiss={() => setJustCreated(null)} />}
    </DashboardShell>
  );
}

function StatusPill({ status }: { status: string }) {
  const key = status?.toLowerCase() || "";
  const m: Record<string, { bg: string; fg: string }> = {
    active: { bg: zp.semantic.successBg, fg: zp.semantic.success },
    expired: { bg: zp.surface.bg3, fg: zp.text.muted },
    archived: { bg: zp.surface.bg3, fg: zp.text.muted },
  };
  const s = m[key] ?? { bg: zp.surface.bg3, fg: zp.text.muted };
  return (
    <span style={{ fontSize: 10, fontWeight: zp.weight.semibold, padding: "3px 10px", borderRadius: zp.radius.pill, background: s.bg, color: s.fg, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
      {status || "—"}
    </span>
  );
}

function CreateLinkModal({ onClose, onCreated }: { onClose: () => void; onCreated: (r: { id: string; url: string }) => void }) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("CAD");
  const [expiry, setExpiry] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) { setErr("Amount must be greater than 0."); return; }
    setSaving(true); setErr(null);
    try {
      const r = await fetch("/api/zenipay/create-link", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt, currency, description, expiry: expiry || undefined, merchant_id: mid() }),
      });
      const data = await r.json();
      if (data.url && data.id) onCreated({ id: data.id, url: data.url });
      else setErr(data.error || "Failed to create link.");
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setSaving(false); }
  };

  return (
    <ModalShell onClose={onClose} title="Create payment link" subtitle="Share a URL with your clients. They pay, you get notified.">
      <Label>Amount</Label>
      <Input value={amount} onChange={setAmount} placeholder="0.00" type="number" step="0.01" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
        <div>
          <Label>Currency</Label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={inputStyle}>
            <option value="CAD">CAD</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
        <div>
          <Label>Expires</Label>
          <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} style={inputStyle} />
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <Label>Description</Label>
        <Input value={description} onChange={setDescription} placeholder="What is this link for?" />
      </div>
      {err && (
        <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: zp.radius.sm, background: zp.semantic.dangerBg, color: zp.semantic.danger, fontSize: 12, fontWeight: zp.weight.semibold }}>{err}</div>
      )}
      <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
        <GradientButton variant="secondary" size="md" onClick={onClose} style={{ flex: 1 }}>Cancel</GradientButton>
        <GradientButton variant="primary" size="md" onClick={submit} disabled={saving || !amount} style={{ flex: 1 }} icon={<QrCode size={14} />}>
          {saving ? "Creating…" : "Generate link"}
        </GradientButton>
      </div>
    </ModalShell>
  );
}

function LinkCreatedToast({ url, onDismiss }: { url: string; onDismiss: () => void }) {
  return (
    <div style={{
      position: "fixed", right: 24, bottom: 24, zIndex: zp.zIndex.toast,
      background: zp.surface.bg1, border: `1px solid ${zp.surface.border}`,
      borderRadius: zp.radius.md, padding: "14px 16px",
      boxShadow: zp.elevation.lg, maxWidth: 440,
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: zp.semantic.success, boxShadow: `0 0 10px ${zp.semantic.success}66` }} />
          <span style={{ fontSize: 13, fontWeight: zp.weight.semibold, color: zp.text.primary }}>Link ready to share</span>
        </div>
        <button onClick={onDismiss} aria-label="Dismiss" style={{ background: "transparent", border: "none", cursor: "pointer", color: zp.text.muted }}>
          <X size={14} />
        </button>
      </div>
      <div style={{ fontSize: 11, fontFamily: zp.font.mono, color: zp.text.primary, background: zp.surface.bg2, padding: "8px 10px", borderRadius: zp.radius.sm, wordBreak: "break-all" as const }}>{url}</div>
      <div style={{ display: "flex", gap: 8 }}>
        <GradientButton variant="primary" size="sm" onClick={() => { if (navigator.clipboard) navigator.clipboard.writeText(url); }} icon={<Copy size={12} />}>Copy</GradientButton>
        <GradientButton variant="ghost" size="sm" href={url} icon={<ExternalLink size={12} />}>Open</GradientButton>
      </div>
    </div>
  );
}

function ModalShell({ title, subtitle, children, onClose }: { title: string; subtitle?: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: zp.surface.overlay, backdropFilter: "blur(6px)", zIndex: zp.zIndex.modal, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: zp.surface.bg1, borderRadius: zp.radius.lg, width: "100%", maxWidth: 520, maxHeight: "92vh", overflow: "auto", boxShadow: zp.elevation.lg }}>
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
const iconBtn: React.CSSProperties = {
  width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center",
  background: "transparent", border: `1px solid ${zp.surface.border}`, borderRadius: zp.radius.sm,
  color: zp.text.muted, cursor: "pointer", textDecoration: "none",
};
