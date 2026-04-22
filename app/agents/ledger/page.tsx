// /agents/ledger — live ZeniCore ledger feed.
//
// Three sections:
//   1. Per-currency balance snapshot from zenicore.org_balance_snapshot
//      (treasury + agents-allocated + cards-pending + total).
//   2. Chain-integrity indicator (green = intact, red = broken).
//   3. Recent journal entries table.

"use client";

import React, { useEffect, useState } from "react";
import { Shell, Card, Metric } from "@/components/agents/Shell";
import { apiFetch } from "../_lib/session";
import {
  BORDER, ROW_SEP, TEXT, MUTED, LIGHT,
  ZP_GREEN, ZP_CYAN, ZP_PURPLE,
  fmtDate,
} from "@/components/agents/theme";

interface Snapshot {
  organization_id: string;
  currency: string;
  treasury_micro: string;
  agents_allocated_micro: string;
  cards_pending_micro: string;
  total_micro: string;
}

interface Integrity {
  total_entries: number;
  verified_entries: number;
  first_break_at: string | null;
  first_break_id: string | null;
  is_intact: boolean;
}

interface Entry {
  id: string;
  tx_group: string;
  seq: number;
  posted_at: string;
  account_id: string;
  direction: "debit" | "credit";
  amount_micro: string;
  currency: string;
  memo: string;
  ref_type: string | null;
  ref_id: string | null;
  posted_by: string;
}

interface LedgerResponse {
  snapshot: Snapshot[];
  integrity: Integrity;
  entries: Entry[];
}

const MICRO: bigint = BigInt(1_000_000);
function fromMicroDisplay(m: string, currency: string): string {
  const neg = m.startsWith("-");
  const abs = neg ? m.slice(1) : m;
  const bi = BigInt(abs);
  const whole = bi / MICRO;
  const frac = (bi % MICRO).toString().padStart(6, "0").slice(0, 2);
  return `${neg ? "−" : ""}${whole.toLocaleString("en-US")}.${frac} ${currency}`;
}

export default function LedgerPage() {
  const [data, setData] = useState<LedgerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await apiFetch<LedgerResponse>("/api/v1/agents/ledger");
        if (!cancelled) { setData(r); setErr(null); }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      } finally { if (!cancelled) setLoading(false); }
    };
    void load();
    const id = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return (
    <Shell title="Ledger">
      {loading && !data ? (
        <Card><p style={{ color: MUTED, margin: 0, fontSize: 13 }}>Loading ledger…</p></Card>
      ) : err ? (
        <Card style={{ borderLeft: "4px solid #DC2626" }}>
          <p style={{ color: "#DC2626", margin: 0, fontSize: 13 }}>{err}</p>
        </Card>
      ) : !data ? null : (
        <>
          <IntegrityBanner integrity={data.integrity} />

          {data.snapshot.length === 0 ? (
            <Card>
              <div style={{ padding: "24px 0", textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🏦</div>
                <p style={{ fontSize: 14, fontWeight: 700, color: TEXT, margin: "0 0 4px" }}>
                  No ledger activity yet
                </p>
                <p style={{ fontSize: 12, color: MUTED, margin: 0, maxWidth: 420, marginInline: "auto" }}>
                  Fund a treasury from the Treasury tab — every dollar that moves after that
                  writes to this ledger.
                </p>
              </div>
            </Card>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 20 }}>
              {data.snapshot.map((s) => (
                <Metric
                  key={s.currency}
                  label={`Total · ${s.currency}`}
                  value={fromMicroDisplay(s.total_micro, s.currency)}
                  sub={`Treasury ${fromMicroDisplay(s.treasury_micro, s.currency)} · Agents ${fromMicroDisplay(s.agents_allocated_micro, s.currency)} · Cards ${fromMicroDisplay(s.cards_pending_micro, s.currency)}`}
                  color={s.currency === "USD" ? ZP_GREEN : s.currency === "CAD" ? ZP_CYAN : ZP_PURPLE}
                />
              ))}
            </div>
          )}

          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: TEXT, letterSpacing: "-0.2px" }}>
                Recent journal entries
              </h3>
              <span style={{ fontSize: 11, color: MUTED }}>{data.entries.length} rows</span>
            </div>
            {data.entries.length === 0 ? (
              <p style={{ color: MUTED, fontSize: 12, margin: 0 }}>No entries yet.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ textAlign: "left", color: MUTED, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      <th style={{ padding: "6px 4px" }}>Seq</th>
                      <th style={{ padding: "6px 4px" }}>Posted</th>
                      <th style={{ padding: "6px 4px" }}>Dir</th>
                      <th style={{ padding: "6px 4px", textAlign: "right" }}>Amount</th>
                      <th style={{ padding: "6px 4px" }}>Memo</th>
                      <th style={{ padding: "6px 4px" }}>Account</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.entries.map((e) => (
                      <tr key={e.id} style={{ borderTop: `1px solid ${ROW_SEP}` }}>
                        <td style={{ padding: "8px 4px", fontFamily: "ui-monospace", color: LIGHT }}>#{e.seq}</td>
                        <td style={{ padding: "8px 4px", color: MUTED }}>{fmtDate(e.posted_at)}</td>
                        <td style={{ padding: "8px 4px" }}>
                          <span style={{
                            fontSize: 10, fontWeight: 800,
                            padding: "2px 8px", borderRadius: 999,
                            background: e.direction === "credit" ? "rgba(45,190,96,0.12)" : "rgba(220,38,38,0.12)",
                            color: e.direction === "credit" ? "#16A34A" : "#DC2626",
                            textTransform: "uppercase", letterSpacing: "0.06em",
                          }}>{e.direction}</span>
                        </td>
                        <td style={{ padding: "8px 4px", textAlign: "right", color: TEXT, fontWeight: 700, fontFamily: "ui-monospace" }}>
                          {fromMicroDisplay(e.amount_micro, e.currency)}
                        </td>
                        <td style={{ padding: "8px 4px", color: TEXT, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {e.memo || <span style={{ color: LIGHT }}>—</span>}
                        </td>
                        <td style={{ padding: "8px 4px", fontFamily: "ui-monospace", color: LIGHT, fontSize: 11 }}>
                          {e.account_id.slice(0, 14)}…
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </Shell>
  );
}

function IntegrityBanner({ integrity }: { integrity: Integrity }) {
  const ok = integrity.is_intact;
  return (
    <Card
      style={{
        marginBottom: 16,
        borderLeft: `4px solid ${ok ? ZP_GREEN : "#DC2626"}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          fontSize: 11, fontWeight: 800,
          color: ok ? "#16A34A" : "#DC2626",
          textTransform: "uppercase", letterSpacing: "0.06em",
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: 999,
            background: ok ? ZP_GREEN : "#DC2626",
          }} />
          Chain integrity · {ok ? "intact" : "BROKEN"}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginTop: 4, letterSpacing: "-0.2px" }}>
          {integrity.verified_entries.toLocaleString("en-US")} of {integrity.total_entries.toLocaleString("en-US")} entries verified
        </div>
        {!ok && (
          <div style={{ fontSize: 11, color: "#DC2626", fontFamily: "ui-monospace", marginTop: 4 }}>
            First break at {integrity.first_break_at ?? "?"} · id {integrity.first_break_id ?? "?"}
          </div>
        )}
      </div>
      <div style={{ fontSize: 10, color: MUTED, fontFamily: "ui-monospace" }}>
        SHA-256 hash chain · zenicore.verify_chain_integrity()
      </div>
    </Card>
  );
}
