// /agents/zenicards — closed-loop ZeniPay-issued card product.
//
// The investor-friendly version of "Cards". Unlike /agents/cards (Stripe
// Issuing, pending Stripe approval), ZeniCards are issued entirely by
// ZeniPay against our own BIN range (991001+) and backed by a zenicore
// account per card. Shows: card grid, issue modal, reveal-once PAN+CVV
// on fresh issue, pause/resume/cancel actions.

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Shell, Card } from "@/components/agents/Shell";
import { apiFetch } from "../_lib/session";
import {
  BORDER, ROW_SEP, TEXT, MUTED, LIGHT,
  ZP_GRAD, ZP_GREEN, ZP_CYAN, ZP_PURPLE,
  fmtDate,
} from "@/components/agents/theme";

interface Zenicard {
  id: string;
  last4: string;
  expiry_month: number;
  expiry_year: number;
  agent_id: string | null;
  status: "active" | "paused" | "frozen" | "canceled";
  zenicore_account_id: string;
  limit_per_tx_micro: string | null;
  limit_daily_micro: string | null;
  allowed_merchant_types: string[];
  bin: { bin_prefix: string; name: string; product_tier: string; currency: string } | null;
  created_at: string;
  canceled_at: string | null;
}

interface RevealOnce {
  card_number_full: string;
  cvv_plaintext: string;
}

export default function ZenicardsPage() {
  const [cards, setCards] = useState<Zenicard[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showIssue, setShowIssue] = useState(false);
  const [revealed, setRevealed] = useState<{ last4: string; pan: string; cvv: string; expiry: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiFetch<{ cards: Zenicard[] }>("/api/v1/agents/zenicards");
      setCards(r.cards);
      setErr(null);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const patch = async (card_id: string, action: "pause" | "resume" | "cancel") => {
    try {
      await apiFetch("/api/v1/agents/zenicards", {
        method: "PATCH",
        body: JSON.stringify({ card_id, action }),
      });
      await load();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  };

  return (
    <Shell title="ZeniCards">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: TEXT, letterSpacing: "-0.2px" }}>
            Closed-loop ZeniPay card product
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: MUTED }}>
            BIN 991001+ · Issued against zenicore accounts · Accepted by ZeniPay merchant network
          </p>
        </div>
        <button
          onClick={() => setShowIssue(true)}
          style={{
            padding: "10px 18px", borderRadius: 10,
            background: ZP_GREEN, color: "#fff", border: "none",
            fontSize: 13, fontWeight: 800, cursor: "pointer",
          }}
        >
          + Issue ZeniCard
        </button>
      </div>

      {err && (
        <Card style={{ marginBottom: 14, borderLeft: "4px solid #DC2626" }}>
          <p style={{ margin: 0, color: "#DC2626", fontSize: 12 }}>{err}</p>
        </Card>
      )}

      {loading && cards.length === 0 ? (
        <Card><p style={{ color: MUTED, margin: 0, fontSize: 13 }}>Loading…</p></Card>
      ) : cards.length === 0 ? (
        <Card>
          <div style={{ padding: "28px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>💳</div>
            <p style={{ fontSize: 15, fontWeight: 800, color: TEXT, margin: "0 0 6px" }}>No ZeniCards yet</p>
            <p style={{ fontSize: 12, color: MUTED, maxWidth: 440, marginInline: "auto", lineHeight: 1.5, margin: 0 }}>
              Issue a ZeniCard against an agent or directly to the org treasury. PAN + CVV are revealed ONCE at issue and never stored client-side.
            </p>
          </div>
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
          {cards.map((c) => <ZenicardTile key={c.id} card={c} onAction={patch} />)}
        </div>
      )}

      {showIssue && (
        <IssueModal
          onCancel={() => setShowIssue(false)}
          onIssued={(r) => {
            setShowIssue(false);
            setRevealed(r);
            void load();
          }}
        />
      )}

      {revealed && <RevealModal reveal={revealed} onDismiss={() => setRevealed(null)} />}
    </Shell>
  );
}

