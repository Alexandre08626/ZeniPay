// /agents/treasury/history — PR 8 funding event log.
//
// Shows every zenicore.funding_events row (via zc_list_funding_events).
// Filter by state. Click a credited event → /agents/ledger?tx=<tx_group>.

"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/agents/Shell";
import { apiFetch } from "../../_lib/session";

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
  credited_at: string | null;
}

type Filter = "all" | "credited" | "pending" | "rejected" | "failed";

const MICRO = BigInt(1_000_000);
function microToDisplay(m: string, currency: string): string {
  const neg = m.startsWith("-");
  const abs = neg ? m.slice(1) : m;
  try {
    const bi = BigInt(abs);
    const whole = bi / MICRO;
    const frac = (bi % MICRO).toString().padStart(6, "0").slice(0, 2);
    return `${neg ? "−" : ""}${whole.toLocaleString()}.${frac} ${currency}`;
  } catch {
    return `${m} ${currency}`;
  }
}

export default function TreasuryHistoryPage() {
  const [events, setEvents] = useState<FundingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await apiFetch<{ funding_events: FundingEvent[] }>("/api/v1/agents/treasury/events?limit=500");
        if (!cancelled) setEvents(r.funding_events ?? []);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return events;
    if (filter === "pending") return events.filter((e) => e.state === "received" || e.state === "validated");
    return events.filter((e) => e.state === filter);
  }, [filter, events]);

  const counts = useMemo(() => {
    const c = { all: events.length, credited: 0, pending: 0, rejected: 0, failed: 0 };
    for (const e of events) {
      if (e.state === "credited") c.credited += 1;
      else if (e.state === "received" || e.state === "validated") c.pending += 1;
      else if (e.state === "rejected") c.rejected += 1;
      else if (e.state === "failed") c.failed += 1;
    }
    return c;
  }, [events]);

  return (
    <Shell title="Funding history">
      <p style={{ margin: "0 0 18px", color: MUTED, fontSize: 13, maxWidth: 640 }}>
        Every Money IN event lands here. Click a credited row to jump to the matching{" "}
        <Link href="/agents/ledger" style={{ color: TEAL, fontWeight: 700 }}>ledger tx_group</Link>.
      </p>

      {err && (
        <div style={{
          marginBottom: 18, padding: "12px 16px", borderRadius: 12,
          background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.25)",
          color: "#DC2626", fontSize: 13, fontWeight: 600,
        }}>
          {err}
        </div>
      )}

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {(["all", "credited", "pending", "rejected", "failed"] as Filter[]).map((f) => {
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "8px 16px", borderRadius: 999, border: "none", cursor: "pointer",
                fontWeight: 800, fontSize: 12, letterSpacing: "0.02em",
                background: active ? `linear-gradient(135deg, ${TEAL}, #0EA5B9)` : "#f1f5f9",
                color: active ? "#fff" : MUTED,
              }}
            >
              {f.toUpperCase()} · {counts[f as keyof typeof counts] ?? 0}
            </button>
          );
        })}
      </div>

      <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden" }}>
        {loading ? (
          <p style={{ padding: "22px 18px", margin: 0, color: MUTED, fontSize: 13 }}>Loading…</p>
        ) : filtered.length === 0 ? (
          <p style={{ padding: "22px 18px", margin: 0, color: MUTED, fontSize: 13 }}>
            No events match this filter.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["When", "Rail", "Amount", "State", "tx_group", "Reason"].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                    <td style={tdStyle}>
                      <div style={{ color: TEXT }}>{new Date(e.created_at).toLocaleString()}</div>
                      {e.credited_at && (
                        <div style={{ fontSize: 11, color: MUTED }}>
                          credited {new Date(e.credited_at).toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td style={tdStyle}>{railLabel(e.rail)}</td>
                    <td style={{ ...tdStyle, fontWeight: 800 }}>
                      {microToDisplay(e.amount_micro, e.currency)}
                    </td>
                    <td style={tdStyle}><StatePill state={e.state} /></td>
                    <td style={{ ...tdStyle, fontFamily: "ui-monospace", fontSize: 11, color: MUTED }}>
                      {e.tx_group ? (
                        <Link href={`/agents/ledger?tx=${e.tx_group}`} style={{ color: TEAL, textDecoration: "none", fontWeight: 700 }}>
                          {e.tx_group.slice(0, 14)}…
                        </Link>
                      ) : "—"}
                    </td>
                    <td style={{ ...tdStyle, color: MUTED, fontSize: 12 }}>{e.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Shell>
  );
}

function railLabel(r: string): string {
  return r === "card" ? "💳 Card" : r === "ach" ? "🏦 ACH" : r === "wire" ? "🌐 Wire" : r === "usdc_onchain" ? "🪙 USDC" : r;
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

const thStyle: React.CSSProperties = {
  textAlign: "left", padding: "10px 16px", fontSize: 10, fontWeight: 800,
  color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em",
};
const tdStyle: React.CSSProperties = {
  padding: "12px 16px", fontSize: 13, color: TEXT,
};
