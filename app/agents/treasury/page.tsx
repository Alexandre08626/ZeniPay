// /agents/treasury — PR 8 new landing.
//
// Four tiles over zc_get_accounts + zc_list_funding_events:
//   1. Treasury balance (sum of owner_type='org_treasury' accounts)
//   2. Total funded this month (sum of credited funding_events this month)
//   3. Pending funding events (state in received|validated)
//   4. Funding sources count
//
// Three quick-action tiles: Add funds, Manage sources, History.
// Teal accent (#15B8C9) to differentiate from the other agents pages.

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/agents/Shell";
import { ZeniPayAccountCard } from "@/app/components/shared/ZeniPayAccountCard";
import { apiFetch } from "../_lib/session";

const TEAL = "#15B8C9";
const BORDER = "#e2e8f0";
const TEXT = "#0f172a";
const MUTED = "#64748b";

interface FundingEvent {
  id: string;
  rail: string;
  funding_source_id: string | null;
  external_event_id: string;
  amount_micro: string;
  currency: string;
  state: "received" | "validated" | "credited" | "rejected" | "duplicate" | "failed";
  tx_group: string | null;
  reason: string | null;
  created_at: string;
}

interface AgentBalance {
  id: string;
  name: string;
  agent_type: string;
  wallet_balance_cents: number;
  currency: string;
  zp_account_number?: string | null;
  zp_routing_code?: string | null;
}

interface TreasuryRow {
  organization_id: string;
  zp_account_number: string | null;
  zp_routing_code: string | null;
  zp_swift_style: string | null;
}

interface FundingSource {
  id: string;
  rail: string;
  currency: string;
  label: string;
  status: string;
  finix_last4: string | null;
}

interface AccountRow {
  id: string;
  owner_type: string;
  currency: string;
  balance_micro: string | number;
}

const MICRO = BigInt(1_000_000);
function microToUnits(m: string | number): number {
  const s = String(m);
  const neg = s.startsWith("-");
  const abs = neg ? s.slice(1) : s;
  try {
    const bi = BigInt(abs);
    const units = Number(bi / MICRO) + Number(bi % MICRO) / 1_000_000;
    return neg ? -units : units;
  } catch {
    return 0;
  }
}

function fmtMoney(n: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}

function startOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

interface JournalEntry {
  id: string;
  direction: "debit" | "credit";
  amount_micro: string;
  currency: string;
  posted_by: string;
  posted_at: string;
}

