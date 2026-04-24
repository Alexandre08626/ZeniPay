// /agents/dashboard — authenticated agents overview.
//
// Renders the same big AgentCard layout as /agents/overview, backed by
// real API data. When the org has zero agents, the page falls back to
// four example cards (DEMO_ROSTER) so it never looks empty during an
// investor walkthrough.

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/agents/Shell";
import { AgentCard, DEMO_ROSTER, type AgentCardData } from "@/components/agents/AgentCard";
import { apiFetch } from "../_lib/session";
import {
  MUTED,
  TEXT,
  ZP_GREEN,
  ZP_CYAN,
  ZP_PURPLE,
  ZP_BLUE,
  fmtUSD,
} from "@/components/agents/theme";
import zp from "@/lib/design-system/zenipay-brand";

interface AgentRow {
  id: string;
  name: string;
  status: string;
  agent_type?: string;
  wallet_balance_cents?: number;
  currency?: string;
  // Back-compat for the old /api/v1/agents/agents response shape that
  // stubbed the balance under `wallet.balance_cents` — the dashboard
  // now calls /agents-with-balances which returns flat fields, but we
  // keep this key in the interface so stale callers don't crash.
  wallet?: { id: string; balance_cents: number; currency: string } | null;
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
          apiFetch<{ agents: AgentRow[] }>("/api/v1/agents/agents-with-balances").catch(() => ({ agents: [] })),
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

  // Never mock. If the org has zero agents, render an empty state —
  // fake DEMO_ROSTER balances were confusing Alex during live demos
  // and masking real $0 wallets as "$4,200".
  const totalBalance = agents.reduce((s, a) => s + (a.wallet_balance_cents ?? a.wallet?.balance_cents ?? 0), 0);
  const activeAgents = agents.filter((a) => a.status === "active").length;
  const monthSpend = txs
    .filter((t) => t.status === "authorized" || t.status === "captured")
    .reduce((s, t) => s + t.amount_cents, 0);
  const activeCards = cards.filter((c) => c.status === "active").length;
  const totalAgentsCount = agents.length;
  const cardsCount = cards.length;
  const txLabel = "last 10 tx";

  // Real agents → AgentCard data mapping. We derive a synthetic last4
  // from the agent id hash so every card has a banking flourish even
  // before the first real card is issued.
  const realCards: AgentCardData[] = agents.map((a) => ({
    id: a.id,
    name: a.name,
    role: a.agent_type || "AI agent",
    balance: ((a.wallet_balance_cents ?? a.wallet?.balance_cents) ?? 0) / 100,
    currency: a.currency || a.wallet?.currency || "CAD",
    status: (a.status as AgentCardData["status"]) || "active",
    last4: syntheticLast4(a.id),
    primaryLabel: "Open agent",
  }));

  return (
    <Shell title="Overview">
      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", marginBottom: 20 }}>
        <Metric label="Active agents" value={String(activeAgents)} sub={`${totalAgentsCount} total`} color={ZP_GREEN} />
        <Metric label="Total balance" value={fmtUSD(totalBalance)} sub="across all wallets" color={ZP_CYAN} />
        <Metric label="Active cards" value={String(activeCards)} sub={`${cardsCount} issued`} color={ZP_PURPLE} />
        <Metric label="Recent spend" value={fmtUSD(monthSpend)} sub={txLabel} color={ZP_BLUE} />
      </div>

      <RealFleet cards={realCards} loading={loading} />
    </Shell>
  );
}

function RealFleet({ cards, loading }: { cards: AgentCardData[]; loading: boolean }) {
  return (
    <section>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-end",
        marginBottom: 16, flexWrap: "wrap", gap: 12,
      }}>
        <div>
          <div style={{
            fontSize: 11, fontWeight: 700, color: zp.brand.violet,
            letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4,
          }}>
            Your fleet · ZeniCore live
          </div>
          <h2 style={{
            margin: 0, fontFamily: zp.font.display, fontSize: 22,
            fontWeight: 700, letterSpacing: "-0.02em", color: TEXT,
          }}>
            {cards.length} {cards.length === 1 ? "agent" : "agents"} ready to spend.
          </h2>
        </div>
        <Link href="/agents/agents" style={{
          background: "linear-gradient(135deg,#2DBE60,#15B8C9,#7B4FBF)",
          color: "#fff", padding: "10px 18px", borderRadius: 10,
          textDecoration: "none", fontWeight: 700, fontSize: 13,
          boxShadow: "0 6px 16px rgba(21,184,201,0.32)",
        }}>
          + New agent
        </Link>
      </div>

      {loading ? (
        <p style={{ color: MUTED, fontSize: 13 }}>Loading agents…</p>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 18,
        }}>
          {cards.map((c) => <AgentCard key={c.id ?? c.name} data={c} />)}
        </div>
      )}
    </section>
  );
}

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
            letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4,
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
        {DEMO_ROSTER.map((a) => <AgentCard key={a.name} data={a} />)}
      </div>
    </section>
  );
}

function Metric({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #E2E8F0",
      borderRadius: 14,
      padding: "16px 18px",
      borderLeft: `4px solid ${color ?? ZP_GREEN}`,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 800, color: MUTED,
        letterSpacing: "0.08em", textTransform: "uppercase",
      }}>
        {label}
      </div>
      <div style={{
        ...zp.amountStyle.large, fontSize: 22, color: TEXT, marginTop: 6,
      }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// Takes an agent id and hashes it into a deterministic 4-digit suffix
// so the big card can show "•• 1234" even before a real card is issued.
function syntheticLast4(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 10_000).toString().padStart(4, "0");
}
