// /agents/dashboard — overview. Loads agents + recent transactions.

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
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

export default function AgentsDashboard() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [txs, setTxs] = useState<TxRow[]>([]);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [a, t, c] = await Promise.all([
          apiFetch<{ agents: AgentRow[] }>("/api/v1/agents/agents"),
          apiFetch<{ transactions: TxRow[] }>("/api/v1/agents/transactions?limit=10"),
          apiFetch<{ cards: CardRow[] }>("/api/v1/agents/cards").catch(() => ({ cards: [] })),
        ]);
        setAgents(a.agents);
        setTxs(t.transactions);
        setCards(c.cards);
      } catch {
        /* handled in render */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalBalance = agents.reduce((s, a) => s + (a.wallet?.balance_cents ?? 0), 0);
  const activeAgents = agents.filter((a) => a.status === "active").length;
  const monthSpend = txs
    .filter((t) => t.status === "authorized" || t.status === "captured")
    .reduce((s, t) => s + t.amount_cents, 0);
  const activeCards = cards.filter((c) => c.status === "active").length;

  return (
    <Shell title="Overview">
      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", marginBottom: 20 }}>
        <Metric label="Active agents" value={String(activeAgents)} sub={`${agents.length} total`} color={ZP_GREEN} />
        <Metric label="Total balance" value={fmtUSD(totalBalance)} sub="across all wallets" color={ZP_CYAN} />
        <Metric label="Active cards" value={String(activeCards)} sub={`${cards.length} issued`} color={ZP_PURPLE} />
        <Metric label="Recent spend" value={fmtUSD(monthSpend)} sub="last 10 tx" color={ZP_BLUE} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16 }}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>Agents</h2>
            <Link
              href="/agents/agents"
              style={{ fontSize: 12, color: ZP_GREEN, fontWeight: 700, textDecoration: "none" }}
            >
              Manage →
            </Link>
          </div>
          {loading ? (
            <p style={{ color: MUTED, fontSize: 13 }}>Loading…</p>
          ) : agents.length === 0 ? (
            <EmptyState
              title="No agents yet"
              ctaHref="/agents/agents"
              ctaLabel="Create your first agent →"
            />
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
            <Link
              href="/agents/transactions"
              style={{ fontSize: 12, color: ZP_GREEN, fontWeight: 700, textDecoration: "none" }}
            >
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
    </Shell>
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

function EmptyState({ title, ctaHref, ctaLabel }: { title: string; ctaHref: string; ctaLabel: string }) {
  return (
    <div style={{ padding: "28px 0", textAlign: "center" }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>🤖</div>
      <p style={{ margin: "0 0 12px", fontSize: 14, color: TEXT, fontWeight: 700 }}>{title}</p>
      <Link
        href={ctaHref}
        style={{
          background: "linear-gradient(135deg,#2DBE60,#15B8C9,#7B4FBF)",
          color: "#fff",
          padding: "9px 18px",
          borderRadius: 10,
          textDecoration: "none",
          fontWeight: 700,
          fontSize: 12,
          display: "inline-block",
        }}
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