export default function TreasuryLandingPage() {
  const [sources, setSources] = useState<FundingSource[]>([]);
  const [events, setEvents] = useState<FundingEvent[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [agentBalances, setAgentBalances] = useState<AgentBalance[]>([]);
  const [treasuryRow, setTreasuryRow] = useState<TreasuryRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const loadAll = React.useCallback(async (signal?: AbortSignal) => {
    try {
      const [src, evt, ledger, agentList, treasury] = await Promise.all([
        apiFetch<{ funding_sources: FundingSource[] }>("/api/v1/agents/treasury/fund-sources"),
        apiFetch<{ funding_events: FundingEvent[] }>("/api/v1/agents/treasury/events?limit=200"),
        apiFetch<{
          snapshot: Array<{ currency: string; treasury_micro: string }>;
          entries?: Array<{ id: string; direction: "debit" | "credit"; amount_micro: string; currency: string; posted_by: string; posted_at: string }>;
        }>("/api/v1/agents/ledger"),
        apiFetch<{ agents: AgentBalance[] }>("/api/v1/agents/agents-with-balances"),
        apiFetch<{ treasury: TreasuryRow }>("/api/v1/agents/treasury").catch(() => ({ treasury: null as TreasuryRow | null })),
      ]);
      if (signal?.aborted) return;
      setSources(src.funding_sources ?? []);
      setEvents(evt.funding_events ?? []);
      setAccounts((ledger.snapshot ?? []).map((s) => ({
        id: `treasury_${s.currency}`,
        owner_type: "org_treasury",
        currency: s.currency,
        balance_micro: s.treasury_micro,
      })));
      setJournalEntries(ledger.entries ?? []);
      setAgentBalances(agentList.agents ?? []);
      setTreasuryRow(treasury?.treasury ?? null);
    } catch (e) {
      if (!signal?.aborted) setErr(e instanceof Error ? e.message : String(e));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    void loadAll(ctrl.signal);
    return () => ctrl.abort();
  }, [loadAll]);

  const treasuryByCurrency = accounts
    .filter((a) => a.owner_type === "org_treasury")
    .reduce<Record<string, number>>((acc, a) => {
      acc[a.currency] = (acc[a.currency] ?? 0) + microToUnits(a.balance_micro);
      return acc;
    }, {});

  const primaryTreasuryCurrency =
    Object.keys(treasuryByCurrency).find((c) => treasuryByCurrency[c] > 0) ??
    Object.keys(treasuryByCurrency)[0] ??
    "CAD";
  const primaryTreasuryAmount = treasuryByCurrency[primaryTreasuryCurrency] ?? 0;

  const monthStart = startOfMonth().getTime();
  const fundedThisMonth = events
    .filter((e) => e.state === "credited" && new Date(e.created_at).getTime() >= monthStart)
    .reduce<Record<string, number>>((acc, e) => {
      acc[e.currency] = (acc[e.currency] ?? 0) + microToUnits(e.amount_micro);
      return acc;
    }, {});
  const fundedDisplayCurrency = Object.keys(fundedThisMonth)[0] ?? primaryTreasuryCurrency;
  const fundedDisplayAmount = fundedThisMonth[fundedDisplayCurrency] ?? 0;

  const pendingEvents = events.filter((e) => e.state === "received" || e.state === "validated").length;
  const sourcesCount = sources.length;

  // PR 10 — "From Merchant" tile. Sums credit-direction journal entries
  // whose posted_by starts with 'merchant:' (the pattern used by
  // distribute-from-merchant when it calls zc_fund_treasury /
  // zc_distribute_to_agent). The zc_fund_treasury leg uses posted_by
  // 'merchant_system'; zc_distribute_to_agent uses 'merchant:<id>'. We
  // count only the funding leg to avoid double-counting the same dollar.
  const fromMerchantThisMonth = journalEntries
    .filter((j) =>
      j.direction === "credit" &&
      j.posted_by === "merchant_system" &&
      new Date(j.posted_at).getTime() >= monthStart,
    )
    .reduce<Record<string, number>>((acc, j) => {
      acc[j.currency] = (acc[j.currency] ?? 0) + microToUnits(j.amount_micro);
      return acc;
    }, {});
  const fromMerchantCurrency = Object.keys(fromMerchantThisMonth)[0] ?? primaryTreasuryCurrency;
  const fromMerchantAmount = fromMerchantThisMonth[fromMerchantCurrency] ?? 0;
  const fromMerchantCount = journalEntries.filter((j) =>
    j.direction === "credit" &&
    j.posted_by === "merchant_system" &&
    new Date(j.posted_at).getTime() >= monthStart,
  ).length;

  return (
    <Shell title="Treasury">
      {/* Hero banner */}
      <div style={{
        background: `linear-gradient(135deg, ${TEAL} 0%, #0EA5B9 100%)`,
        color: "#fff", borderRadius: 16, padding: "22px 24px", marginBottom: 18,
        boxShadow: "0 6px 20px rgba(21,184,201,0.25)",
      }}>
        <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.12em", opacity: 0.85, fontWeight: 700, textTransform: "uppercase" }}>
          Treasury · Money IN
        </p>
        <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900, letterSpacing: "-0.4px" }}>
          Fund once. Distribute to agents. Track every cent.
        </p>
        <p style={{ margin: "6px 0 0", fontSize: 13, opacity: 0.9, maxWidth: 620 }}>
          Multi-rail funding (card today · ACH / wire / USDC rolling out). Every credit lands in a
          tamper-evident ZeniCore tx_group you can inspect on the ledger.
        </p>
      </div>

      {treasuryRow && treasuryRow.zp_account_number && (
        <div style={{ marginBottom: 18 }}>
          <ZeniPayAccountCard
            accountType="treasury"
            accent="violet"
            accountNumber={treasuryRow.zp_account_number}
            routingCode={treasuryRow.zp_routing_code}
            swiftStyle={treasuryRow.zp_swift_style}
            accountName="Org Treasury · ZeniPay Network"
          />
          <div style={{ marginTop: 8, fontSize: 11, color: MUTED }}>
            Use this account number when distributing funds within the ZeniPay Network.
          </div>
        </div>
      )}

      {/* 4 tiles */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
        gap: 12, marginBottom: 18,
      }}>
        <Tile
          label="Treasury balance"
          value={loading ? "…" : fmtMoney(primaryTreasuryAmount, primaryTreasuryCurrency)}
          sub={`${Object.keys(treasuryByCurrency).length || 0} currencies`}
          accent={TEAL}
        />
        <Tile
          label="Funded this month"
          value={loading ? "…" : fmtMoney(fundedDisplayAmount, fundedDisplayCurrency)}
          sub={`${events.filter((e) => e.state === "credited" && new Date(e.created_at).getTime() >= monthStart).length} credited events`}
          accent={TEAL}
        />
        <Tile
          label="Pending events"
          value={loading ? "…" : String(pendingEvents)}
          sub="Awaiting webhook confirmation"
          accent="#F5A623"
        />
        <Tile
          label="Funding sources"
          value={loading ? "…" : String(sourcesCount)}
          sub={`${sources.filter((s) => s.status === "verified").length} verified`}
          accent={TEAL}
        />
        <Tile
          label="From Merchant"
          value={loading ? "…" : fmtMoney(fromMerchantAmount, fromMerchantCurrency)}
          sub={fromMerchantCount > 0 ? `${fromMerchantCount} transfer${fromMerchantCount === 1 ? "" : "s"} this month` : "No merchant transfers yet"}
          accent="#7B4FBF"
        />
      </div>

      {err && (
        <div style={{
          marginBottom: 18, padding: "12px 16px", borderRadius: 12,
          background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.25)",
          color: "#DC2626", fontSize: 13, fontWeight: 600,
        }}>
          Failed to load treasury data: {err}
        </div>
      )}

      {/* Quick actions */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
        gap: 12, marginBottom: 18,
      }}>
        <QuickLink
          href="/agents/treasury/fund"
          title="+ Add funds"
          subtitle="Top up via card (ACH/wire/USDC coming)"
          accent={TEAL}
          primary
        />
        <QuickLink
          href="/agents/treasury/sources"
          title="Manage sources"
          subtitle={`${sourcesCount} source${sourcesCount === 1 ? "" : "s"} registered`}
          accent={TEAL}
        />
        <QuickLink
          href="/agents/treasury/history"
          title="Funding history"
          subtitle={`${events.length} event${events.length === 1 ? "" : "s"} logged`}
          accent={TEAL}
        />
      </div>

      {/* Distribute to agent */}
      <DistributePanel
        agents={agentBalances}
        treasuryAmount={primaryTreasuryAmount}
        treasuryCurrency={primaryTreasuryCurrency}
        onDistributed={() => { void loadAll(); }}
      />

      {/* Return to merchant */}
      <ReturnToMerchantPanel
        treasuryAmount={primaryTreasuryAmount}
        treasuryCurrency={primaryTreasuryCurrency}
        onReturned={() => { void loadAll(); }}
      />

      {/* Agent balances (with Reclaim action per row) */}
      <AgentBalancesTable
        agents={agentBalances}
        loading={loading}
        onReclaimed={() => { void loadAll(); }}
      />

      {/* Recent events */}
      <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{
          padding: "14px 18px", borderBottom: `1px solid ${BORDER}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: TEXT }}>Recent funding events</h3>
          <Link href="/agents/treasury/history" style={{ fontSize: 12, fontWeight: 700, color: TEAL, textDecoration: "none" }}>
            View all →
          </Link>
        </div>
        {events.length === 0 ? (
          <p style={{ padding: "22px 18px", margin: 0, color: MUTED, fontSize: 13 }}>
            No funding events yet. {sourcesCount === 0 ? (
              <Link href="/agents/treasury/sources" style={{ color: TEAL, fontWeight: 700 }}>Register a funding source</Link>
            ) : (
              <Link href="/agents/treasury/fund" style={{ color: TEAL, fontWeight: 700 }}>Add your first funds</Link>
            )}.
          </p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["When", "Rail", "Amount", "State"].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.slice(0, 6).map((e) => (
                <tr key={e.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                  <td style={tdStyle}>{new Date(e.created_at).toLocaleString()}</td>
                  <td style={tdStyle}>{railIcon(e.rail)} {e.rail}</td>
                  <td style={{ ...tdStyle, fontWeight: 800, color: TEXT }}>
                    {fmtMoney(microToUnits(e.amount_micro), e.currency)}
                  </td>
                  <td style={tdStyle}><StatePill state={e.state} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Shell>
  );
}

function Tile({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: string }) {
  return (
    <div style={{
      background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14,
      padding: "16px 18px", borderLeft: `4px solid ${accent}`,
    }}>
      <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </p>
      <p style={{ margin: "6px 0 2px", fontSize: 22, fontWeight: 900, color: TEXT, letterSpacing: "-0.4px" }}>
        {value}
      </p>
      {sub && <p style={{ margin: 0, fontSize: 11, color: MUTED }}>{sub}</p>}
    </div>
  );
}

function QuickLink({ href, title, subtitle, accent, primary }: { href: string; title: string; subtitle: string; accent: string; primary?: boolean }) {
  return (
    <Link href={href} style={{
      display: "block", padding: "16px 18px", borderRadius: 14, textDecoration: "none",
      background: primary ? `linear-gradient(135deg, ${accent}, #0EA5B9)` : "#fff",
      color: primary ? "#fff" : TEXT,
      border: primary ? "none" : `1px solid ${BORDER}`,
      boxShadow: primary ? "0 6px 16px rgba(21,184,201,0.25)" : "0 1px 2px rgba(0,0,0,0.02)",
    }}>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 800, letterSpacing: "-0.2px" }}>
        {title}
      </p>
      <p style={{ margin: "4px 0 0", fontSize: 12, opacity: primary ? 0.85 : 1, color: primary ? undefined : MUTED }}>
        {subtitle}
      </p>
    </Link>
  );
}

