// /app/cards — merchant virtual cards (PR 16).
//
// Provider-backed via /api/v1/merchant/cards. When no provider is
// configured (STRIPE_ISSUING_ENABLED / FINIX_CARD_ISSUING_ENABLED),
// the list endpoint returns { enabled: false } and we render the
// "Coming soon" banner + empty state.

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Snowflake, Unlock, X, Eye, Copy, Check, Mail, AlertTriangle, Lock } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BankingCard } from "@/components/dashboard/BankingCard";
import { GradientButton } from "@/components/dashboard/GradientButton";
import zp from "@/lib/design-system/zenipay-brand";

interface MerchantCard {
  id: string;
  merchant_id: string;
  account_id: string | null;
  card_type: string;
  usage_type: string;
  provider: "stripe" | "finix";
  last4: string | null;
  exp_month: number | null;
  exp_year: number | null;
  status: "active" | "frozen" | "cancelled";
  spending_limit_daily: number | null;
  spending_limit_monthly: number | null;
  currency: string;
  cardholder_name: string;
  created_at: string;
  cancelled_at: string | null;
}

interface Account {
  id: string;
  name?: string;
  account_number?: string;
  balance?: number;
  currency?: string;
  is_primary?: boolean;
}

function mid(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("zp_client") ?? "";
}

export default function CardsPage() {
  const [cards, setCards] = useState<MerchantCard[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [providerEnabled, setProviderEnabled] = useState(false);
  const [provider, setProvider] = useState<"stripe" | "finix" | null>(null);
  const [loading, setLoading] = useState(true);
  const [issueOpen, setIssueOpen] = useState(false);
  const [selected, setSelected] = useState<MerchantCard | null>(null);

  const load = useCallback(async () => {
    const m = mid();
    if (!m) return;
    setLoading(true);
    try {
      const [cardsRes, bankingRes] = await Promise.all([
        fetch(`/api/v1/merchant/cards?merchant_id=${encodeURIComponent(m)}`).then((r) => r.json()),
        fetch(`/api/zenipay/banking-ops?merchant_id=${encodeURIComponent(m)}`).then((r) => r.json()).catch(() => ({ accounts: [] })),
      ]);
      setProviderEnabled(!!cardsRes.enabled);
      setProvider(cardsRes.provider ?? null);
      setCards((cardsRes.cards ?? []) as MerchantCard[]);
      setAccounts((bankingRes.accounts ?? []) as Account[]);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => {
    const active = cards.filter((c) => c.status === "active").length;
    const dailyTotal = cards.reduce((s, c) => s + Number(c.spending_limit_daily ?? 0), 0);
    const monthlyTotal = cards.reduce((s, c) => s + Number(c.spending_limit_monthly ?? 0), 0);
    return { active, total: cards.length, dailyTotal, monthlyTotal };
  }, [cards]);

  return (
    <DashboardShell mode="merchant">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: zp.font.display, fontSize: 32, letterSpacing: "-0.03em", fontWeight: zp.weight.semibold, color: zp.text.primary }}>Cards</h1>
          <p style={{ margin: "4px 0 0", color: zp.text.muted, fontSize: 13 }}>
            Virtual cards backed by your ZeniPay wallet · online purchases only
          </p>
        </div>
        {providerEnabled && (
          <GradientButton variant="primary" size="md" onClick={() => setIssueOpen(true)} icon={<Plus size={14} />}>
            Issue virtual card
          </GradientButton>
        )}
      </div>

      {!providerEnabled && !loading && <ComingSoonBanner />}

      {providerEnabled && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 18 }}>
          <Stat label="Active cards" value={String(stats.active)} sub={`${stats.total} total`} accent="cyan" />
          <Stat label="Daily limit" value={stats.dailyTotal > 0 ? zp.fmtCurrency(stats.dailyTotal) : "—"} sub="across all cards" accent="violet" />
          <Stat label="Monthly limit" value={stats.monthlyTotal > 0 ? zp.fmtCurrency(stats.monthlyTotal) : "—"} sub="across all cards" />
          <Stat label="Provider" value={provider === "finix" ? "Finix" : provider === "stripe" ? "Stripe" : "—"} sub="card issuing" />
        </div>
      )}

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
          {Array.from({ length: 3 }).map((_, i) => <CardVisualSkeleton key={i} />)}
        </div>
      ) : !providerEnabled ? null : cards.length === 0 ? (
        <BankingCard style={{ textAlign: "center", padding: "48px 24px" }}>
          <div style={{ fontSize: 36 }}>💳</div>
          <h3 style={{ margin: "10px 0 4px", fontSize: 18, fontWeight: zp.weight.semibold, color: zp.text.primary }}>No cards yet</h3>
          <p style={{ margin: "0 0 18px", color: zp.text.muted, fontSize: 13 }}>
            Issue a virtual card to spend directly from your ZeniPay balance.
          </p>
          <GradientButton variant="primary" onClick={() => setIssueOpen(true)} icon={<Plus size={14} />}>
            Issue your first card
          </GradientButton>
        </BankingCard>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
          {cards.map((c) => <CardVisual key={c.id} card={c} onClick={() => setSelected(c)} />)}
        </div>
      )}

      {issueOpen && (
        <IssueCardModal
          accounts={accounts}
          onClose={() => setIssueOpen(false)}
          onCreated={async () => { setIssueOpen(false); await load(); }}
        />
      )}
      {selected && (
        <CardDetail
          card={selected}
          accounts={accounts}
          onClose={() => setSelected(null)}
          onChanged={async () => { await load(); }}
        />
      )}
    </DashboardShell>
  );
}

