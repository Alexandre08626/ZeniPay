// /agents/cards/[id] — single card detail + auth history + pause/resume/cancel.

"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Shell, Card, Metric } from "@/components/agents/Shell";
import { apiFetch } from "../../_lib/session";
import {
  BORDER, ROW_SEP, TEXT, MUTED, LIGHT,
  ZP_GRAD, ZP_GREEN, ZP_CYAN, ZP_PURPLE, ZP_BLUE,
  fmtUSD, fmtDate,
} from "@/components/agents/theme";

interface IssuedCard {
  id: string; agent_id: string | null; status: string; currency: string;
  spending_controls: Record<string, unknown>; last4: string | null;
  expiry_month: number | null; expiry_year: number | null;
  issuer_provider: string; external_card_id: string | null;
  created_at: string;
}
interface Authorization {
  id: string; amount_cents: number; currency: string;
  merchant_name: string | null; merchant_category: string | null; merchant_country: string | null;
  decision: string;
  decision_reason: { policy_check?: string; reason?: string; checks?: Array<{ rule: string; pass: boolean; detail?: string }>; latency_ms?: number; signals_age_seconds?: number | null };
  created_at: string;
  transaction_id: string | null;
}

export default function CardDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const [card, setCard] = useState<IssuedCard | null>(null);
  const [agent, setAgent] = useState<{ id: string; name: string } | null>(null);
  const [wallet, setWallet] = useState<{ balance_cents: number; currency: string } | null>(null);
  const [auths, setAuths] = useState<Authorization[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Authorization | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [reveal, setReveal] = useState<{ url?: string; expires_at: number } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const d = await apiFetch<{
        card: IssuedCard; agent: { id: string; name: string } | null;
        wallet: { balance_cents: number; currency: string } | null;
        authorizations: Authorization[];
      }>(`/api/v1/agents/cards/${id}`);
      setCard(d.card); setAgent(d.agent); setWallet(d.wallet); setAuths(d.authorizations);
    } finally { setLoading(false); }
  };
  useEffect(() => { if (id) void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  const act = async (action: "pause" | "resume" | "cancel") => {
    if (action === "cancel" && !confirm("Cancel this card? This cannot be undone.")) return;
    await apiFetch(`/api/v1/agents/cards/${id}/${action}`, { method: "POST", body: JSON.stringify({}) });
    await load();
  };

  const doReveal = async () => {
    setRevealing(true);
    try {
      const r = await apiFetch<{ provider: string; url?: string; expires_at: number }>(
        `/api/v1/agents/cards/${id}/reveal`,
        { method: "POST", body: JSON.stringify({}) },
      );
      setReveal({ url: r.url, expires_at: r.expires_at });
    } finally { setRevealing(false); }
  };

  if (loading && !card) return <Shell title="Card"><p style={{ color: MUTED }}>Loading…</p></Shell>;
  if (!card) return <Shell title="Card not found"><p style={{ color: MUTED }}>No card with id <code>{id}</code>.</p></Shell>;

  const sc = card.spending_controls as Record<string, unknown>;
  const monthlyCap = asNumber(sc.monthly_cap_cents);
  const dailyCap = asNumber(sc.daily_cap_cents);
  const perTxCap = asNumber(sc.per_tx_cap_cents);
  const mtdSpend = auths
    .filter((a) => a.decision === "approved" && sameMonth(new Date(a.created_at), new Date()))
    .reduce((s, a) => s + a.amount_cents, 0);

  return (
    <Shell title={`Card •••• ${card.last4 ?? "••••"}`}>
      <div style={{ marginBottom: 12 }}>
        <Link href="/agents/cards" style={{ fontSize: 12, color: MUTED, fontWeight: 700, textDecoration: "none" }}>
          ← All cards
        </Link>
      </div>

      {/* Header + actions */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>
              {agent?.name ?? "Organization card"}
            </h2>
            <div style={{ marginTop: 4, fontSize: 11, color: LIGHT, fontFamily: "ui-monospace" }}>
              {card.id} · {card.issuer_provider} · {card.currency}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <StatusPill status={card.status} />
            {card.status === "active" && (
              <button onClick={() => act("pause")} style={btn("amber")}>Pause</button>
            )}
            {card.status === "paused" && (
              <button onClick={() => act("resume")} style={btn("green")}>Resume</button>
            )}
            {card.status !== "canceled" && (
              <button onClick={() => act("cancel")} style={btn("red")}>Cancel</button>
            )}
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginBottom: 16 }}>
        <Metric label="Wallet balance" value={wallet ? fmtUSD(wallet.balance_cents) : "—"} color={ZP_GREEN} />
        <Metric label="Spent this month" value={fmtUSD(mtdSpend)} sub={monthlyCap != null ? `of ${fmtUSD(monthlyCap)}` : "no cap"} color={ZP_CYAN} />
        <Metric label="Daily cap" value={dailyCap != null ? fmtUSD(dailyCap) : "—"} color={ZP_PURPLE} />
        <Metric label="Per-tx cap" value={perTxCap != null ? fmtUSD(perTxCap) : "—"} color={ZP_BLUE} />
      </div>

      {/* Reveal PAN */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>Reveal PAN + CVC</h3>
            <p style={{ margin: "4px 0 0", color: MUTED, fontSize: 12 }}>
              Opens a one-time URL valid for 60 seconds. We never store or log the PAN.
            </p>
          </div>
          {!reveal ? (
            <button onClick={doReveal} disabled={revealing || card.status === "canceled"} style={btn("grad", revealing || card.status === "canceled")}>
              {revealing ? "Generating…" : "Reveal (60s)"}
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {reveal.url && (
                <a href={reveal.url} target="_blank" rel="noreferrer" style={{ ...btn("grad", false), textDecoration: "none" }}>
                  Open reveal ↗
                </a>
              )}
              <span style={{ fontSize: 11, color: MUTED }}>exp {new Date(reveal.expires_at * 1000).toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Auth history */}
      <Card style={{ padding: 0 }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${BORDER}` }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>Recent authorizations</h3>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: MUTED }}>
            Click a row to see the policy-check breakdown (CFOs love this part).
          </p>
        </div>
        {auths.length === 0 ? (
          <p style={{ padding: 24, color: MUTED, fontSize: 13, margin: 0 }}>
            No authorizations yet. Try the dev simulator from the agent detail page, or wait for the agent to use the card.
          </p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["When", "Merchant", "MCC", "Amount", "Decision", "Latency"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${BORDER}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {auths.map((a) => (
                <tr key={a.id} onClick={() => setSelected(a)} style={{ borderBottom: `1px solid ${ROW_SEP}`, cursor: "pointer" }}>
                  <td style={{ padding: "10px 16px", fontSize: 12, color: MUTED }}>{fmtDate(a.created_at)}</td>
                  <td style={{ padding: "10px 16px", fontSize: 12, color: TEXT }}>{a.merchant_name ?? "—"}</td>
                  <td style={{ padding: "10px 16px", fontSize: 11, color: MUTED, fontFamily: "ui-monospace" }}>{a.merchant_category ?? "—"}</td>
                  <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 800, color: TEXT }}>{fmtUSD(a.amount_cents)}</td>
                  <td style={{ padding: "10px 16px" }}><DecisionPill decision={a.decision} /></td>
                  <td style={{ padding: "10px 16px", fontSize: 11, color: a.decision_reason?.latency_ms && a.decision_reason.latency_ms > 1500 ? "#DC2626" : MUTED }}>
                    {a.decision_reason?.latency_ms ?? "—"}ms
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {selected && <AuthDrawer auth={selected} onClose={() => setSelected(null)} />}
    </Shell>
  );
}

function AuthDrawer({ auth, onClose }: { auth: Authorization; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 500, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 520, background: "#fff", borderLeft: `1px solid ${BORDER}`, height: "100vh", padding: "24px 24px 32px", overflow: "auto" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>Authorization</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, color: LIGHT, cursor: "pointer" }}>×</button>
        </div>
        <p style={{ fontSize: 11, color: LIGHT, fontFamily: "ui-monospace", wordBreak: "break-all", margin: "0 0 16px" }}>{auth.id}</p>
        <KV k="Amount" v={`${fmtUSD(auth.amount_cents)} ${auth.currency}`} />
        <KV k="Merchant" v={auth.merchant_name ?? "—"} />
        <KV k="MCC" v={auth.merchant_category ?? "—"} />
        <KV k="Country" v={auth.merchant_country ?? "—"} />
        <KV k="Decision" v={auth.decision} />
        <KV k="Latency" v={`${auth.decision_reason?.latency_ms ?? "—"} ms`} />
        <KV k="Signals age" v={`${auth.decision_reason?.signals_age_seconds ?? "—"} s`} />
        <div style={{ marginTop: 20 }}>
          <h4 style={{ margin: "0 0 6px", fontSize: 11, color: MUTED, fontWeight: 800, letterSpacing: "0.08em" }}>POLICY CHECKS</h4>
          {auth.decision_reason?.checks?.map((c, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", borderRadius: 6, background: c.pass ? "rgba(45,190,96,0.08)" : "rgba(220,38,38,0.08)", marginBottom: 4, fontSize: 12 }}>
              <span style={{ fontFamily: "ui-monospace", color: TEXT }}>{c.rule}</span>
              <span style={{ color: c.pass ? "#16A34A" : "#DC2626", fontWeight: 700 }}>
                {c.pass ? "✓ pass" : "✗ fail"}{c.detail ? ` · ${c.detail}` : ""}
              </span>
            </div>
          )) ?? <p style={{ color: MUTED, fontSize: 12 }}>No policy checks recorded.</p>}
        </div>
        <div style={{ marginTop: 20 }}>
          <h4 style={{ margin: "0 0 6px", fontSize: 11, color: MUTED, fontWeight: 800, letterSpacing: "0.08em" }}>RAW decision_reason</h4>
          <pre style={{ margin: 0, padding: "12px 14px", background: "#0f172a", color: "#e5e7eb", borderRadius: 10, fontSize: 11, lineHeight: 1.5, overflow: "auto", fontFamily: "ui-monospace" }}>
            {JSON.stringify(auth.decision_reason, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const m: Record<string, { bg: string; fg: string }> = {
    active:    { bg: "rgba(45,190,96,0.12)", fg: "#16A34A" },
    paused:    { bg: "rgba(245,166,35,0.12)", fg: "#D97706" },
    canceled:  { bg: "rgba(220,38,38,0.1)", fg: "#DC2626" },
    requested: { bg: "rgba(21,184,201,0.12)", fg: "#0891B2" },
    expired:   { bg: "#f1f5f9", fg: "#64748b" },
  };
  const c = m[status] ?? { bg: "#f1f5f9", fg: "#64748b" };
  return <span style={{ fontSize: 10, fontWeight: 800, padding: "4px 12px", borderRadius: 999, background: c.bg, color: c.fg, textTransform: "uppercase", letterSpacing: "0.04em" }}>{status}</span>;
}
function DecisionPill({ decision }: { decision: string }) {
  const approved = decision === "approved";
  return <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 10px", borderRadius: 999, background: approved ? "rgba(45,190,96,0.12)" : "rgba(220,38,38,0.1)", color: approved ? "#16A34A" : "#DC2626", textTransform: "uppercase", letterSpacing: "0.04em" }}>{decision.replace("_", " ")}</span>;
}
function KV({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${ROW_SEP}` }}>
      <span style={{ color: MUTED, fontSize: 12, fontWeight: 700 }}>{k}</span>
      <span style={{ color: TEXT, fontSize: 12, fontWeight: 700, maxWidth: 320, textAlign: "right", wordBreak: "break-word" }}>{v}</span>
    </div>
  );
}
function btn(kind: "green" | "amber" | "red" | "grad", disabled = false): React.CSSProperties {
  const styles: Record<string, { bg: string; fg: string }> = {
    green: { bg: "rgba(45,190,96,0.12)", fg: "#16A34A" },
    amber: { bg: "rgba(245,166,35,0.12)", fg: "#D97706" },
    red:   { bg: "rgba(220,38,38,0.1)", fg: "#DC2626" },
    grad:  { bg: ZP_GRAD, fg: "#fff" },
  };
  const s = styles[kind];
  return {
    background: disabled ? "#94a3b8" : s.bg, color: kind === "grad" ? "#fff" : s.fg,
    border: kind === "grad" ? "none" : `1px solid ${s.fg}40`,
    padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}
function asNumber(v: unknown): number | null { return typeof v === "number" && Number.isFinite(v) ? v : null; }
function sameMonth(a: Date, b: Date): boolean {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth();
}