function StatePill({ state }: { state: string }) {
  const map: Record<string, { bg: string; fg: string }> = {
    credited: { bg: "rgba(45,190,96,0.12)", fg: "#16A34A" },
    received: { bg: "rgba(245,166,35,0.12)", fg: "#D97706" },
    validated: { bg: "rgba(245,166,35,0.12)", fg: "#D97706" },
    rejected: { bg: "rgba(220,38,38,0.1)", fg: "#DC2626" },
    failed: { bg: "rgba(220,38,38,0.1)", fg: "#DC2626" },
    duplicate: { bg: "#f1f5f9", fg: "#64748b" },
  };
  const c = map[state] ?? { bg: "#f1f5f9", fg: "#64748b" };
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, padding: "2px 10px", borderRadius: 999,
      background: c.bg, color: c.fg, textTransform: "uppercase", letterSpacing: "0.04em",
    }}>
      {state}
    </span>
  );
}

function railIcon(rail: string): string {
  return rail === "card" ? "💳" : rail === "ach" ? "🏦" : rail === "wire" ? "🌐" : rail === "usdc_onchain" ? "🪙" : "•";
}

const thStyle: React.CSSProperties = {
  textAlign: "left", padding: "10px 16px", fontSize: 10, fontWeight: 800,
  color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em",
};
const tdStyle: React.CSSProperties = {
  padding: "12px 16px", fontSize: 13, color: TEXT,
};