// --- visuals ----------------------------------------------------------------

function ComingSoonBanner() {
  return (
    <BankingCard style={{ padding: "24px 26px", marginBottom: 20, borderLeft: `3px solid ${zp.semantic.warning}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div style={{
          width: 44, height: 44, borderRadius: zp.radius.md, background: zp.semantic.warningBg,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
        }}>
          <Lock size={20} color={zp.semantic.warning} />
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 15, fontWeight: zp.weight.semibold, color: zp.text.primary }}>
            Virtual cards — coming soon
          </div>
          <div style={{ fontSize: 12, color: zp.text.muted, marginTop: 4, lineHeight: 1.5 }}>
            We&apos;re finalizing card issuing with our processor. Spend from your ZeniPay balance the moment it ships.
          </div>
        </div>
        <GradientButton variant="secondary" size="sm" icon={<Mail size={13} />} onClick={() => { window.location.href = "mailto:info@zeniva.ca?subject=Notify%20me%20about%20ZeniPay%20cards"; }}>
          Get notified
        </GradientButton>
      </div>
    </BankingCard>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: "cyan" | "violet" | "green" | "neutral" }) {
  return (
    <BankingCard accent={accent ?? "neutral"}>
      <div style={{ fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted, letterSpacing: "0.12em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ ...zp.amountStyle.large, fontSize: 22, marginTop: 6, color: zp.text.primary }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: zp.text.muted, marginTop: 4 }}>{sub}</div>}
    </BankingCard>
  );
}

function CardVisual({ card, onClick, large }: { card: MerchantCard; onClick?: () => void; large?: boolean }) {
  const gradient = `linear-gradient(135deg, ${zp.brand.green} 0%, ${zp.brand.cyan} 50%, ${zp.brand.violet} 100%)`;
  const expiry = card.exp_month && card.exp_year
    ? `${String(card.exp_month).padStart(2, "0")}/${String(card.exp_year).slice(-2)}`
    : "—";

  return (
    <div
      onClick={onClick}
      style={{
        background: card.status === "frozen"
          ? "linear-gradient(135deg, #334155 0%, #475569 100%)"
          : card.status === "cancelled"
            ? "linear-gradient(135deg, #4b5563 0%, #6b7280 100%)"
            : gradient,
        borderRadius: zp.radius.lg,
        padding: large ? 28 : "22px 22px",
        color: "#fff",
        cursor: onClick ? "pointer" : "default",
        position: "relative",
        minHeight: large ? 220 : 180,
        boxShadow: zp.elevation.heroInk,
        overflow: "hidden",
        transition: zp.motion.base,
        opacity: card.status === "cancelled" ? 0.7 : 1,
      }}
      onMouseEnter={onClick ? (e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; } : undefined}
      onMouseLeave={onClick ? (e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; } : undefined}
    >
      <span aria-hidden style={{
        position: "absolute", right: -80, top: -80, width: 200, height: 200,
        borderRadius: "50%", background: "rgba(255,255,255,0.15)", pointerEvents: "none",
      }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 1 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: zp.weight.semibold, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.85 }}>
            Virtual · Online only
          </div>
          {card.status === "frozen" && (
            <div style={{ display: "inline-flex", gap: 4, alignItems: "center", marginTop: 6, fontSize: 10, fontWeight: zp.weight.semibold, padding: "2px 8px", borderRadius: 999, background: "rgba(255,255,255,0.18)", letterSpacing: "0.04em" }}>
              <Snowflake size={10} /> FROZEN
            </div>
          )}
          {card.status === "cancelled" && (
            <div style={{ display: "inline-flex", gap: 4, alignItems: "center", marginTop: 6, fontSize: 10, fontWeight: zp.weight.semibold, padding: "2px 8px", borderRadius: 999, background: "rgba(255,255,255,0.18)", letterSpacing: "0.04em" }}>
              <X size={10} /> CANCELLED
            </div>
          )}
        </div>
        <div style={{ fontSize: 11, fontWeight: zp.weight.semibold, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.85 }}>
          ZeniPay
        </div>
      </div>

      <div style={{ marginTop: large ? 58 : 40, fontFamily: zp.font.mono, fontSize: large ? 26 : 22, letterSpacing: "0.14em", fontWeight: zp.weight.medium, position: "relative", zIndex: 1 }}>
        •••• •••• •••• {card.last4 || "••••"}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 16, position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: "60%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <div style={{ fontSize: 8, opacity: 0.75, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: zp.weight.semibold }}>Cardholder</div>
          <div style={{ fontSize: 13, fontWeight: zp.weight.semibold, letterSpacing: "0.02em" }}>{card.cardholder_name}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 8, opacity: 0.75, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: zp.weight.semibold }}>Expires</div>
          <div style={{ fontSize: 13, fontFamily: zp.font.mono, fontWeight: zp.weight.semibold }}>{expiry}</div>
        </div>
      </div>
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

// --- issue modal ------------------------------------------------------------

function IssueCardModal({ accounts, onClose, onCreated }: { accounts: Account[]; onClose: () => void; onCreated: () => Promise<void> }) {
  const [cardholderName, setCardholderName] = useState("");
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id ?? "");
  const [currency, setCurrency] = useState("CAD");
  const [dailyLimit, setDailyLimit] = useState("");
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (cardholderName.trim().length < 2) { setErr("Cardholder name required"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/v1/merchant/cards/issue", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id: mid(),
          cardholder_name: cardholderName.trim(),
          currency,
          account_id: accountId || null,
          spending_limit_daily:   dailyLimit   ? Number(dailyLimit)   : null,
          spending_limit_monthly: monthlyLimit ? Number(monthlyLimit) : null,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(data?.error?.message ?? "Issue failed"); return; }
      await onCreated();
    } finally { setSaving(false); }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: zp.surface.overlay, backdropFilter: "blur(6px)", zIndex: zp.zIndex.modal, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: zp.surface.bg1, borderRadius: zp.radius.lg, width: "100%", maxWidth: 520, maxHeight: "92vh", overflow: "auto", boxShadow: zp.elevation.lg }}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${zp.surface.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontFamily: zp.font.display, fontSize: 20, fontWeight: zp.weight.semibold, color: zp.text.primary, letterSpacing: "-0.02em" }}>Issue virtual card</h2>
          <button onClick={onClose} aria-label="Close" style={{ background: "transparent", border: "none", fontSize: 20, color: zp.text.muted, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ padding: 22 }}>
          <Label>Cardholder name</Label>
          <input value={cardholderName} onChange={(e) => setCardholderName(e.target.value)} placeholder="Name on card" style={inputStyle} />

          {accounts.length > 0 && (
            <>
              <Label style={{ marginTop: 14 }}>Linked account</Label>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} style={inputStyle}>
                <option value="">— None —</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name ?? a.account_number ?? a.id} · {zp.fmtCurrency(Number(a.balance ?? 0))}
                  </option>
                ))}
              </select>
            </>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
            <div>
              <Label>Currency</Label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={inputStyle}>
                <option value="CAD">CAD</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div>
              <Label>Daily limit (optional)</Label>
              <input type="number" min={0} value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)} placeholder="e.g. 5000" style={inputStyle} />
            </div>
          </div>

          <Label style={{ marginTop: 14 }}>Monthly limit (optional)</Label>
          <input type="number" min={0} value={monthlyLimit} onChange={(e) => setMonthlyLimit(e.target.value)} placeholder="e.g. 50000" style={inputStyle} />

          <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: zp.radius.sm, background: zp.surface.bg2, color: zp.text.muted, fontSize: 12, lineHeight: 1.5 }}>
            Online purchases only · no physical card is shipped · freeze or cancel anytime.
          </div>

          {err && (
            <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: zp.radius.sm, background: zp.semantic.dangerBg, color: zp.semantic.danger, fontSize: 12, fontWeight: zp.weight.semibold }}>
              {err}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
            <GradientButton variant="secondary" size="md" onClick={onClose} style={{ flex: 1 }}>Cancel</GradientButton>
            <GradientButton variant="primary" size="md" onClick={submit} disabled={saving} style={{ flex: 1 }}>
              {saving ? "Issuing…" : "Issue card"}
            </GradientButton>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- detail drawer ----------------------------------------------------------

type Tab = "details" | "transactions" | "settings";

function CardDetail({ card, accounts, onClose, onChanged }: { card: MerchantCard; accounts: Account[]; onClose: () => void; onChanged: () => Promise<void> }) {
  const [tab, setTab] = useState<Tab>("details");
  const account = accounts.find((a) => a.id === card.account_id);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: zp.surface.overlay, backdropFilter: "blur(4px)", zIndex: zp.zIndex.modal, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(520px, 100vw)", height: "100vh", background: zp.surface.bg1, boxShadow: zp.elevation.lg, overflowY: "auto" }}>
        <div style={{ padding: "22px 24px", borderBottom: `1px solid ${zp.surface.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontFamily: zp.font.display, fontSize: 20, fontWeight: zp.weight.semibold, color: zp.text.primary, letterSpacing: "-0.02em" }}>Card •••• {card.last4 ?? "????"}</h2>
          <button onClick={onClose} aria-label="Close" style={{ background: zp.surface.bg3, border: "none", borderRadius: zp.radius.sm, width: 30, height: 30, cursor: "pointer", color: zp.text.primary, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: "22px 24px" }}>
          <CardVisual card={card} large />

          <div style={{ display: "inline-flex", gap: 2, padding: 3, marginTop: 20, background: zp.surface.bg2, border: `1px solid ${zp.surface.border}`, borderRadius: zp.radius.sm }}>
            {(["details", "transactions", "settings"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: "6px 14px", borderRadius: zp.radius.xs, border: "none",
                  background: tab === t ? zp.surface.bg1 : "transparent",
                  color: tab === t ? zp.text.primary : zp.text.muted,
                  fontSize: 12, fontWeight: tab === t ? zp.weight.semibold : zp.weight.medium,
                  textTransform: "capitalize" as const, cursor: "pointer",
                }}
              >{t}</button>
            ))}
          </div>

          <div style={{ marginTop: 16 }}>
            {tab === "details"      && <DetailsTab card={card} account={account} />}
            {tab === "transactions" && <TransactionsTab cardId={card.id} />}
            {tab === "settings"     && <SettingsTab card={card} onChanged={onChanged} onClose={onClose} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailsTab({ card, account }: { card: MerchantCard; account: Account | undefined }) {
  const [revealing, setRevealing] = useState(false);
  const [reveal, setReveal] = useState<{ pan?: string; cvv?: string; exp?: string; expires_at: number } | null>(null);
  const [copied, setCopied] = useState<"pan" | "cvv" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!reveal) return;
    const tick = () => {
      const secs = Math.max(0, Math.round(reveal.expires_at - Date.now() / 1000));
      setRemaining(secs);
      if (secs <= 0) setReveal(null);
    };
    tick();
    const h = setInterval(tick, 250);
    return () => clearInterval(h);
  }, [reveal]);

  const doReveal = async () => {
    if (!window.confirm("This will show your full card number once. Continue?")) return;
    setErr(null); setRevealing(true);
    try {
      const r = await fetch(`/api/v1/merchant/cards/${card.id}/reveal`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchant_id: card.merchant_id }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(data?.error?.message ?? "Reveal failed"); return; }
      if (data.mode === "stripe_iframe") {
        // For Stripe, the client would embed Stripe Elements. As a
        // first pass we surface the instructions + the ephemeral key
        // truncated — the card detail remains hidden.
        setErr("Stripe reveal flow requires the Stripe Elements iframe (not yet wired).");
        return;
      }
      setReveal({ pan: data.pan, cvv: data.cvv, exp: data.exp, expires_at: data.expires_at });
    } finally { setRevealing(false); }
  };

  const copy = async (val: string, kind: "pan" | "cvv") => {
    try {
      await navigator.clipboard.writeText(val);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    } catch { /* noop */ }
  };

  return (
    <div>
      <Row label="Provider" value={card.provider === "finix" ? "Finix" : "Stripe"} />
      <Row label="Currency" value={card.currency} />
      <Row label="Expires" value={card.exp_month && card.exp_year ? `${String(card.exp_month).padStart(2, "0")}/${card.exp_year}` : "—"} mono />
      <Row label="Cardholder" value={card.cardholder_name} />
      <Row label="Linked account" value={account ? `${account.name ?? account.account_number ?? account.id} · ${zp.fmtCurrency(Number(account.balance ?? 0))}` : "None"} />
      <Row label="Daily limit"   value={card.spending_limit_daily   ? zp.fmtCurrency(Number(card.spending_limit_daily))   : "No limit"} mono />
      <Row label="Monthly limit" value={card.spending_limit_monthly ? zp.fmtCurrency(Number(card.spending_limit_monthly)) : "No limit"} mono />

      <div style={{ marginTop: 18, padding: 14, borderRadius: zp.radius.md, background: zp.surface.bg2, border: `1px solid ${zp.surface.border}` }}>
        {reveal ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: zp.weight.semibold, color: zp.semantic.warning, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Reveal active — auto-hides in {remaining}s
              </div>
              <button onClick={() => setReveal(null)} style={{ background: "transparent", border: "none", fontSize: 11, color: zp.text.muted, cursor: "pointer" }}>Hide now</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1, fontFamily: zp.font.mono, fontSize: 18, letterSpacing: "0.14em", color: zp.text.primary }}>
                {reveal.pan}
              </div>
              <GradientButton size="sm" variant="ghost" icon={copied === "pan" ? <Check size={12} /> : <Copy size={12} />} onClick={() => reveal.pan && copy(reveal.pan, "pan")}>
                {copied === "pan" ? "Copied" : "Copy"}
              </GradientButton>
            </div>
            <div style={{ display: "flex", gap: 18, fontFamily: zp.font.mono, fontSize: 13, color: zp.text.primary }}>
              <div>
                <div style={{ fontSize: 9, opacity: 0.7, letterSpacing: "0.1em", textTransform: "uppercase" }}>Expiry</div>
                <div>{reveal.exp}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, opacity: 0.7, letterSpacing: "0.1em", textTransform: "uppercase" }}>CVV</div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {reveal.cvv}
                  <button
                    onClick={() => reveal.cvv && copy(reveal.cvv, "cvv")}
                    style={{ background: "transparent", border: "none", color: zp.text.muted, cursor: "pointer", display: "inline-flex", alignItems: "center" }}
                    aria-label="Copy CVV"
                  >
                    {copied === "cvv" ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 12, color: zp.text.muted, marginBottom: 10 }}>
              Full card number stays hidden by default. Reveal exposes PAN + CVV for 30 seconds.
            </div>
            <GradientButton variant="primary" size="sm" icon={<Eye size={12} />} onClick={doReveal} disabled={revealing || card.status === "cancelled"}>
              {revealing ? "Revealing…" : "Reveal card number"}
            </GradientButton>
          </>
        )}
        {err && (
          <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: zp.radius.sm, background: zp.semantic.dangerBg, color: zp.semantic.danger, fontSize: 11, fontWeight: zp.weight.semibold }}>{err}</div>
        )}
      </div>
    </div>
  );
}

