// /agents/treasury/sources — PR 8 funding source registry.
//
// Lists every zenicore.funding_sources row for the org, grouped by rail.
// "Add new source" opens a modal with 4 rail options: card (enabled today
// via Finix.js), ACH / wire / USDC (disabled — Coming soon).

"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/agents/Shell";
import { apiFetch } from "../../_lib/session";

const TEAL = "#15B8C9";
const BORDER = "#e2e8f0";
const TEXT = "#0f172a";
const MUTED = "#64748b";

interface FundingSource {
  id: string;
  rail: string;
  currency: string;
  label: string;
  status: string;
  is_primary: boolean;
  finix_last4: string | null;
  finix_instrument_type: string | null;
  created_at: string;
}

export default function TreasurySourcesPage() {
  const [sources, setSources] = useState<FundingSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiFetch<{ funding_sources: FundingSource[] }>("/api/v1/agents/treasury/fund-sources");
      setSources(r.funding_sources ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const byRail: Record<string, FundingSource[]> = {};
  for (const s of sources) (byRail[s.rail] ??= []).push(s);

  const rails: Array<{ id: string; label: string; icon: string; enabled: boolean; desc: string }> = [
    { id: "card", label: "Card", icon: "💳", enabled: true, desc: "Finix SALE. Instant or near-instant credit." },
    { id: "ach", label: "ACH", icon: "🏦", enabled: false, desc: "US bank-to-bank. Coming soon." },
    { id: "wire", label: "Wire", icon: "🌐", enabled: false, desc: "Domestic + intl wires. Coming soon." },
    { id: "usdc_onchain", label: "USDC", icon: "🪙", enabled: false, desc: "On-chain deposit address. Coming soon." },
  ];

  return (
    <Shell title="Funding sources">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <p style={{ margin: 0, color: MUTED, fontSize: 13, maxWidth: 560 }}>
          Every source you register here becomes an option for <Link href="/agents/treasury/fund" style={{ color: TEAL, fontWeight: 700 }}>funding the treasury</Link>. Card rail is live — ACH / wire / USDC are rolling out.
        </p>
        <Link
          href="/agents/treasury/fund"
          style={{
            background: `linear-gradient(135deg, ${TEAL}, #0EA5B9)`, color: "#fff",
            borderRadius: 12, padding: "10px 18px", fontWeight: 800, fontSize: 13,
            textDecoration: "none",
          }}
        >
          + Add card via Finix
        </Link>
      </div>

      {err && (
        <div style={{
          marginBottom: 18, padding: "12px 16px", borderRadius: 12,
          background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.25)",
          color: "#DC2626", fontSize: 13, fontWeight: 600,
        }}>
          {err}
        </div>
      )}

      {/* Rail overview grid */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
        gap: 12, marginBottom: 22,
      }}>
        {rails.map((r) => {
          const count = (byRail[r.id] ?? []).length;
          return (
            <div key={r.id} style={{
              background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14,
              padding: "16px 18px", opacity: r.enabled ? 1 : 0.7,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: TEXT }}>
                    {r.icon} {r.label}
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: MUTED }}>{r.desc}</p>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 999,
                  background: r.enabled ? "rgba(45,190,96,0.12)" : "#f1f5f9",
                  color: r.enabled ? "#16A34A" : "#64748b",
                  textTransform: "uppercase", letterSpacing: "0.04em",
                }}>
                  {r.enabled ? "Live" : "Soon"}
                </span>
              </div>
              <p style={{ margin: "12px 0 0", fontSize: 13, color: TEXT, fontWeight: 700 }}>
                {count} source{count === 1 ? "" : "s"}
              </p>
            </div>
          );
        })}
      </div>

      {/* Full list */}
      <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${BORDER}` }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: TEXT }}>All funding sources</h3>
        </div>
        {loading ? (
          <p style={{ padding: "22px 18px", margin: 0, color: MUTED, fontSize: 13 }}>Loading…</p>
        ) : sources.length === 0 ? (
          <div style={{ padding: "36px 18px", textAlign: "center", color: MUTED }}>
            <div style={{ fontSize: 36 }}>🗂️</div>
            <p style={{ margin: "8px 0 4px", fontWeight: 700, color: TEXT, fontSize: 14 }}>No sources yet</p>
            <p style={{ margin: "0 0 14px", fontSize: 12, color: MUTED }}>Register your first card to start funding.</p>
            <Link href="/agents/treasury/fund" style={{
              display: "inline-block", background: `linear-gradient(135deg, ${TEAL}, #0EA5B9)`, color: "#fff",
              borderRadius: 12, padding: "10px 18px", fontWeight: 800, fontSize: 13, textDecoration: "none",
            }}>
              + Add your first card
            </Link>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Label", "Rail", "Currency", "Status", "Added"].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 700, color: TEXT }}>
                      {s.label}{s.is_primary && <span style={{ marginLeft: 6, fontSize: 10, color: TEAL, fontWeight: 800 }}>· PRIMARY</span>}
                    </div>
                    {s.finix_last4 && (
                      <div style={{ fontSize: 11, color: MUTED, fontFamily: "ui-monospace" }}>
                        ••{s.finix_last4}
                      </div>
                    )}
                  </td>
                  <td style={tdStyle}>{railLabel(s.rail)}</td>
                  <td style={tdStyle}>{s.currency}</td>
                  <td style={tdStyle}><StatusPill status={s.status} /></td>
                  <td style={{ ...tdStyle, color: MUTED }}>{new Date(s.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Shell>
  );
}

function railLabel(r: string): string {
  return r === "card" ? "💳 Card" : r === "ach" ? "🏦 ACH" : r === "wire" ? "🌐 Wire" : r === "usdc_onchain" ? "🪙 USDC" : r;
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string }> = {
    verified: { bg: "rgba(45,190,96,0.12)", fg: "#16A34A" },
    pending_verification: { bg: "rgba(245,166,35,0.12)", fg: "#D97706" },
    restricted: { bg: "rgba(220,38,38,0.1)", fg: "#DC2626" },
    disabled: { bg: "#f1f5f9", fg: "#64748b" },
  };
  const c = map[status] ?? { bg: "#f1f5f9", fg: "#64748b" };
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, padding: "2px 10px", borderRadius: 999,
      background: c.bg, color: c.fg, textTransform: "uppercase", letterSpacing: "0.04em",
    }}>
      {status.replace("_", " ")}
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
