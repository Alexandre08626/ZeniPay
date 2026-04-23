// /app/cards — merchant cards dashboard on the new DashboardShell.
//
// Reads + mutates through the existing /api/zenipay/banking-ops endpoint
// (actions: apply_card, toggle_card, update_card_limit). No new API.

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Snowflake, Unlock, X, Check } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BankingCard } from "@/components/dashboard/BankingCard";
import { GradientButton } from "@/components/dashboard/GradientButton";
import zp from "@/lib/design-system/zenipay-brand";

interface CardRow {
  id: string;
  card_type: string;
  last4: string;
  expiry: string;
  status: string;
  is_virtual: boolean;
  is_physical: boolean;
  spending_limit: number;
  daily_limit: number;
  spent_this_month?: number;
}

type Filter = "all" | "active" | "frozen" | "cancelled";

const CARD_OPTIONS: Array<{ value: string; label: string; fee: number }> = [
  { value: "visa_debit_virtual",   label: "Visa Debit — Virtual",           fee: 0 },
  { value: "visa_debit_physical",  label: "Visa Debit — Physical ($10)",    fee: 10 },
  { value: "mc_debit_virtual",     label: "Mastercard Debit — Virtual",     fee: 0 },
  { value: "mc_credit_review",     label: "Mastercard Credit — Requires Review", fee: 0 },
];

