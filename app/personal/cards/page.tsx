// /personal/cards — personal virtual cards (mirrors /app/cards but
// pink-themed and backed by zenipay_personal_cards). Returns
// "Coming soon" when no provider flag is enabled, identical pattern
// to merchant cards.

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus, Snowflake, Lock, Mail } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BankingCard } from "@/components/dashboard/BankingCard";
import { GradientButton } from "@/components/dashboard/GradientButton";
import zp from "@/lib/design-system/zenipay-brand";

interface PersonalCard {
  id: string;
  last4: string | null;
  cardholder_name: string;
  exp_month: number | null;
  exp_year: number | null;
  status: "active" | "frozen" | "cancelled";
  spending_limit_daily: number | null;
  spending_limit_monthly: number | null;
  currency: string;
}
interface PersonalAccount { id: string; account_name: string; balance: number; currency: string }

function mid(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("zp_client") ?? "";
}

export default function PersonalCardsPage() {
  const [cards, setCards] = useState<PersonalCard[]>([]);
  const [accounts, setAccounts] = useState<PersonalAccount[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const m = mid();
    if (!m) return;
    setLoading(true);
    try {
      const [c, a] = await Promise.all([
        fetch(`/api/v1/personal/cards?merchant_id=${encodeURIComponent(m)}`).then((r) => r.json()),
        fetch(`/api/v1/personal/accounts?merchant_id=${encodeURIComponent(m)}`).then((r) => r.json()),
      ]);
      setEnabled(!!c.enabled);
      setCards(c.cards ?? []);
      setAccounts(a.accounts ?? []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <DashboardShell mode="personal">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: zp.font.display, fontSize: 32, letterSpacing: "-0.03em", fontWeight: zp.weight.semibold, color: zp.text.primary }}>Cards</h1>
          <p style={{ margin: "4px 0 0", color: zp.text.muted, fontSize: 13 }}>
            Virtual cards backed by your personal accounts · online purchases only
          </p>
        </div>
        {enabled && (
          <GradientButton variant="primary" size="md" onClick={() => setOpen(true)} icon={<Plus size={14} />} style={{ background: zp.gradient.personal }}>
            Issue personal card
          </GradientButton>
        )}
      </div>

      {!enabled && !loading && (
        <BankingCard style={{ padding: "24px 26px", marginBottom: 20, borderLeft: `3px solid ${zp.semantic.warning}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ width: 44, height: 44, borderRadius: zp.radius.md, background: zp.semantic.warningBg, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <Lock size={20} color={zp.semantic.warning} />
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 15, fontWeight: zp.weight.semibold, color: zp.text.primary }}>Personal cards — coming soon</div>
              <div style={{ fontSize: 12, color: zp.text.muted, marginTop: 4, lineHeight: 1.5 }}>
                We&apos;re finalizing personal card issuing with our processor. Spend from your personal balance the moment it ships.
              </div>
            </div>
            <GradientButton variant="secondary" size="sm" icon={<Mail size={13} />} onClick={() => { window.location.href = "mailto:info@zeniva.ca?subject=Notify%20me%20about%20personal%20cards"; }}>
              Get notified
            </GradientButton>
          </div>
        </BankingCard>
      )}

      {enabled && cards.length === 0 && !loading && (
        <BankingCard style={{ textAlign: "center", padding: "48px 24px" }}>
          <div style={{ fontSize: 36 }}>💳</div>
          <h3 style={{ margin: "10px 0 4px", fontSize: 18, fontWeight: zp.weight.semibold, color: zp.text.primary }}>No personal cards yet</h3>
          <p style={{ margin: "0 0 18px", color: zp.text.muted, fontSize: 13 }}>
            Issue a virtual card to spend from your personal balance.
          </p>
          <GradientButton variant="primary" size="md" onClick={() => setOpen(true)} icon={<Plus size={14} />} style={{ background: zp.gradient.personal }}>
            Issue first card
          </GradientButton>
        </BankingCard>
      )}

      {enabled && cards.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
          {cards.map((c) => <CardVisual key={c.id} card={c} />)}
        </div>
      )}

      {open && enabled && (
        <IssueCardModal accounts={accounts} onClose={() => setOpen(false)} onCreated={async () => { setOpen(false); await load(); }} />
      )}
    </DashboardShell>
  );
}

function CardVisual({ card }: { card: PersonalCard }) {
  const gradient = card.status === "frozen"
    ? "linear-gradient(135deg, #334155 0%, #475569 100%)"
    : `linear-gradient(135deg, ${zp.brand.pink} 0%, ${zp.brand.violet} 100%)`;
  const expiry = card.exp_month && card.exp_year
    ? `${String(card.exp_month).padStart(2, "0")}/${String(card.exp_year).slice(-2)}`
    : "—";
  return (
    <div style={{
      background: gradient,
      borderRadius: zp.radius.lg,
      padding: 22,
      color: "#fff",
      position: "relative",
      minHeight: 180,
      boxShadow: zp.elevation.heroInk,
      overflow: "hidden",
    }}>
      <span aria-hidden style={{ position: "absolute", right: -80, top: -80, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.15)" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: zp.weight.semibold, letterSpacing: "0.14em", textTransform: "uppercase" as const, opacity: 0.85 }}>
          Personal · Virtual
        </div>
        <div style={{ fontSize: 11, fontWeight: zp.weight.semibold, letterSpacing: "0.08em", textTransform: "uppercase" as const, opacity: 0.85 }}>ZeniPay</div>
      </div>
      {card.status === "frozen" && (
        <div style={{ display: "inline-flex", gap: 4, alignItems: "center", marginTop: 6, fontSize: 10, fontWeight: zp.weight.semibold, padding: "2px 8px", borderRadius: 999, background: "rgba(255,255,255,0.18)" }}>
          <Snowflake size={10} /> FROZEN
        </div>
      )}
      <div style={{ marginTop: 40, fontFamily: zp.font.mono, fontSize: 22, letterSpacing: "0.14em", fontWeight: zp.weight.medium, position: "relative", zIndex: 1 }}>
        •••• •••• •••• {card.last4 || "••••"}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 16, position: "relative", zIndex: 1 }}>
        <div>
          <div style={{ fontSize: 8, opacity: 0.75, letterSpacing: "0.14em", textTransform: "uppercase" as const, fontWeight: zp.weight.semibold }}>Cardholder</div>
          <div style={{ fontSize: 13, fontWeight: zp.weight.semibold }}>{card.cardholder_name}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 8, opacity: 0.75, letterSpacing: "0.14em", textTransform: "uppercase" as const, fontWeight: zp.weight.semibold }}>Expires</div>
          <div style={{ fontSize: 13, fontFamily: zp.font.mono, fontWeight: zp.weight.semibold }}>{expiry}</div>
        </div>
      </div>
    </div>
  );
}

function IssueCardModal({ accounts, onClose, onCreated }: { accounts: PersonalAccount[]; onClose: () => void; onCreated: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [currency, setCurrency] = useState("CAD");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (name.trim().length < 2) { setErr("Name required"); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/v1/personal/cards/issue", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchant_id: mid(), cardholder_name: name.trim(), account_id: accountId || null, currency }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(data?.error?.message ?? "Failed"); return; }
      await onCreated();
    } finally { setBusy(false); }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: zp.surface.overlay, backdropFilter: "blur(6px)", zIndex: zp.zIndex.modal, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: zp.surface.bg1, borderRadius: zp.radius.lg, width: "100%", maxWidth: 460, padding: 22 }}>
        <h2 style={{ margin: 0, fontFamily: zp.font.display, fontSize: 20, fontWeight: zp.weight.semibold, color: zp.text.primary }}>Issue personal card</h2>
        <div style={{ marginTop: 18 }}>
          <label style={{ fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted, textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>Cardholder name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name on card" style={{ width: "100%", marginTop: 6, padding: "11px 14px", borderRadius: zp.radius.sm, border: `1px solid ${zp.surface.border}`, background: zp.surface.bg2, color: zp.text.primary, fontSize: 14, boxSizing: "border-box" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted, textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>Linked account</label>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} style={{ width: "100%", marginTop: 6, padding: "11px 14px", borderRadius: zp.radius.sm, border: `1px solid ${zp.surface.border}`, background: zp.surface.bg2, color: zp.text.primary, fontSize: 14, boxSizing: "border-box" }}>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.account_name} · {zp.fmtCurrency(Number(a.balance), a.currency)}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted, textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>Currency</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ width: "100%", marginTop: 6, padding: "11px 14px", borderRadius: zp.radius.sm, border: `1px solid ${zp.surface.border}`, background: zp.surface.bg2, color: zp.text.primary, fontSize: 14, boxSizing: "border-box" }}>
              <option value="CAD">CAD</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>
        {err && <div style={{ marginTop: 12, padding: "8px 10px", borderRadius: zp.radius.sm, background: zp.semantic.dangerBg, color: zp.semantic.danger, fontSize: 12, fontWeight: zp.weight.semibold }}>{err}</div>}
        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <GradientButton variant="secondary" size="md" onClick={onClose} style={{ flex: 1 }}>Cancel</GradientButton>
          <GradientButton variant="primary" size="md" onClick={submit} disabled={busy} style={{ flex: 1, background: zp.gradient.personal }}>
            {busy ? "Issuing…" : "Issue card"}
          </GradientButton>
        </div>
      </div>
    </div>
  );
}