function TransactionsTab({ cardId: _cardId }: { cardId: string }) {
  return (
    <div style={{ textAlign: "center", padding: "32px 10px", color: zp.text.muted, fontSize: 13 }}>
      <div style={{ fontSize: 28, marginBottom: 6 }}>📋</div>
      No transactions yet. Spend activity will appear here as soon as the card is used.
    </div>
  );
}

function SettingsTab({ card, onChanged, onClose }: { card: MerchantCard; onChanged: () => Promise<void>; onClose: () => void }) {
  const [daily, setDaily] = useState(card.spending_limit_daily ?? "");
  const [monthly, setMonthly] = useState(card.spending_limit_monthly ?? "");
  const [busy, setBusy] = useState<"toggle" | "cancel" | "limits" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const patch = async (action: string, extra: Record<string, unknown> = {}) => {
    setErr(null);
    const r = await fetch(`/api/v1/merchant/cards/${card.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchant_id: card.merchant_id, action, ...extra }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(data?.error?.message ?? "Update failed"); return false; }
    return true;
  };

  const toggle = async () => {
    setBusy("toggle");
    try {
      const action = card.status === "active" ? "freeze" : "unfreeze";
      if (await patch(action)) await onChanged();
    } finally { setBusy(null); }
  };
  const cancel = async () => {
    if (!window.confirm("Cancel this card permanently? This cannot be undone.")) return;
    setBusy("cancel");
    try {
      if (await patch("cancel")) { await onChanged(); onClose(); }
    } finally { setBusy(null); }
  };
  const saveLimits = async () => {
    setBusy("limits");
    try {
      if (await patch("update_limits", { daily: daily === "" ? null : Number(daily), monthly: monthly === "" ? null : Number(monthly) })) {
        await onChanged();
      }
    } finally { setBusy(null); }
  };

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: zp.weight.semibold, color: zp.text.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Spending limits</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <Label>Daily</Label>
          <input type="number" min={0} value={String(daily)} onChange={(e) => setDaily(e.target.value === "" ? "" : Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <Label>Monthly</Label>
          <input type="number" min={0} value={String(monthly)} onChange={(e) => setMonthly(e.target.value === "" ? "" : Number(e.target.value))} style={inputStyle} />
        </div>
      </div>
      <GradientButton variant="primary" size="sm" onClick={saveLimits} disabled={busy === "limits" || card.status === "cancelled"} style={{ marginTop: 10 }}>
        {busy === "limits" ? "Saving…" : "Save limits"}
      </GradientButton>

      <div style={{ height: 1, background: zp.surface.border, margin: "20px 0" }} />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <GradientButton
          variant={card.status === "active" ? "secondary" : "primary"}
          size="md"
          icon={card.status === "active" ? <Snowflake size={14} /> : <Unlock size={14} />}
          onClick={toggle}
          disabled={busy === "toggle" || card.status === "cancelled"}
        >
          {card.status === "active" ? (busy === "toggle" ? "Freezing…" : "Freeze card") : (busy === "toggle" ? "Unfreezing…" : "Unfreeze card")}
        </GradientButton>
        <GradientButton variant="danger" size="md" icon={<AlertTriangle size={14} />} onClick={cancel} disabled={busy === "cancel" || card.status === "cancelled"}>
          {busy === "cancel" ? "Cancelling…" : "Cancel card"}
        </GradientButton>
      </div>

      {err && (
        <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: zp.radius.sm, background: zp.semantic.dangerBg, color: zp.semantic.danger, fontSize: 12, fontWeight: zp.weight.semibold }}>{err}</div>
      )}
    </div>
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
