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
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [src, evt, ledger] = await Promise.all([
          apiFetch<{ funding_sources: FundingSource[] }>("/api/v1/agents/treasury/fund-sources"),
          apiFetch<{ funding_events: FundingEvent[] }>("/api/v1/agents/treasury/events?limit=200"),
          apiFetch<{
            snapshot: Array<{ currency: string; treasury_micro: string }>;
            entries?: Array<{ id: string; direction: "debit" | "credit"; amount_micro: string; currency: string; posted_by: string; posted_at: string }>;
          }>("/api/v1/agents/ledger"),
        ]);
        if (cancelled) return;
        setSources(src.funding_sources ?? []);
        setEvents(evt.funding_events ?? []);
        setAccounts((ledger.snapshot ?? []).map((s) => ({
          id: `treasury_${s.currency}`,
          owner_type: "org_treasury",
          currency: s.currency,
          balance_micro: s.treasury_micro,
        })));
        setJournalEntries(ledger.entries ?? []);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

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