function mid() { return typeof window === "undefined" ? "" : sessionStorage.getItem("zp_client") || ""; }

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: "cyan" | "violet" | "green" | "neutral" }) {
  return (
    <BankingCard accent={accent ?? "neutral"}>
      <div style={{ fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted, letterSpacing: "0.12em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ ...zp.amountStyle.large, fontSize: 22, marginTop: 6, color: zp.text.primary }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: zp.text.muted, marginTop: 4 }}>{sub}</div>}
    </BankingCard>
  );
}

export default function CardsPage() {
  const [cards, setCards] = useState<CardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [issueOpen, setIssueOpen] = useState(false);
  const [selected, setSelected] = useState<CardRow | null>(null);

  const load = useCallback(async () => {
    if (!mid()) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/zenipay/banking-ops?merchant_id=${encodeURIComponent(mid())}`).then((x) => x.json());
      setCards((r.cards ?? []) as CardRow[]);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const post = async (action: string, body: Record<string, unknown> = {}) => {
    await fetch("/api/zenipay/banking-ops", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, merchant_id: mid(), ...body }),
    });
    await load();
  };

  const stats = useMemo(() => {
    const active = cards.filter((c) => c.status === "active").length;
    const totalSpent = cards.reduce((s, c) => s + Number(c.spent_this_month || 0), 0);
    const avg = cards.length > 0 ? totalSpent / cards.length : 0;
    return { active, totalSpent, avg };
  }, [cards]);

  const filtered = useMemo(() => {
    if (filter === "all") return cards;
    return cards.filter((c) => c.status === filter);
  }, [cards, filter]);

  return (
    <DashboardShell mode="merchant">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: zp.font.display, fontSize: 32, letterSpacing: "-0.03em", fontWeight: zp.weight.semibold, color: zp.text.primary }}>Cards</h1>
          <p style={{ margin: "4px 0 0", color: zp.text.muted, fontSize: 13 }}>
            Virtual & physical cards. Freeze in one click.
          </p>
        </div>
        <GradientButton variant="primary" size="md" onClick={() => setIssueOpen(true)} icon={<Plus size={14} />}>
          Issue new card
        </GradientButton>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 18 }}>
        <Stat label="Active cards" value={String(stats.active)} sub={`${cards.length} total`} accent="cyan" />
        <Stat label="Total spent this month" value={zp.fmtCurrency(stats.totalSpent)} accent="cyan" />
        <Stat label="Avg per card" value={zp.fmtCurrency(stats.avg)} />
      </div>

      <BankingCard padding={14} style={{ marginBottom: 14 }}>
        <div style={{ display: "inline-flex", gap: 2, padding: 3, background: zp.surface.bg2, border: `1px solid ${zp.surface.border}`, borderRadius: zp.radius.sm }}>
          {(["all", "active", "frozen", "cancelled"] as Filter[]).map((f) => {
            const active = f === filter;
            const count = f === "all" ? cards.length : cards.filter((c) => c.status === f).length;
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

      {loading && cards.length === 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
          {Array.from({ length: 3 }).map((_, i) => <CardVisualSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <BankingCard style={{ textAlign: "center", padding: "48px 24px" }}>
          <div style={{ fontSize: 36 }}>💳</div>
          <h3 style={{ margin: "10px 0 4px", fontSize: 18, fontWeight: zp.weight.semibold, color: zp.text.primary }}>
            {filter === "all" ? "No cards yet" : `No ${filter} cards`}
          </h3>
          <p style={{ margin: "0 0 18px", color: zp.text.muted, fontSize: 13 }}>
            Issue a virtual or physical card to start spending with your ZeniPay balance.
          </p>
          <GradientButton variant="primary" onClick={() => setIssueOpen(true)} icon={<Plus size={14} />}>
            Issue your first card
          </GradientButton>
        </BankingCard>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
          {filtered.map((c) => (
            <CardVisual key={c.id} card={c} onClick={() => setSelected(c)} />
          ))}
        </div>
      )}

      {issueOpen && (
        <IssueCardModal
          onClose={() => setIssueOpen(false)}
          onCreate={async (payload) => { await post("apply_card", payload); setIssueOpen(false); }}
        />
      )}
      {selected && (
        <CardDetail
          card={selected}
          onClose={() => setSelected(null)}
          onToggle={async () => { await post("toggle_card", { card_id: selected.id }); setSelected(null); }}
          onLimitChange={async (daily) => { await post("update_card_limit", { card_id: selected.id, daily_limit: daily }); setSelected(null); }}
        />
      )}
    </DashboardShell>
  );
}

function CardVisual({ card, onClick }: { card: CardRow; onClick: () => void }) {
  const isMastercard = card.card_type?.includes("mc");
  const gradient = isMastercard
    ? "linear-gradient(135deg, #F5A623 0%, #E5247B 50%, #7B4FBF 100%)"
    : `linear-gradient(135deg, ${zp.brand.green} 0%, ${zp.brand.cyan} 50%, #2A8FE0 100%)`;
  const pct = card.spending_limit > 0 ? Math.min(100, Math.round((Number(card.spent_this_month || 0) / card.spending_limit) * 100)) : 0;

  return (
    <div
      onClick={onClick}
      style={{
        background: card.status === "frozen" ? "linear-gradient(135deg, #334155 0%, #475569 100%)" : gradient,
        borderRadius: zp.radius.lg,
        padding: "22px 22px",
        color: "#fff",
        cursor: "pointer",
        position: "relative",
        minHeight: 180,
        boxShadow: zp.elevation.heroInk,
        overflow: "hidden",
        transition: zp.motion.base,
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
    >
      {/* Shine ring */}
      <span aria-hidden style={{
        position: "absolute", right: -80, top: -80, width: 200, height: 200,
        borderRadius: "50%", background: "rgba(255,255,255,0.15)", pointerEvents: "none",
      }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 1 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: zp.weight.semibold, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.85 }}>
            {card.is_virtual ? "Virtual" : "Physical"} · {isMastercard ? "Mastercard" : "Visa"}
          </div>
          {card.status === "frozen" && (
            <div style={{ display: "inline-flex", gap: 4, alignItems: "center", marginTop: 4, fontSize: 10, fontWeight: zp.weight.semibold, padding: "2px 8px", borderRadius: 999, background: "rgba(255,255,255,0.18)", letterSpacing: "0.04em" }}>
              <Snowflake size={10} /> FROZEN
            </div>
          )}
        </div>
        <span style={{
          fontSize: 10, fontWeight: zp.weight.semibold, padding: "3px 10px",
          borderRadius: zp.radius.pill, background: "rgba(255,255,255,0.22)",
          letterSpacing: "0.04em", textTransform: "uppercase",
        }}>{card.status}</span>
      </div>

      <div style={{ marginTop: 40, fontFamily: zp.font.mono, fontSize: 22, letterSpacing: "0.14em", fontWeight: zp.weight.medium, position: "relative", zIndex: 1 }}>
        •••• •••• •••• {card.last4}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 14, position: "relative", zIndex: 1 }}>
        <div>
          <div style={{ fontSize: 8, opacity: 0.75, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: zp.weight.semibold }}>Expires</div>
          <div style={{ fontSize: 13, fontFamily: zp.font.mono, fontWeight: zp.weight.semibold }}>{card.expiry || "—"}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, opacity: 0.75, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: zp.weight.semibold }}>Spent / limit</div>
          <div style={{ fontSize: 12, fontWeight: zp.weight.semibold, fontFamily: zp.font.mono }}>
            {zp.fmtCurrencyShort(Number(card.spent_this_month || 0))} / {zp.fmtCurrencyShort(card.spending_limit || card.daily_limit)}
          </div>
        </div>
      </div>

      {card.spending_limit > 0 && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "rgba(255,255,255,0.2)", zIndex: 1 }}>
          <div style={{ width: `${pct}%`, height: 3, background: pct > 80 ? "#fecaca" : "rgba(255,255,255,0.9)" }} />
        </div>
      )}
    </div>
  );
}