function ZenicardTile({ card, onAction }: { card: Zenicard; onAction: (id: string, action: "pause" | "resume" | "cancel") => void }) {
  const tierColor = card.bin?.product_tier === "enterprise" ? ZP_PURPLE
                 : card.bin?.product_tier === "premium" ? ZP_CYAN
                 : ZP_GREEN;
  const canceled = card.status === "canceled";

  return (
    <Card style={{ padding: 0, overflow: "hidden", opacity: canceled ? 0.55 : 1 }}>
      {/* Card face mockup */}
      <div
        style={{
          padding: 18,
          background: ZP_GRAD,
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          minHeight: 150,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.75 }}>
              ZeniCard {card.bin?.product_tier ?? "standard"}
            </div>
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2, fontFamily: "ui-monospace" }}>
              BIN {card.bin?.bin_prefix ?? "991001"} · {card.bin?.currency ?? "USD"}
            </div>
          </div>
          <StatusPill status={card.status} inverse />
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ fontFamily: "ui-monospace", fontSize: 17, letterSpacing: 3, fontWeight: 700 }}>
          •••• •••• •••• {card.last4}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, opacity: 0.85 }}>
          <span>{card.agent_id ? `agent ${card.agent_id.slice(0, 10)}…` : "org treasury"}</span>
          <span style={{ fontFamily: "ui-monospace" }}>
            {String(card.expiry_month).padStart(2, "0")}/{String(card.expiry_year).slice(-2)}
          </span>
        </div>
      </div>

      {/* Meta + actions */}
      <div style={{ padding: 14, borderTop: `1px solid ${BORDER}` }}>
        <div style={{ fontSize: 10, color: MUTED, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700, marginBottom: 6 }}>
          Account · {card.zenicore_account_id.slice(0, 12)}…
        </div>
        <div style={{ fontSize: 11, color: MUTED, marginBottom: 8 }}>
          Issued {fmtDate(card.created_at)}
          {card.canceled_at && ` · canceled ${fmtDate(card.canceled_at)}`}
        </div>
        {!canceled && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {card.status === "active" ? (
              <ActionBtn onClick={() => onAction(card.id, "pause")} color="#D97706">Pause</ActionBtn>
            ) : card.status === "paused" ? (
              <ActionBtn onClick={() => onAction(card.id, "resume")} color={ZP_GREEN}>Resume</ActionBtn>
            ) : null}
            <ActionBtn onClick={() => { if (confirm(`Cancel card ending ${card.last4}? This is irreversible.`)) onAction(card.id, "cancel"); }} color="#DC2626">
              Cancel
            </ActionBtn>
          </div>
        )}
      </div>
      {void tierColor}
    </Card>
  );
}

