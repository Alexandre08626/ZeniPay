// /agents/dashboard — authenticated agents overview.
//
// Pulls real agents + transactions + cards from the authenticated API.
// When the org has no agents yet (the common case on a fresh signup),
// we fall back to four big EXAMPLE agent cards so the dashboard never
// looks empty during an investor demo, with a clear "create your own"
// CTA. As soon as an org creates a real agent, the real roster takes
// over.

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Shell, Metric, Card } from "@/components/agents/Shell";
import { apiFetch } from "../_lib/session";
import {
  BORDER,
  ROW_SEP,
  TEXT,
  MUTED,
  LIGHT,
  ZP_GREEN,
  ZP_CYAN,
  ZP_PURPLE,
  ZP_BLUE,
  fmtUSD,
  fmtDate,
} from "@/components/agents/theme";
import zp from "@/lib/design-system/zenipay-brand";

interface AgentRow {
  id: string;
  name: string;
  status: string;
  wallet: { id: string; balance_cents: number; currency: string } | null;
}
interface TxRow {
  id: string;
  agent_id: string;
  amount_cents: number;
  merchant_id: string | null;
  status: string;
  created_at: string;
}

interface CardRow { id: string; status: string }

// Example roster — same shape + numbers as the marketing AI-Wallet page
// so the dashboard's empty state feels aligned with the pitch.
interface DemoAgent {
  name: string;
  role: string;
  accent: string;
  balance: number;
  limit: number;
  spent: number;
  last4: string;
  txCount: number;
  lastActivity: string;
  status: "active" | "idle";
}
const DEMO_ROSTER: DemoAgent[] = [
  { name: "Marco", role: "Lead Hunter",     accent: "#15B8C9", balance: 1240.00, limit: 2000, spent: 760,   last4: "7712", txCount: 42, lastActivity: "2m ago",  status: "active" },
  { name: "Sofia", role: "Email Marketing", accent: "#FF6B9D", balance: 380.50,  limit: 1500, spent: 1119.5, last4: "2081", txCount: 18, lastActivity: "14m ago", status: "active" },
  { name: "Ben",   role: "Finance Agent",   accent: "#7B4FBF", balance: 4200.00, limit: 10000, spent: 5800, last4: "4821", txCount: 87, lastActivity: "just now", status: "active" },
  { name: "Atlas", role: "Security Agent",  accent: "#10B981", balance: 890.00,  limit: 1200, spent: 310,   last4: "9933", txCount: 11, lastActivity: "1h ago",  status: "active" },
];