function CardVisualSkeleton() {
  return (
    <div style={{ background: zp.surface.bg2, borderRadius: zp.radius.lg, minHeight: 180, padding: 22, border: `1px solid ${zp.surface.border}` }}>
      <div style={{ height: 14, width: 100, background: zp.surface.bg3, borderRadius: 4 }} />
      <div style={{ height: 22, width: "75%", background: zp.surface.bg3, borderRadius: 4, marginTop: 44 }} />
      <div style={{ height: 14, width: 80, background: zp.surface.bg3, borderRadius: 4, marginTop: 18 }} />
    </div>
  );
}

function IssueCardModal({ onClose, onCreate }: { onClose: () => void; onCreate: (payload: Record<string, unknown>) => Promise<void> }) {
  const [cardType, setCardType] = useState("visa_debit_virtual");
  const [dailyLimit, setDailyLimit] = useState(5000);
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const isPhysical = cardType.includes("physical");
  const selected = CARD_OPTIONS.find((o) => o.value === cardType);

  const submit = async () => {
    setSaving(true);
    try {
      await onCreate({ card_type: cardType, daily_limit: dailyLimit, ...(isPhysical ? { shipping_address: address } : {}) });
    } finally { setSaving(false); }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: zp.surface.overlay, backdropFilter: "blur(6px)", zIndex: zp.zIndex.modal, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: zp.surface.bg1, borderRadius: zp.radius.lg, width: "100%", maxWidth: 520, maxHeight: "92vh", overflow: "auto", boxShadow: zp.elevation.lg }}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${zp.surface.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontFamily: zp.font.display, fontSize: 20, fontWeight: zp.weight.semibold, color: zp.text.primary, letterSpacing: "-0.02em" }}>Issue a card</h2>
          <button onClick={onClose} aria-label="Close" style={{ background: "transparent", border: "none", fontSize: 20, color: zp.text.muted, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ padding: 22 }}>
          <Label>Card type</Label>
          <select value={cardType} onChange={(e) => setCardType(e.target.value)} style={inputStyle}>
            {CARD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <Label style={{ marginTop: 18 }}>Daily limit · {zp.fmtCurrency(dailyLimit)}</Label>
          <input
            type="range" min={500} max={50000} step={500}
            value={dailyLimit}
            onChange={(e) => setDailyLimit(Number(e.target.value))}
            style={{ width: "100%", accentColor: zp.brand.cyan }}
          />

          {isPhysical && (
            <>
              <Label style={{ marginTop: 18 }}>Shipping address</Label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                placeholder="123 Rue Principale, Montréal, QC H1A 1A1"
                style={{ ...inputStyle, resize: "vertical" as const }}
              />
            </>
          )}

          {selected && selected.fee > 0 && (
            <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: zp.radius.sm, background: zp.semantic.warningBg, color: zp.semantic.warning, fontSize: 12, fontWeight: zp.weight.semibold }}>
              One-time issuance fee: {zp.fmtCurrency(selected.fee)}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
            <GradientButton variant="secondary" size="md" onClick={onClose} style={{ flex: 1 }}>Cancel</GradientButton>
            <GradientButton variant="primary" size="md" onClick={submit} disabled={saving || (isPhysical && address.trim().length < 5)} style={{ flex: 1 }}>
              {saving ? "Issuing…" : "Issue card"}
            </GradientButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function CardDetail({ card, onClose, onToggle, onLimitChange }: { card: CardRow; onClose: () => void; onToggle: () => void | Promise<void>; onLimitChange: (daily: number) => void | Promise<void> }) {
  const [editingLimit, setEditingLimit] = useState(false);
  const [daily, setDaily] = useState(card.daily_limit);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: zp.surface.overlay, backdropFilter: "blur(4px)", zIndex: zp.zIndex.modal, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(440px, 100vw)", height: "100vh", background: zp.surface.bg1, boxShadow: zp.elevation.lg, overflowY: "auto", padding: 0 }}>
        <div style={{ padding: "22px 24px", borderBottom: `1px solid ${zp.surface.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontFamily: zp.font.display, fontSize: 20, fontWeight: zp.weight.semibold, color: zp.text.primary, letterSpacing: "-0.02em" }}>Card •••• {card.last4}</h2>
          <button onClick={onClose} aria-label="Close" style={{ background: zp.surface.bg3, border: "none", borderRadius: zp.radius.sm, width: 30, height: 30, cursor: "pointer", color: zp.text.primary, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: "22px 24px" }}>
          <CardVisual card={card} onClick={() => { /* already open */ }} />

          <div style={{ marginTop: 22 }}>
            <Row label="Type" value={card.card_type.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())} />
            <Row label="Status" value={<StatusPill status={card.status} />} />
            <Row label="Expires" value={card.expiry || "—"} mono />
            <Row
              label="Daily limit"
              value={
                editingLimit ? (
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      type="number" value={daily} onChange={(e) => setDaily(Number(e.target.value))}
                      style={{ ...inputStyle, width: 120, padding: "6px 10px", height: 32 }}
                    />
                    <GradientButton variant="primary" size="sm" onClick={async () => { await onLimitChange(daily); setEditingLimit(false); }} icon={<Check size={12} />}>Save</GradientButton>
                    <GradientButton variant="ghost" size="sm" onClick={() => { setEditingLimit(false); setDaily(card.daily_limit); }}>Cancel</GradientButton>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontFamily: zp.font.mono }}>{zp.fmtCurrency(card.daily_limit)}</span>
                    <button onClick={() => setEditingLimit(true)} style={{ background: "transparent", border: `1px solid ${zp.surface.border}`, borderRadius: zp.radius.sm, padding: "4px 10px", fontSize: 11, cursor: "pointer", color: zp.text.muted }}>Edit</button>
                  </div>
                )
              }
            />
            {card.spending_limit > 0 && (
              <Row label="Spent this month" value={`${zp.fmtCurrency(Number(card.spent_this_month || 0))} / ${zp.fmtCurrency(card.spending_limit)}`} mono />
            )}
          </div>

          <div style={{ marginTop: 22, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <GradientButton
              variant={card.status === "active" ? "danger" : "primary"}
              size="md"
              icon={card.status === "active" ? <Snowflake size={14} /> : <Unlock size={14} />}
              onClick={() => { void onToggle(); }}
            >
              {card.status === "active" ? "Freeze card" : "Unfreeze card"}
            </GradientButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const key = status?.toLowerCase() || "";
  const m: Record<string, { bg: string; fg: string }> = {
    active: { bg: zp.semantic.successBg, fg: zp.semantic.success },
    frozen: { bg: zp.semantic.infoBg, fg: zp.semantic.info },
    cancelled: { bg: zp.semantic.dangerBg, fg: zp.semantic.danger },
  };
  const s = m[key] ?? { bg: zp.surface.bg3, fg: zp.text.muted };
  return (
    <span style={{ fontSize: 10, fontWeight: zp.weight.semibold, padding: "3px 10px", borderRadius: zp.radius.pill, background: s.bg, color: s.fg, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
      {status || "—"}
    </span>
  );
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", padding: "10px 0", borderBottom: `1px solid ${zp.surface.border}`, alignItems: "center" }}>
      <span style={{ fontSize: 11, color: zp.text.muted, fontWeight: zp.weight.semibold, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>{label}</span>
      <span style={{ fontSize: 13, color: zp.text.primary, fontFamily: mono ? zp.font.mono : zp.font.sans }}>{value}</span>
    </div>
  );
}

function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <label style={{ display: "block", fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6, ...style }}>{children}</label>;
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: zp.radius.sm,
  border: `1px solid ${zp.surface.border}`, background: zp.surface.bg2,
  color: zp.text.primary, fontSize: 14, boxSizing: "border-box", outline: "none", fontFamily: zp.font.sans,
};