function ActionBtn({ onClick, color, children }: { onClick: () => void; color: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 12px", borderRadius: 8,
        background: "transparent", border: `1px solid ${color}`,
        color, fontSize: 11, fontWeight: 700, cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function StatusPill({ status, inverse }: { status: string; inverse?: boolean }) {
  const m: Record<string, { bg: string; fg: string }> = {
    active:   { bg: "rgba(45,190,96,0.15)", fg: "#16A34A" },
    paused:   { bg: "rgba(217,119,6,0.15)", fg: "#D97706" },
    frozen:   { bg: "rgba(14,165,233,0.15)", fg: "#0891B2" },
    canceled: { bg: "rgba(120,120,120,0.15)", fg: "#737373" },
  };
  const c = m[status] ?? m.canceled;
  const bg = inverse ? "rgba(255,255,255,0.22)" : c.bg;
  const fg = inverse ? "#fff" : c.fg;
  return (
    <span style={{ fontSize: 9, fontWeight: 800, padding: "3px 9px", borderRadius: 999, background: bg, color: fg, textTransform: "uppercase", letterSpacing: "0.08em" }}>
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Issue modal
// ---------------------------------------------------------------------------
function IssueModal({ onCancel, onIssued }: {
  onCancel: () => void;
  onIssued: (r: { last4: string; pan: string; cvv: string; expiry: string }) => void;
}) {
  const [tier, setTier] = useState<"standard" | "premium" | "enterprise">("standard");
  const [currency, setCurrency] = useState<"USD" | "CAD" | "EUR">("CAD");
  const [agentId, setAgentId] = useState("");
  const [limitPerTx, setLimitPerTx] = useState("");
  const [limitDaily, setLimitDaily] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const body: Record<string, unknown> = {
        product_tier: tier,
        currency,
      };
      if (agentId.trim()) body.agent_id = agentId.trim();
      if (limitPerTx.trim()) body.limit_per_tx = Number(limitPerTx.trim());
      if (limitDaily.trim()) body.limit_daily  = Number(limitDaily.trim());
      const r = await apiFetch<{ card: { last4: string; expiry_month: number; expiry_year: number }; reveal_once: RevealOnce }>(
        "/api/v1/agents/zenicards",
        { method: "POST", body: JSON.stringify(body) },
      );
      onIssued({
        last4: r.card.last4,
        pan: r.reveal_once.card_number_full,
        cvv: r.reveal_once.cvv_plaintext,
        expiry: `${String(r.card.expiry_month).padStart(2, "0")}/${String(r.card.expiry_year).slice(-2)}`,
      });
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  return (
    <Overlay onDismiss={onCancel}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 24, maxWidth: 480, width: "100%", boxShadow: "0 10px 30px rgba(15,23,42,0.2)" }}>
        <h2 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 800, color: TEXT, letterSpacing: "-0.3px" }}>
          Issue a new ZeniCard
        </h2>
        <p style={{ margin: "0 0 16px", fontSize: 12, color: MUTED, lineHeight: 1.5 }}>
          The PAN and CVV will be displayed ONCE on the next screen. They're never stored
          on the client and never returned by the API again.
        </p>
        <form onSubmit={submit}>
          <FormSelect label="Product tier" value={tier} onChange={(v) => setTier(v as typeof tier)} options={["standard", "premium", "enterprise"]} />
          <FormSelect label="Currency" value={currency} onChange={(v) => setCurrency(v as typeof currency)} options={["USD", "CAD", "EUR"]} />
          <FormText label="Agent id (optional)" value={agentId} onChange={setAgentId} placeholder="agt_… (blank = issued to org treasury)" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <FormText label="Per-tx limit" value={limitPerTx} onChange={setLimitPerTx} placeholder="e.g. 500" />
            <FormText label="Daily limit"  value={limitDaily}  onChange={setLimitDaily}  placeholder="e.g. 2500" />
          </div>
          {err && (
            <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: "rgba(220,38,38,0.08)", color: "#DC2626", fontSize: 12 }}>
              {err}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 18 }}>
            <button type="button" onClick={onCancel} style={{ padding: "8px 16px", borderRadius: 10, background: "transparent", border: `1px solid ${BORDER}`, color: TEXT, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
            <button type="submit" disabled={busy} style={{ padding: "8px 18px", borderRadius: 10, background: ZP_GREEN, border: "none", color: "#fff", fontSize: 12, fontWeight: 800, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>
              {busy ? "Issuing…" : "Issue ZeniCard"}
            </button>
          </div>
        </form>
      </div>
    </Overlay>
  );
}

function RevealModal({ reveal, onDismiss }: { reveal: { last4: string; pan: string; cvv: string; expiry: string }; onDismiss: () => void }) {
  return (
    <Overlay onDismiss={onDismiss}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 24, maxWidth: 460, width: "100%", boxShadow: "0 10px 30px rgba(15,23,42,0.2)" }}>
        <h2 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 800, color: TEXT }}>Your new ZeniCard</h2>
        <p style={{ margin: "0 0 16px", fontSize: 12, color: "#D97706", fontWeight: 700 }}>
          ⚠ This is the only time these values will be shown. Copy them now.
        </p>
        <div style={{ display: "grid", gap: 10 }}>
          <RevealRow label="Card number (PAN)" value={reveal.pan} mono />
          <RevealRow label="Expiry"            value={reveal.expiry} mono />
          <RevealRow label="CVV"               value={reveal.cvv} mono />
          <RevealRow label="Last 4"            value={reveal.last4} />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
          <button
            onClick={onDismiss}
            style={{ padding: "8px 18px", borderRadius: 10, background: TEXT, color: "#fff", border: "none", fontSize: 12, fontWeight: 800, cursor: "pointer" }}
          >
            I've copied the details
          </button>
        </div>
      </div>
    </Overlay>
  );
}

function RevealRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderRadius: 8, background: "#f8fafc", border: `1px solid ${BORDER}`, alignItems: "center" }}>
      <span style={{ fontSize: 11, color: MUTED, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontFamily: mono ? "ui-monospace" : "inherit", fontWeight: 700, color: TEXT, fontSize: mono ? 15 : 13, letterSpacing: mono ? 1 : 0 }}>
        {value}
      </span>
    </div>
  );
}

function Overlay({ children, onDismiss }: { children: React.ReactNode; onDismiss: () => void }) {
  return (
    <div
      onClick={onDismiss}
      style={{
        position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 100, padding: 20,
      }}
    >
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function FormText({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label style={{ display: "block", marginBottom: 10 }}>
      <span style={{ display: "block", fontSize: 11, color: MUTED, fontWeight: 700, marginBottom: 4 }}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: "100%", padding: "8px 10px", fontSize: 13, border: `1px solid ${BORDER}`, borderRadius: 8, background: "#fff", boxSizing: "border-box" }}
      />
    </label>
  );
}

function FormSelect<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: T[] }) {
  return (
    <label style={{ display: "block", marginBottom: 10 }}>
      <span style={{ display: "block", fontSize: 11, color: MUTED, fontWeight: 700, marginBottom: 4 }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        style={{ width: "100%", padding: "8px 10px", fontSize: 13, border: `1px solid ${BORDER}`, borderRadius: 8, background: "#fff", boxSizing: "border-box" }}
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

void LIGHT;