export default function AgentsDashboard() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [txs, setTxs] = useState<TxRow[]>([]);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [a, t, c] = await Promise.all([
          apiFetch<{ agents: AgentRow[] }>("/api/v1/agents/agents").catch(() => ({ agents: [] })),
          apiFetch<{ transactions: TxRow[] }>("/api/v1/agents/transactions?limit=10").catch(() => ({ transactions: [] })),
          apiFetch<{ cards: CardRow[] }>("/api/v1/agents/cards").catch(() => ({ cards: [] })),
        ]);
        setAgents(a.agents ?? []);
        setTxs(t.transactions ?? []);
        setCards(c.cards ?? []);
      } catch {
        /* handled in render */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const showDemo = !loading && agents.length === 0;
  // Stats: when the org is empty, mirror the demo numbers so the top row
  // isn't zero-zero-zero during the walkthrough.
  const totalBalance = showDemo
    ? Math.round(DEMO_ROSTER.reduce((s, a) => s + a.balance * 100, 0))
    : agents.reduce((s, a) => s + (a.wallet?.balance_cents ?? 0), 0);
  const activeAgents = showDemo
    ? DEMO_ROSTER.filter((a) => a.status === "active").length
    : agents.filter((a) => a.status === "active").length;
  const monthSpend = showDemo
    ? Math.round(DEMO_ROSTER.reduce((s, a) => s + a.spent * 100, 0))
    : txs.filter((t) => t.status === "authorized" || t.status === "captured").reduce((s, t) => s + t.amount_cents, 0);
  const activeCards = showDemo
    ? DEMO_ROSTER.length
    : cards.filter((c) => c.status === "active").length;
  const totalAgentsCount = showDemo ? DEMO_ROSTER.length : agents.length;
  const cardsCount = showDemo ? DEMO_ROSTER.length : cards.length;
  const txLabel = showDemo ? "example spend" : "last 10 tx";

  return (
    <Shell title="Overview">
      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", marginBottom: 20 }}>
        <Metric label="Active agents" value={String(activeAgents)} sub={`${totalAgentsCount} total`} color={ZP_GREEN} />
        <Metric label="Total balance" value={fmtUSD(totalBalance)} sub="across all wallets" color={ZP_CYAN} />
        <Metric label="Active cards" value={String(activeCards)} sub={`${cardsCount} issued`} color={ZP_PURPLE} />
        <Metric label="Recent spend" value={fmtUSD(monthSpend)} sub={txLabel} color={ZP_BLUE} />
      </div>

      {showDemo ? (
        <DemoFleet />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16 }}>
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>Agents</h2>
              <Link href="/agents/agents" style={{ fontSize: 12, color: ZP_GREEN, fontWeight: 700, textDecoration: "none" }}>
                Manage →
              </Link>
            </div>
            {loading ? (
              <p style={{ color: MUTED, fontSize: 13 }}>Loading…</p>
            ) : (
              <div>
                {agents.slice(0, 5).map((a) => (
                  <div
                    key={a.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 0",
                      borderBottom: `1px solid ${ROW_SEP}`,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{a.name}</div>
                      <div style={{ fontSize: 11, color: LIGHT, fontFamily: "ui-monospace" }}>{a.id}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: TEXT }}>
                        {a.wallet ? fmtUSD(a.wallet.balance_cents) : "—"}
                      </div>
                      <StatusPill status={a.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>Recent transactions</h2>
              <Link href="/agents/transactions" style={{ fontSize: 12, color: ZP_GREEN, fontWeight: 700, textDecoration: "none" }}>
                View all →
              </Link>
            </div>
            {loading ? (
              <p style={{ color: MUTED, fontSize: 13 }}>Loading…</p>
            ) : txs.length === 0 ? (
              <p style={{ color: MUTED, fontSize: 13 }}>
                No transactions yet. Run{" "}
                <code style={{ background: "#f8fafc", padding: "2px 6px", borderRadius: 4, border: `1px solid ${BORDER}` }}>
                  POST /api/v1/agents/payments/authorize
                </code>{" "}
                to see them here.
              </p>
            ) : (
              <div>
                {txs.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 0",
                      borderBottom: `1px solid ${ROW_SEP}`,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 12, color: TEXT, fontWeight: 700 }}>
                        {t.merchant_id ?? "(no merchant)"}
                      </div>
                      <div style={{ fontSize: 10, color: LIGHT }}>{fmtDate(t.created_at)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: TEXT }}>{fmtUSD(t.amount_cents)}</div>
                      <StatusPill status={t.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </Shell>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Demo fleet — shown only when the authenticated org has zero real agents.
// Mirrors the /agents/overview marketing layout so the dashboard feels
// "full" during an investor demo on a fresh org.

function DemoFleet() {
  return (
    <section>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-end",
        marginBottom: 16, flexWrap: "wrap", gap: 12,
      }}>
        <div>
          <div style={{
            fontSize: 11, fontWeight: 700, color: zp.brand.violet,
            letterSpacing: "0.14em", textTransform: "uppercase",
            marginBottom: 4,
          }}>
            Example fleet · Preview
          </div>
          <h2 style={{
            margin: 0, fontFamily: zp.font.display, fontSize: 22,
            fontWeight: 700, letterSpacing: "-0.02em", color: TEXT,
          }}>
            This is what your fleet could look like.
          </h2>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: MUTED, maxWidth: 560 }}>
            These four agents are just a preview. Create your own — each gets
            its own wallet, card, and audit trail.
          </p>
        </div>
        <Link href="/agents/agents" style={{
          background: "linear-gradient(135deg,#2DBE60,#15B8C9,#7B4FBF)",
          color: "#fff", padding: "10px 18px", borderRadius: 10,
          textDecoration: "none", fontWeight: 700, fontSize: 13,
          boxShadow: "0 6px 16px rgba(21,184,201,0.32)",
        }}>
          + Create your first agent
        </Link>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: 18,
      }}>
        {DEMO_ROSTER.map((a) => <DemoAgentCard key={a.name} a={a} />)}
      </div>
    </section>
  );
}

function DemoAgentCard({ a }: { a: DemoAgent }) {
  const pct = Math.min(100, Math.round((a.spent / a.limit) * 100));
  const overLimit = a.spent > a.limit;
  const fmt = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return (
    <article
      className="zp-demo-agent"
      style={{
        position: "relative",
        background: "#fff",
        borderRadius: 24,
        overflow: "hidden",
        border: `1px solid ${BORDER}`,
        boxShadow: "0 1px 2px rgba(15,23,42,0.06)",
        display: "flex", flexDirection: "column",
        transition: "all 200ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* Avatar block */}
      <div style={{
        position: "relative",
        aspectRatio: "1 / 1",
        background: `linear-gradient(135deg, ${a.accent}14 0%, ${a.accent}06 100%)`,
        overflow: "hidden",
      }}>
        <Image
          src={`/agents/${a.name.toLowerCase()}.png`}
          alt={`${a.name} — ${a.role}`}
          fill
          sizes="(max-width: 768px) 100vw, 25vw"
          style={{ objectFit: "cover", objectPosition: "top" }}
        />
        <span aria-hidden style={{
          position: "absolute", left: 0, right: 0, bottom: 0, height: 128,
          background: "linear-gradient(0deg, #fff 0%, rgba(255,255,255,0.82) 40%, transparent 100%)",
          pointerEvents: "none",
        }} />
        <div style={{ position: "absolute", top: 14, right: 14 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 10, fontWeight: 800,
            padding: "5px 10px", borderRadius: 999,
            background: "rgba(255,255,255,0.92)",
            color: a.status === "active" ? "#16A34A" : "#64748B",
            border: "1px solid rgba(15,23,42,0.08)",
            letterSpacing: "0.1em", textTransform: "uppercase",
            backdropFilter: "blur(4px)",
          }}>
            <span className={a.status === "active" ? "zp-pulse-green" : undefined} style={{
              width: 6, height: 6, borderRadius: "50%",
              background: a.status === "active" ? "#16A34A" : "#CBD5E1",
            }} />
            {a.status === "active" ? "Live" : "Idle"}
          </span>
        </div>
        <div style={{
          position: "absolute", top: 14, left: 14,
          fontSize: 10, fontWeight: 800,
          padding: "5px 10px", borderRadius: 999,
          background: "rgba(10,11,31,0.85)", color: "#fff",
          fontFamily: "ui-monospace", letterSpacing: "0.1em",
        }}>
          •• {a.last4}
        </div>
      </div>

      <div style={{ padding: "0 20px 20px", marginTop: -32, position: "relative", zIndex: 1 }}>
        <div style={{ marginBottom: 12 }}>
          <h3 style={{
            margin: 0, fontFamily: zp.font.display,
            fontSize: 24, fontWeight: 700, letterSpacing: "-0.025em", color: TEXT,
          }}>
            {a.name}
          </h3>
          <div style={{ fontSize: 11, fontWeight: 800, color: a.accent, letterSpacing: "0.04em", marginTop: 4 }}>
            {a.role}
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 2 }}>
            Wallet balance
          </div>
          <div style={{
            fontFamily: "ui-monospace",
            fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em",
            color: a.accent, lineHeight: 1.05,
          }}>
            {fmt(a.balance)}
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          <DemoChip accent={a.accent} label={`${a.txCount} tx`} />
          <DemoChip accent={a.accent} label={`${pct}% of ${fmt(a.limit)}`} emphasize={overLimit} />
          <DemoChip accent={a.accent} label={a.lastActivity} ghost />
        </div>

        <div style={{ height: 4, background: "#F1F5F9", borderRadius: 3, overflow: "hidden", marginBottom: 14 }}>
          <div style={{
            width: `${pct}%`, height: "100%",
            background: overLimit ? "#FF5A6C" : a.accent,
          }} />
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <div style={{
            flex: 1,
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "10px 12px", borderRadius: 12,
            background: `${a.accent}12`, color: a.accent,
            border: `1px solid ${a.accent}26`,
            fontSize: 13, fontWeight: 800,
          }}>
            Example agent
          </div>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            padding: "10px 14px", borderRadius: 12,
            background: a.accent, color: "#fff",
            fontSize: 13, fontWeight: 800, letterSpacing: "0.02em",
            boxShadow: `0 6px 16px ${a.accent}4D`,
          }}>
            💳 Visa
          </div>
        </div>
      </div>

      <style>{`
        .zp-demo-agent:hover {
          transform: translateY(-3px);
          box-shadow: 0 22px 50px rgba(15,23,42,0.14), 0 0 0 1px ${a.accent}40;
        }
      `}</style>
    </article>
  );
}

