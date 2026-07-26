// /app/payouts — Payout dashboard page.
//
// Shows current balance, recent payout requests, and lets the merchant
// request a new payout to their bank account.

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { SendHorizontal, Copy, ExternalLink, Building2, X, Plus, ArrowUpRight } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BankingCard } from "@/components/dashboard/BankingCard";
import { DataTable } from "@/components/dashboard/DataTable";
import { GradientButton } from "@/components/dashboard/GradientButton";
import zp from "@/lib/design-system/zenipay-brand";

// ── Helpers ─────────────────────────────────────────────────────────────────
function mid() {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("zp_client") || "";
}

function fmtCurrency(n: number, c = "CAD") {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

function fmtDate(iso: string) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ── Types ────────────────────────────────────────────────────────────────────
interface PayoutRow {
  id: string;
  amount: number;
  currency: string;
  recipient_name: string;
  method: string;
  status: string;
  created_at: string;
  executed_at?: string;
  note?: string;
  finix_settlement_id?: string;
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [balance, setBalance] = useState<{ available: number; pending: number }>({ available: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [requestOpen, setRequestOpen] = useState(false);
  const [justRequested, setJustRequested] = useState<{ amount: number; currency: string; payout_id: string } | null>(null);
  const [filter, setFilter] = useState<"all" | "paid" | "processing" | "failed">("all");

  const load = useCallback(async () => {
    if (!mid()) return;
    setLoading(true);
    try {
      const [pRes, bRes] = await Promise.all([
        fetch(`/api/zenipay/payouts?merchant_id=${encodeURIComponent(mid())}`).then((r) => r.json()),
        fetch(`/api/zenipay/stats?merchant_id=${encodeURIComponent(mid())}`).then((r) => r.json()),
      ]);
      setPayouts((pRes.payouts ?? []) as PayoutRow[]);
      setBalance({
        available: Number(bRes.available_balance ?? bRes.total_balance ?? 0),
        pending: Number(bRes.pending_balance ?? 0),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => {
    const totalPaid = payouts
      .filter((p) => p.status === "paid")
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    const totalRequested = payouts.reduce((s, p) => s + Number(p.amount || 0), 0);
    return {
      totalPaid,
      totalRequested,
      count: payouts.length,
      successRate: payouts.length > 0
        ? Math.round((payouts.filter((p) => p.status === "paid").length / payouts.length) * 100)
        : 0,
    };
  }, [payouts]);

  const filtered = useMemo(() => {
    if (filter === "all") return payouts;
    return payouts.filter((p) => p.status === filter);
  }, [payouts, filter]);

  return (
    <DashboardShell mode="merchant">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: zp.font.display, fontSize: 32, letterSpacing: "-0.03em", fontWeight: zp.weight.semibold, color: zp.text.primary }}>Payouts</h1>
          <p style={{ margin: "4px 0 0", color: zp.text.muted, fontSize: 13 }}>
            Transfer your balance to your bank account.
          </p>
        </div>
        <GradientButton variant="primary" size="md" onClick={() => setRequestOpen(true)} icon={<Plus size={14} />}>
          Request payout
        </GradientButton>
      </div>

      {/* Balance + Stats cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 18 }}>
        <BankingCard accent="cyan">
          <div style={{ fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Available balance
          </div>
          <div style={{ fontSize: 26, fontWeight: zp.weight.bold, color: zp.brand.cyan, marginTop: 6 }}>
            {fmtCurrency(balance.available)}
          </div>
          {balance.pending > 0 && (
            <div style={{ fontSize: 11, color: zp.text.muted, marginTop: 4 }}>
              {fmtCurrency(balance.pending)} pending
            </div>
          )}
        </BankingCard>
        <BankingCard accent="green">
          <div style={{ fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Total paid out
          </div>
          <div style={{ fontSize: 26, fontWeight: zp.weight.bold, color: zp.semantic.success, marginTop: 6 }}>
            {fmtCurrency(stats.totalPaid)}
          </div>
        </BankingCard>
        <BankingCard>
          <div style={{ fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Success rate
          </div>
          <div style={{ fontSize: 26, fontWeight: zp.weight.bold, color: zp.text.primary, marginTop: 6 }}>
            {stats.successRate}%
          </div>
          <div style={{ fontSize: 11, color: zp.text.muted, marginTop: 4 }}>
            {stats.count} total request{stats.count !== 1 ? "s" : ""}
          </div>
        </BankingCard>
      </div>

      {/* Filter tabs */}
      <BankingCard padding={14} style={{ marginBottom: 14 }}>
        <div style={{ display: "inline-flex", gap: 2, padding: 3, background: zp.surface.bg2, border: `1px solid ${zp.surface.border}`, borderRadius: zp.radius.sm }}>
          {(["all", "paid", "processing", "failed"] as const).map((f) => {
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

      {/* Payouts table */}
      <BankingCard padding="none">
        <DataTable
          rows={filtered}
          loading={loading && payouts.length === 0}
          rowKey={(p) => p.id}
          columns={[
            {
              key: "recipient", header: "Recipient", cell: (p) => (
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: zp.text.primary, fontWeight: zp.weight.semibold }}>
                    {p.recipient_name || "Bank transfer"}
                  </div>
                  <div style={{ fontSize: 11, color: zp.text.dim, fontFamily: zp.font.mono, marginTop: 2 }}>
                    {p.id}
                  </div>
                </div>
              ),
            },
            {
              key: "amount", header: "Amount", mono: true, align: "right", width: 150,
              cell: (p) => (
                <span style={{ color: p.status === "paid" ? zp.semantic.success : zp.brand.cyan, fontWeight: zp.weight.semibold }}>
                  {fmtCurrency(Number(p.amount || 0), p.currency || "CAD")}
                </span>
              ),
            },
            {
              key: "method", header: "Method", width: 100,
              cell: (p) => (
                <span style={{ fontSize: 11, color: zp.text.muted, textTransform: "uppercase" as const }}>
                  {p.method || "ACH"}
                </span>
              ),
            },
            {
              key: "status", header: "Status", width: 130,
              cell: (p) => <StatusPill status={p.status} />,
            },
            {
              key: "date", header: "Date", cell: (p) => fmtDate(p.created_at), width: 130,
            },
            {
              key: "act", header: "", align: "right", width: 60,
              cell: (p) => (
                <button
                  onClick={() => { if (p.id) navigator.clipboard?.writeText(p.id); }}
                  title="Copy payout ID"
                  style={{
                    width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center",
                    background: "transparent", border: `1px solid ${zp.surface.border}`, borderRadius: zp.radius.sm,
                    color: zp.text.muted, cursor: "pointer",
                  }}
                >
                  <Copy size={13} />
                </button>
              ),
            },
          ]}
          empty={
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <Building2 size={32} style={{ color: zp.text.dim, marginBottom: 12 }} />
              <p style={{ margin: "0 0 6px", color: zp.text.primary, fontWeight: zp.weight.semibold }}>No payouts yet</p>
              <p style={{ margin: "0 0 16px", color: zp.text.muted, fontSize: 13 }}>
                Money from your payment links will appear here when you request a payout.
              </p>
              <GradientButton variant="primary" size="md" onClick={() => setRequestOpen(true)} icon={<Plus size={14} />}>
                Request your first payout
              </GradientButton>
            </div>
          }
        />
      </BankingCard>

      {/* Request payout modal */}
      {requestOpen && (
        <RequestPayoutModal
          availableBalance={balance.available}
          onClose={() => setRequestOpen(false)}
          onRequested={(result) => {
            setJustRequested(result);
            setRequestOpen(false);
            void load();
          }}
        />
      )}

      {/* Success toast */}
      {justRequested && (
        <PayoutRequestedToast
          amount={justRequested.amount}
          currency={justRequested.currency}
          payoutId={justRequested.payout_id}
          onDismiss={() => setJustRequested(null)}
        />
      )}
    </DashboardShell>
  );
}

// ── Status Pill ──────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const key = status?.toLowerCase() || "";
  const m: Record<string, { bg: string; fg: string }> = {
    paid: { bg: "#0f3b2a", fg: zp.semantic.success },
    processing: { bg: "#1a2e4a", fg: "#60a5fa" },
    pending: { bg: "#2a2410", fg: "#f59e0b" },
    failed: { bg: "#3b1a1a", fg: zp.semantic.danger },
  };
  const s = m[key] ?? { bg: zp.surface.bg3, fg: zp.text.muted };
  return (
    <span style={{
      fontSize: 10, fontWeight: zp.weight.semibold, padding: "3px 10px",
      borderRadius: zp.radius.pill, background: s.bg, color: s.fg,
      letterSpacing: "0.06em", textTransform: "uppercase" as const,
    }}>
      {status || "—"}
    </span>
  );
}

// ── Request Modal ────────────────────────────────────────────────────────────
function RequestPayoutModal({
  availableBalance,
  onClose,
  onRequested,
}: {
  availableBalance: number;
  onClose: () => void;
  onRequested: (r: { amount: number; currency: string; payout_id: string }) => void;
}) {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("CAD");
  const [recipientName, setRecipientName] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setErr("Amount must be greater than 0.");
      return;
    }
    if (amt > availableBalance) {
      setErr(`Amount exceeds your available balance of ${fmtCurrency(availableBalance, currency)}.`);
      return;
    }
    if (!recipientName.trim()) {
      setErr("Recipient name is required.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const r = await fetch("/api/zenipay/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amt,
          currency,
          recipient_name: recipientName.trim(),
          from_wallet: "platform",
          method: "ach",
          note: note.trim() || undefined,
          merchant_id: mid(),
        }),
      });
      const data = await r.json();
      if (data.success) {
        onRequested({ amount: amt, currency, payout_id: data.payout_id });
      } else {
        setErr(data.error || "Failed to request payout.");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: zp.surface.overlay,
        backdropFilter: "blur(6px)", zIndex: zp.zIndex.modal,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: zp.surface.bg1, borderRadius: zp.radius.lg,
          width: "100%", maxWidth: 480, maxHeight: "92vh",
          overflow: "auto", boxShadow: zp.elevation.lg,
        }}
      >
        <div style={{
          padding: "20px 24px", borderBottom: `1px solid ${zp.surface.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <h2 style={{ margin: 0, fontFamily: zp.font.display, fontSize: 20, fontWeight: zp.weight.semibold, color: zp.text.primary, letterSpacing: "-0.02em" }}>
              Request payout
            </h2>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: zp.text.muted }}>
              Available: {fmtCurrency(availableBalance, currency)}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: "transparent", border: "none", fontSize: 20, color: zp.text.muted, cursor: "pointer" }}>
            ×
          </button>
        </div>

        <div style={{ padding: 22 }}>
          <Label>Amount</Label>
          <input
            type="number" step="0.01" min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            style={inputStyle}
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
            <div>
              <Label>Currency</Label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={inputStyle}>
                <option value="CAD">CAD</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div>
              <Label>Method</Label>
              <div style={{ ...inputStyle, color: zp.text.muted, display: "flex", alignItems: "center", gap: 6 }}>
                <Building2 size={13} />
                <span>ACH</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <Label>Recipient name</Label>
            <input
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="Your full name or business name"
              style={inputStyle}
            />
          </div>

          <div style={{ marginTop: 14 }}>
            <Label>Note (optional)</Label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reference or note for this payout"
              style={inputStyle}
            />
          </div>

          {err && (
            <div style={{
              marginTop: 14, padding: "10px 12px", borderRadius: zp.radius.sm,
              background: zp.semantic.dangerBg, color: zp.semantic.danger,
              fontSize: 12, fontWeight: zp.weight.semibold,
            }}>
              {err}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
            <GradientButton variant="secondary" size="md" onClick={onClose} style={{ flex: 1 }}>
              Cancel
            </GradientButton>
            <GradientButton
              variant="primary" size="md"
              onClick={submit}
              disabled={saving || !amount || !recipientName}
              style={{ flex: 1 }}
              icon={<SendHorizontal size={14} />}
            >
              {saving ? "Processing…" : `Send ${fmtCurrency(parseFloat(amount) || 0, currency)}`}
            </GradientButton>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Success Toast ────────────────────────────────────────────────────────────
function PayoutRequestedToast({
  amount, currency, payoutId, onDismiss,
}: {
  amount: number; currency: string; payoutId: string; onDismiss: () => void;
}) {
  return (
    <div style={{
      position: "fixed", right: 24, bottom: 24, zIndex: zp.zIndex.toast,
      background: zp.surface.bg1, border: `1px solid ${zp.surface.border}`,
      borderRadius: zp.radius.md, padding: "14px 16px",
      boxShadow: zp.elevation.lg, maxWidth: 420,
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: zp.semantic.success, boxShadow: `0 0 10px ${zp.semantic.success}66`,
          }} />
          <span style={{ fontSize: 13, fontWeight: zp.weight.semibold, color: zp.text.primary }}>
            Payout requested
          </span>
        </div>
        <button onClick={onDismiss} aria-label="Dismiss" style={{ background: "transparent", border: "none", cursor: "pointer", color: zp.text.muted }}>
          <X size={14} />
        </button>
      </div>
      <div style={{ fontSize: 14, fontWeight: zp.weight.semibold, color: zp.text.primary }}>
        {fmtCurrency(amount, currency)}
      </div>
      <div style={{ fontSize: 11, fontFamily: zp.font.mono, color: zp.text.dim }}>
        {payoutId}
      </div>
      <p style={{ margin: 0, fontSize: 12, color: zp.text.muted }}>
        Funds arrive in 2–3 business days. We&apos;ll update the status when the transfer clears.
      </p>
    </div>
  );
}

// ── Shared styles ───────────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      display: "block", fontSize: 10, fontWeight: zp.weight.semibold,
      color: zp.text.muted, letterSpacing: "0.1em",
      textTransform: "uppercase" as const, marginBottom: 6,
    }}>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: zp.radius.sm,
  border: `1px solid ${zp.surface.border}`, background: zp.surface.bg2,
  color: zp.text.primary, fontSize: 14, boxSizing: "border-box",
  outline: "none", fontFamily: zp.font.sans,
};