function DistributePanel({
  agents, treasuryAmount, treasuryCurrency, onDistributed,
}: {
  agents: AgentBalance[];
  treasuryAmount: number;
  treasuryCurrency: string;
  onDistributed: () => void;
}) {
  const [agentId, setAgentId] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const submit = async () => {
    setErr(null); setOk(null);
    const amt = Number(amount);
    if (!agentId) { setErr("Pick an agent."); return; }
    if (!Number.isFinite(amt) || amt <= 0) { setErr("Enter an amount greater than 0."); return; }
    if (amt > treasuryAmount) { setErr("Insufficient treasury balance."); return; }
    setSending(true);
    try {
      const r = await apiFetch<{
        requires_approval?: boolean;
        executed?: boolean;
        agent_name?: string;
        approver_name?: string | null;
        approver_email?: string | null;
        approval_request_id?: string;
      }>(
        "/api/v1/agents/treasury/request-distribution",
        {
          method: "POST",
          body: JSON.stringify({
            to_agent_id: agentId,
            amount_units: amt,
            currency: treasuryCurrency,
            idempotency_key: `treas2agent-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
            memo,
          }),
        },
      );
      if (r.requires_approval) {
        setOk(`Approval requested · Awaiting ${r.approver_name ?? r.approver_email ?? "approver"}.  View at /agents/approvals →`);
      } else {
        setOk(`${fmtMoney(amt, treasuryCurrency)} sent to ${r.agent_name ?? "agent"} · ZeniCore verified ✓`);
      }
      setAmount(""); setMemo(""); setAgentId("");
      onDistributed();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{
      background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14,
      padding: "18px 20px", marginBottom: 18,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: TEXT }}>Distribute to agent</h3>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: MUTED }}>
            Send from treasury to a specific agent wallet. Treasury stays {fmtMoney(treasuryAmount, treasuryCurrency)} after this.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 2fr", gap: 10 }}>
        <select
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          style={fieldStyle}
          disabled={sending || agents.length === 0}
        >
          <option value="">{agents.length === 0 ? "No agents in your org" : "Select an agent…"}</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} · bal {fmtMoney(a.wallet_balance_cents / 100, a.currency)}
            </option>
          ))}
        </select>
        <input
          type="number" step="0.01" min="0" placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={fieldStyle}
          disabled={sending}
        />
        <input
          type="text" placeholder="Memo (optional)"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          style={fieldStyle}
          disabled={sending}
        />
      </div>

      {err && (
        <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: "rgba(220,38,38,0.08)", color: "#DC2626", fontSize: 12, fontWeight: 700 }}>
          {err}
        </div>
      )}
      {ok && (
        <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: "rgba(45,190,96,0.1)", color: "#16A34A", fontSize: 12, fontWeight: 700 }}>
          {ok}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
        <button
          onClick={submit}
          disabled={sending || !agentId || !amount}
          style={{
            background: sending || !agentId || !amount
              ? "#94a3b8"
              : "linear-gradient(135deg,#2DBE60,#15B8C9,#7B4FBF)",
            color: "#fff", border: "none", padding: "10px 22px", borderRadius: 10,
            fontSize: 13, fontWeight: 800, cursor: sending ? "not-allowed" : "pointer",
            boxShadow: sending ? "none" : "0 6px 16px rgba(21,184,201,0.32)",
          }}
        >
          {sending ? "Distributing…" : `Distribute ${amount ? fmtMoney(Number(amount) || 0, treasuryCurrency) : ""}`}
        </button>
      </div>
    </div>
  );
}

function AgentBalancesTable({
  agents, loading, onReclaimed,
}: {
  agents: AgentBalance[];
  loading: boolean;
  onReclaimed: () => void;
}) {
  const [reclaimingId, setReclaimingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const reclaim = async (a: AgentBalance) => {
    setErr(null); setOk(null);
    const units = a.wallet_balance_cents / 100;
    if (units <= 0) return;
    const input = window.prompt(
      `Reclaim from ${a.name}?\nAvailable: ${fmtMoney(units, a.currency)}\nEnter amount (or leave blank for the full balance).`,
      units.toString(),
    );
    if (input == null) return;
    const amt = input.trim() === "" ? units : Number(input);
    if (!Number.isFinite(amt) || amt <= 0 || amt > units) {
      setErr("Invalid amount."); return;
    }
    setReclaimingId(a.id);
    try {
      const r = await apiFetch<{ success: boolean; agent_name?: string }>(
        "/api/v1/agents/treasury/reclaim-from-agent",
        {
          method: "POST",
          body: JSON.stringify({
            from_agent_id: a.id,
            amount_units: amt,
            currency: a.currency,
            idempotency_key: `reclaim-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          }),
        },
      );
      setOk(`${fmtMoney(amt, a.currency)} reclaimed from ${r.agent_name ?? a.name} ✓`);
      onReclaimed();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setReclaimingId(null);
    }
  };

  return (
    <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden", marginBottom: 18 }}>
      <div style={{ padding: "14px 18px", borderBottom: `1px solid ${BORDER}` }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: TEXT }}>Agent balances</h3>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: MUTED }}>
          Live ZeniCore balance for every active agent in your org. Reclaim any amount back into treasury — free, internal.
        </p>
      </div>
      {(err || ok) && (
        <div style={{
          padding: "10px 18px", fontSize: 12, fontWeight: 700,
          background: err ? "rgba(220,38,38,0.06)" : "rgba(45,190,96,0.08)",
          color: err ? "#DC2626" : "#16A34A",
          borderBottom: `1px solid ${BORDER}`,
        }}>{err ?? ok}</div>
      )}
      {loading && agents.length === 0 ? (
        <p style={{ padding: "22px 18px", margin: 0, color: MUTED, fontSize: 13 }}>Loading…</p>
      ) : agents.length === 0 ? (
        <p style={{ padding: "22px 18px", margin: 0, color: MUTED, fontSize: 13 }}>No agents yet.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["Agent", "Role", "Balance", ""].map((h, i) => <th key={i} style={thStyle}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {agents.map((a) => {
              const hasBal = a.wallet_balance_cents > 0;
              const pending = reclaimingId === a.id;
              return (
                <tr key={a.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{a.name}</td>
                  <td style={{ ...tdStyle, color: MUTED, textTransform: "capitalize" }}>{a.agent_type}</td>
                  <td style={{ ...tdStyle, fontFamily: "ui-monospace", fontWeight: 800 }}>
                    {fmtMoney(a.wallet_balance_cents / 100, a.currency)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    <button
                      onClick={() => reclaim(a)}
                      disabled={!hasBal || pending}
                      style={{
                        background: !hasBal ? "#e2e8f0" : pending ? "#94a3b8" : "#fff",
                        color: !hasBal ? "#94a3b8" : pending ? "#fff" : TEAL,
                        border: `1.5px solid ${!hasBal ? "#e2e8f0" : TEAL}`,
                        padding: "6px 12px", borderRadius: 8,
                        fontSize: 11, fontWeight: 800, cursor: hasBal && !pending ? "pointer" : "not-allowed",
                      }}
                    >
                      {pending ? "Reclaiming…" : "Reclaim"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

interface MerchantAccount {
  id: string;
  account_name: string;
  balance: number;
  currency: string;
  is_primary: boolean;
}

function ReturnToMerchantPanel({
  treasuryAmount, treasuryCurrency, onReturned,
}: {
  treasuryAmount: number;
  treasuryCurrency: string;
  onReturned: () => void;
}) {
  const [accounts, setAccounts] = useState<MerchantAccount[]>([]);
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await apiFetch<{ accounts: MerchantAccount[] }>("/api/v1/agents/merchant-accounts");
        setAccounts(r.accounts ?? []);
        const primary = (r.accounts ?? []).find((a) => a.is_primary) ?? (r.accounts ?? [])[0];
        if (primary) setAccountId(primary.id);
      } catch {
        /* empty list stays */
      }
    })();
  }, []);

  const submit = async () => {
    setErr(null); setOk(null);
    const amt = Number(amount);
    if (!accountId) { setErr("Pick a destination account."); return; }
    if (!Number.isFinite(amt) || amt <= 0) { setErr("Enter an amount greater than 0."); return; }
    if (amt > treasuryAmount) { setErr("Insufficient treasury balance."); return; }
    setSending(true);
    try {
      await apiFetch("/api/v1/agents/treasury/return-to-merchant", {
        method: "POST",
        body: JSON.stringify({
          to_account_id: accountId,
          amount_units: amt,
          currency: treasuryCurrency,
          idempotency_key: `return2merch-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          memo,
        }),
      });
      setOk(`${fmtMoney(amt, treasuryCurrency)} returned to your merchant account ✓`);
      setAmount(""); setMemo("");
      onReturned();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{
      background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14,
      padding: "18px 20px", marginBottom: 18,
    }}>
      <div style={{ marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: TEXT }}>Return to merchant</h3>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: MUTED }}>
          Move treasury back into a ZeniPay account. Internal transfer — no fees.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 2fr", gap: 10 }}>
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          style={fieldStyle}
          disabled={sending || accounts.length === 0}
        >
          <option value="">{accounts.length === 0 ? "No merchant accounts linked" : "Select an account…"}</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.account_name}{a.is_primary ? " · primary" : ""} · {fmtMoney(a.balance, a.currency)}
            </option>
          ))}
        </select>
        <input
          type="number" step="0.01" min="0" placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={fieldStyle}
          disabled={sending}
        />
        <input
          type="text" placeholder="Memo (optional)"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          style={fieldStyle}
          disabled={sending}
        />
      </div>

      {err && (
        <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: "rgba(220,38,38,0.08)", color: "#DC2626", fontSize: 12, fontWeight: 700 }}>
          {err}
        </div>
      )}
      {ok && (
        <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: "rgba(45,190,96,0.1)", color: "#16A34A", fontSize: 12, fontWeight: 700 }}>
          {ok}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
        <button
          onClick={submit}
          disabled={sending || !accountId || !amount}
          style={{
            background: sending || !accountId || !amount
              ? "#94a3b8"
              : "linear-gradient(135deg,#2DBE60,#15B8C9,#7B4FBF)",
            color: "#fff", border: "none", padding: "10px 22px", borderRadius: 10,
            fontSize: 13, fontWeight: 800, cursor: sending ? "not-allowed" : "pointer",
            boxShadow: sending ? "none" : "0 6px 16px rgba(21,184,201,0.32)",
          }}
        >
          {sending ? "Returning…" : `Return ${amount ? fmtMoney(Number(amount) || 0, treasuryCurrency) : ""}`}
        </button>
      </div>
    </div>
  );
}

const fieldStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 10,
  border: `1.5px solid ${BORDER}`, fontSize: 13, outline: "none",
  boxSizing: "border-box", background: "#f8fafc", color: TEXT,
  fontFamily: "inherit",
};
