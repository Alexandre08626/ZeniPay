// /agents/cards — CFO-grade card list + issue wizard.

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Shell, Card } from "@/components/agents/Shell";
import { apiFetch } from "../_lib/session";
import {
  BORDER, ROW_SEP, TEXT, MUTED, LIGHT,
  ZP_GRAD, ZP_GREEN, ZP_CYAN, ZP_PURPLE,
  fmtUSD, fmtDate,
} from "@/components/agents/theme";

interface IssuedCard {
  id: string;
  agent_id: string | null;
  cardholder_type: string;
  issuer_provider: string;
  currency: string;
  card_type: string;
  status: "requested" | "active" | "paused" | "canceled" | "expired";
  spending_controls: Record<string, unknown>;
  last4: string | null;
  expiry_month: number | null;
  expiry_year: number | null;
  created_at: string;
}
interface AgentRow { id: string; name: string; wallet: { id: string; balance_cents: number } | null }

export default function CardsPage() {
  const [cards, setCards] = useState<IssuedCard[]>([]);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueResult, setIssueResult] = useState<{ card: IssuedCard } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [c, a] = await Promise.all([
        apiFetch<{ cards: IssuedCard[] }>("/api/v1/agents/cards"),
        apiFetch<{ agents: AgentRow[] }>("/api/v1/agents/agents"),
      ]);
      setCards(c.cards);
      setAgents(a.agents);
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  return (
    <Shell title="Cards">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ color: MUTED, margin: 0, fontSize: 13 }}>
          {cards.length} {cards.length === 1 ? "card" : "cards"} · virtual Visa issued to your agents
        </p>
        <button
          onClick={() => setIssueOpen(true)}
          style={{ background: ZP_GRAD, color: "#fff", border: "none", padding: "10px 18px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", boxShadow: "0 4px 12px rgba(45,190,96,0.25)" }}
        >
          + Issue card
        </button>
      </div>

      {loading ? (
        <Card><p style={{ color: MUTED, fontSize: 13, margin: 0 }}>Loading cards…</p></Card>
      ) : cards.length === 0 ? (
        <Card>
          <div style={{ padding: "32px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 42, marginBottom: 10 }}>💳</div>
            <p style={{ fontSize: 15, fontWeight: 700, color: TEXT, margin: "0 0 8px" }}>No cards yet</p>
            <p style={{ color: MUTED, margin: "0 0 14px", fontSize: 13 }}>
              Issue a virtual Visa to any agent in 3 clicks. Programmable limits, merchant allowlist, and
              travel-MCC auto-block to prevent circular settlement with Zeniva Travel.
            </p>
            <button
              onClick={() => setIssueOpen(true)}
              style={{ background: ZP_GRAD, color: "#fff", border: "none", padding: "10px 18px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
            >
              + Issue the first card
            </button>
          </div>
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
          {cards.map((c) => {
            const agent = agents.find((a) => a.id === c.agent_id) ?? null;
            const sc = c.spending_controls as Record<string, number | undefined>;
            const monthlyCap = Number(sc.monthly_cap_cents ?? 0);
            return (
              <Link
                key={c.id}
                href={`/agents/cards/${c.id}`}
                style={{ textDecoration: "none" }}
              >
                <CardTile card={c} agentName={agent?.name ?? null} monthlyCap={monthlyCap} />
              </Link>
            );
          })}
        </div>
      )}

      {issueOpen && (
        <IssueCardWizard
          agents={agents}
          onClose={() => setIssueOpen(false)}
          onIssued={async (card) => {
            setIssueOpen(false);
            setIssueResult({ card });
            await load();
          }}
        />
      )}
      {issueResult && <IssuedRevealModal card={issueResult.card} onClose={() => setIssueResult(null)} />}
    </Shell>
  );
}

// ---------------------------------------------------------------------------
// Card tile (visual credit card)
// ---------------------------------------------------------------------------
function CardTile({ card, agentName, monthlyCap }: { card: IssuedCard; agentName: string | null; monthlyCap: number }) {
  const statusColor = {
    active: ZP_GREEN, paused: "#F5A623", canceled: "#DC2626", requested: ZP_CYAN, expired: LIGHT,
  }[card.status] ?? LIGHT;

  return (
    <div style={{
      borderRadius: 18,
      background: card.status === "canceled"
        ? "linear-gradient(135deg,#94a3b8,#64748b)"
        : "linear-gradient(135deg, #0d1633 0%, #1a2a5e 35%, #2DBE60 70%, #15B8C9 95%)",
      color: "#fff", padding: "20px 22px", boxShadow: "0 4px 14px rgba(15,23,42,0.12)",
      position: "relative", overflow: "hidden", aspectRatio: "1.586",
      cursor: "pointer", transition: "transform 0.2s",
    }}
      onMouseOver={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
      onMouseOut={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: "0.2em", opacity: 0.7, fontWeight: 700 }}>ZENIPAY · VISA</div>
          <div style={{ marginTop: 4, fontSize: 12, fontWeight: 800, letterSpacing: "0.06em" }}>
            {agentName ?? "(org card)"}
          </div>
        </div>
        <span style={{
          padding: "2px 10px", borderRadius: 999, fontSize: 9, fontWeight: 800, letterSpacing: "0.06em",
          background: "rgba(255,255,255,0.15)", border: `1px solid ${statusColor}80`, color: statusColor === LIGHT ? "#fff" : statusColor,
          textTransform: "uppercase",
        }}>{card.status}</span>
      </div>
      <div style={{ position: "absolute", bottom: 22, left: 22, right: 22 }}>
        <div style={{ fontSize: 20, fontFamily: "ui-monospace, Menlo, monospace", letterSpacing: "0.18em", fontWeight: 600 }}>
          •••• {card.last4 ?? "••••"}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 11, opacity: 0.85 }}>
          <span>exp {String(card.expiry_month ?? "").padStart(2,"0")}/{String(card.expiry_year ?? "").slice(-2)}</span>
          <span>{monthlyCap > 0 ? `${fmtUSD(monthlyCap)}/mo cap` : "no cap"}</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Issue wizard (3 steps)
// ---------------------------------------------------------------------------
function IssueCardWizard({
  agents, onClose, onIssued,
}: {
  agents: AgentRow[]; onClose: () => void; onIssued: (card: IssuedCard) => void;
}) {
  const [step, setStep] = useState(1);
  const [agentId, setAgentId] = useState(agents[0]?.id ?? "");
  const [perTx, setPerTx] = useState("100");
  const [daily, setDaily] = useState("500");
  const [monthly, setMonthly] = useState("5000");
  const [allowedMerchants, setAllowedMerchants] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setErr(""); setLoading(true);
    try {
      const idempotencyKey = `issue-card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const spending_controls = {
        currency: "USD",
        per_tx_cap_cents: Math.round(Number(perTx) * 100) || undefined,
        daily_cap_cents: Math.round(Number(daily) * 100) || undefined,
        monthly_cap_cents: Math.round(Number(monthly) * 100) || undefined,
        allowed_merchants: allowedMerchants
          .split(",").map((s) => s.trim()).filter(Boolean),
      };
      const r = await apiFetch<{ card: IssuedCard }>("/api/v1/agents/cards", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({ agent_id: agentId, cardholder_type: "agent", spending_controls }),
      });
      onIssued(r.card);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "failed");
    } finally { setLoading(false); }
  };

  return (
    <Modal title={`Issue card · Step ${step} of 3`} onClose={onClose}>
      {step === 1 && (
        <div>
          <Label>AGENT</Label>
          <select value={agentId} onChange={(e) => setAgentId(e.target.value)} style={inputStyle()}>
            {agents.length === 0 ? <option value="">(no agents yet)</option> :
              agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <p style={{ fontSize: 12, color: MUTED, marginTop: 6 }}>
            The card will be funded from this agent&apos;s wallet. Top up via Treasury → Transfer if needed.
          </p>
          <StepNav
            primary="Configure limits →"
            onPrimary={() => setStep(2)}
            disabled={!agentId}
            onCancel={onClose}
          />
        </div>
      )}
      {step === 2 && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div><Label>PER-TX CAP (USD)</Label><input value={perTx} onChange={(e) => setPerTx(e.target.value)} style={inputStyle()} /></div>
            <div><Label>DAILY (USD)</Label><input value={daily} onChange={(e) => setDaily(e.target.value)} style={inputStyle()} /></div>
            <div><Label>MONTHLY (USD)</Label><input value={monthly} onChange={(e) => setMonthly(e.target.value)} style={inputStyle()} /></div>
          </div>
          <Label>ALLOWED MERCHANTS (optional, comma-separated)</Label>
          <input value={allowedMerchants} onChange={(e) => setAllowedMerchants(e.target.value)} placeholder="openai.com, anthropic.com" style={inputStyle()} />
          <p style={{ fontSize: 11, color: MUTED, marginTop: 6 }}>
            Travel MCCs (airlines, hotels, trains, taxis) are auto-blocked to prevent paying Zeniva via Finix.
          </p>
          <StepNav
            primary="Review →"
            onPrimary={() => setStep(3)}
            onBack={() => setStep(1)}
            onCancel={onClose}
          />
        </div>
      )}
      {step === 3 && (
        <div>
          <div style={{ padding: 14, background: "#f8fafc", border: `1px solid ${BORDER}`, borderRadius: 12 }}>
            <Row k="Agent" v={agents.find((a) => a.id === agentId)?.name ?? "—"} />
            <Row k="Per-tx cap" v={perTx ? fmtUSD(Math.round(Number(perTx) * 100)) : "—"} />
            <Row k="Daily cap" v={daily ? fmtUSD(Math.round(Number(daily) * 100)) : "—"} />
            <Row k="Monthly cap" v={monthly ? fmtUSD(Math.round(Number(monthly) * 100)) : "—"} />
            <Row k="Allowed merchants" v={allowedMerchants.trim() || "(any — default)"} />
            <Row k="Blocked MCCs" v="travel (auto)" />
          </div>
          {err && <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 8, background: "rgba(220,38,38,0.08)", color: "#DC2626", fontSize: 12, fontWeight: 700 }}>{err}</div>}
          <StepNav
            primary={loading ? "Issuing…" : "Issue card"}
            onPrimary={submit}
            disabled={loading || !agentId}
            onBack={() => setStep(2)}
            onCancel={onClose}
          />
        </div>
      )}
    </Modal>
  );
}

function IssuedRevealModal({ card, onClose }: { card: IssuedCard; onClose: () => void }) {
  const [revealUrl, setRevealUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState(0);
  const [loading, setLoading] = useState(false);

  const reveal = async () => {
    setLoading(true);
    try {
      const r = await apiFetch<{ provider: string; url?: string; ephemeral_key_secret?: string; expires_at: number }>(
        `/api/v1/agents/cards/${card.id}/reveal`,
        { method: "POST", body: JSON.stringify({}) },
      );
      setExpiresAt(r.expires_at);
      if (r.provider === "mock" && r.url) setRevealUrl(r.url);
      else setRevealUrl(""); // Stripe secret would go into an iframe component
    } finally { setLoading(false); }
  };

  return (
    <Modal title="Card issued ✓" onClose={onClose}>
      <p style={{ margin: "0 0 14px", color: MUTED, fontSize: 13 }}>
        Your new card <strong style={{ color: TEXT }}>•••• {card.last4}</strong> is active. You can reveal the PAN now — it&apos;s shown once for 60 seconds.
      </p>
      <div style={{ padding: 14, background: "#f8fafc", border: `1px solid ${BORDER}`, borderRadius: 12, marginBottom: 12 }}>
        <Row k="Card id" v={card.id} />
        <Row k="Last 4" v={card.last4 ?? "—"} />
        <Row k="Exp" v={`${String(card.expiry_month ?? "").padStart(2,"0")}/${String(card.expiry_year ?? "").slice(-2)}`} />
        <Row k="Issuer" v={card.issuer_provider} />
      </div>
      {!revealUrl ? (
        <button
          onClick={reveal}
          disabled={loading}
          style={{ width: "100%", background: ZP_GRAD, color: "#fff", border: "none", padding: "11px", borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: loading ? "not-allowed" : "pointer" }}
        >
          {loading ? "Generating reveal URL…" : "Reveal PAN + CVC (60s)"}
        </button>
      ) : (
        <div>
          <a
            href={revealUrl} target="_blank" rel="noreferrer"
            style={{ display: "block", textAlign: "center", padding: 11, background: ZP_CYAN, color: "#fff", textDecoration: "none", fontWeight: 800, fontSize: 13, borderRadius: 10 }}
          >
            Open secure reveal ↗
          </a>
          <p style={{ marginTop: 8, fontSize: 11, color: MUTED, textAlign: "center" }}>
            Expires at {new Date(expiresAt * 1000).toLocaleTimeString()}
          </p>
        </div>
      )}
      <button
        onClick={onClose}
        style={{ marginTop: 14, width: "100%", background: "#f1f5f9", color: MUTED, border: `1px solid ${BORDER}`, padding: "10px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
      >
        Done
      </button>
    </Modal>
  );
}

// ───── shared atoms ─────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 20, width: "100%", maxWidth: 500, maxHeight: "92vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <div style={{ padding: "18px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, color: LIGHT, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}
function Label({ children }: { children: React.ReactNode }) {
  return <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: "0.08em", marginTop: 12 }}>{children}</label>;
}
function inputStyle(): React.CSSProperties {
  return { width: "100%", padding: "11px 14px", borderRadius: 10, border: `1.5px solid ${BORDER}`, fontSize: 14, outline: "none", margin: "6px 0 4px", boxSizing: "border-box", background: "#f8fafc", color: TEXT };
}
function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${ROW_SEP}` }}>
      <span style={{ color: MUTED, fontSize: 12, fontWeight: 700 }}>{k}</span>
      <span style={{ color: TEXT, fontSize: 12, fontWeight: 700, maxWidth: 260, textAlign: "right", wordBreak: "break-word" }}>{v}</span>
    </div>
  );
}
function StepNav({
  primary, onPrimary, onBack, onCancel, disabled,
}: {
  primary: string; onPrimary: () => void; onBack?: () => void; onCancel: () => void; disabled?: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
      <button onClick={onCancel} style={{ background: "#f1f5f9", color: MUTED, border: `1px solid ${BORDER}`, padding: "10px 18px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", flex: 1 }}>Cancel</button>
      {onBack && (
        <button onClick={onBack} style={{ background: "#f8fafc", color: TEXT, border: `1px solid ${BORDER}`, padding: "10px 18px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", flex: 1 }}>← Back</button>
      )}
      <button onClick={onPrimary} disabled={disabled}
        style={{ background: disabled ? "#94a3b8" : ZP_GRAD, color: "#fff", border: "none", padding: "10px 18px", borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: disabled ? "not-allowed" : "pointer", flex: 1.2 }}
      >{primary}</button>
    </div>
  );
}

// Import side-effect: make sure ZP_PURPLE is used somewhere so tree-shaking keeps the import.
void ZP_PURPLE;
void fmtDate;