function DemoChip({ label, accent, ghost, emphasize }: { label: string; accent: string; ghost?: boolean; emphasize?: boolean }) {
  if (ghost) {
    return (
      <span style={{
        fontSize: 10, fontWeight: 600,
        padding: "3px 9px", borderRadius: 10,
        background: "#F1F5F9", color: MUTED,
        border: `1px solid ${BORDER}`,
      }}>
        {label}
      </span>
    );
  }
  return (
    <span style={{
      fontSize: 10, fontWeight: 800,
      padding: "3px 9px", borderRadius: 10,
      background: emphasize ? "rgba(255,90,108,0.12)" : `${accent}12`,
      color: emphasize ? "#FF5A6C" : accent,
      border: `1px solid ${emphasize ? "#FF5A6C33" : `${accent}33`}`,
      fontFamily: "ui-monospace", letterSpacing: "0.02em",
    }}>
      {label}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string }> = {
    active: { bg: "rgba(45,190,96,0.12)", fg: "#16A34A" },
    paused: { bg: "rgba(148,163,184,0.15)", fg: "#475569" },
    revoked: { bg: "rgba(220,38,38,0.1)", fg: "#DC2626" },
    authorized: { bg: "rgba(21,184,201,0.12)", fg: "#0891B2" },
    captured: { bg: "rgba(45,190,96,0.12)", fg: "#16A34A" },
    denied: { bg: "rgba(220,38,38,0.1)", fg: "#DC2626" },
    failed: { bg: "rgba(220,38,38,0.1)", fg: "#DC2626" },
    reversed: { bg: "rgba(123,79,191,0.1)", fg: "#7B4FBF" },
  };
  const c = map[status] ?? { bg: "#f1f5f9", fg: "#64748b" };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 800,
        background: c.bg,
        color: c.fg,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
      }}
    >
      {status}
    </span>
  );
}
