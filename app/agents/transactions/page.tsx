// /agents/transactions — transaction log with basic status filter.

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Shell, Card } from "@/components/agents/Shell";
import { apiFetch } from "../_lib/session";
import { BORDER, ROW_SEP, TEXT, MUTED, LIGHT, fmtUSD, fmtDate, ZP_GREEN } from "@/components/agents/theme";

interface TxRow {
  id: string;
  agent_id: string;
  amount_cents: number;
  currency: string;
  merchant_id: string | null;
  category: string | null;
  status: string;
  protocol_used: string | null;
  policy_check_result: { reason?: string } | null;
  created_at: string;
}

const STATUSES = ["all", "authorized", "captured", "denied", "failed", "reversed"] as const;

export default function TransactionsPage() {
  const [rows, setRows] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<typeof STATUSES[number]>("all");
  const [selected, setSelected] = useState<TxRow | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const q = filter === "all" ? "" : `?status=${filter}`;
        const d = await apiFetch<{ transactions: TxRow[] }>(`/api/v1/agents/transactions${q}`);
        setRows(d.transactions);
      } finally {
        setLoading(false);
      }
    })();
  }, [filter]);

  const totals = useMemo(() => {
    const captured = rows.filter((r) => r.status === "authorized" || r.status === "captured");
    return {
      count: rows.length,
      volume: captured.reduce((s, r) => s + r.amount_cents, 0),
      denied: rows.filter((r) => r.status === "denied").length,
    };
  }, [rows]);

  return (
    <Shell title="Transactions">
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              border: `1px solid ${BORDER}`,
              background: filter === s ? "#0f172a" : "#fff",
              color: filter === s ? "#fff" : TEXT,
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              cursor: "pointer",
            }}
          >
            {s}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <Totals totals={totals} />
      </div>

      <Card style={{ padding: 0 }}>
        {loading ? (
          <p style={{ color: MUTED, padding: 20, fontSize: 13 }}>Loading…</p>
        ) : rows.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center", color: MUTED, fontSize: 13 }}>
            No transactions{filter === "all" ? "" : ` in ${filter}`} yet.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["When", "Agent", "Merchant", "Amount", "Status", "Protocol", ""].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "10px 16px",
                      fontSize: 10,
                      fontWeight: 800,
                      color: MUTED,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      borderBottom: `1px solid ${BORDER}`,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => setSelected(t)}
                  style={{ borderBottom: `1px solid ${ROW_SEP}`, cursor: "pointer" }}
                >
                  <td style={{ padding: "12px 16px", fontSize: 12, color: MUTED }}>{fmtDate(t.created_at)}</td>
                  <td style={{ padding: "12px 16px", fontSize: 11, color: LIGHT, fontFamily: "ui-monospace" }}>{t.agent_id}</td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: TEXT }}>{t.merchant_id ?? "—"}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 800, color: TEXT }}>{fmtUSD(t.amount_cents)}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <StatusPill status={t.status} />
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 11, color: MUTED }}>{t.protocol_used ?? "—"}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right", fontSize: 12, color: ZP_GREEN, fontWeight: 700 }}>
                    Open →
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {selected && <TxDrawer tx={selected} onClose={() => setSelected(null)} />}
    </Shell>
  );
}

function Totals({ totals }: { totals: { count: number; volume: number; denied: number } }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 18,
        alignItems: "center",
        padding: "6px 14px",
        background: "#fff",
        border: `1px solid ${BORDER}`,
        borderRadius: 999,
      }}
    >
      <Stat label="Count" value={String(totals.count)} />
      <span style={{ width: 1, height: 16, background: BORDER }} />
      <Stat label="Volume" value={fmtUSD(totals.volume)} />
      <span style={{ width: 1, height: 16, background: BORDER }} />
      <Stat label="Denied" value={String(totals.denied)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 9, color: MUTED, fontWeight: 700, letterSpacing: "0.08em" }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 12, color: TEXT, fontWeight: 800 }}>{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string }> = {
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
        padding: "2px 10px",
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

function TxDrawer({ tx, onClose }: { tx: TxRow; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.45)",
        zIndex: 500,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 460,
          background: "#fff",
          borderLeft: `1px solid ${BORDER}`,
          height: "100vh",
          padding: "24px 24px 32px",
          overflow: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>Transaction</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, color: LIGHT, cursor: "pointer" }}>×</button>
        </div>

        <p style={{ fontSize: 11, color: LIGHT, fontFamily: "ui-monospace", wordBreak: "break-all", margin: "0 0 16px" }}>
          {tx.id}
        </p>

        <Row k="Amount" v={fmtUSD(tx.amount_cents) + " " + tx.currency} />
        <Row k="Status" v={tx.status} />
        <Row k="Merchant" v={tx.merchant_id ?? "—"} />
        <Row k="Category" v={tx.category ?? "—"} />
        <Row k="Protocol" v={tx.protocol_used ?? "—"} />
        <Row k="Created" v={fmtDate(tx.created_at)} />
        {tx.policy_check_result?.reason && <Row k="Policy result" v={tx.policy_check_result.reason} />}

        <div style={{ marginTop: 20 }}>
          <h4 style={{ margin: "0 0 6px", fontSize: 11, color: MUTED, fontWeight: 800, letterSpacing: "0.08em" }}>
            POLICY CHECK RESULT
          </h4>
          <pre
            style={{
              margin: 0,
              padding: "12px 14px",
              background: "#0f172a",
              color: "#e5e7eb",
              borderRadius: 10,
              fontSize: 11,
              lineHeight: 1.5,
              overflow: "auto",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            }}
          >
            {JSON.stringify(tx.policy_check_result ?? {}, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "10px 0",
        borderBottom: `1px solid ${ROW_SEP}`,
      }}
    >
      <span style={{ color: MUTED, fontSize: 12, fontWeight: 700 }}>{k}</span>
      <span style={{ color: TEXT, fontSize: 12, fontWeight: 700, maxWidth: 260, textAlign: "right", wordBreak: "break-word" }}>
        {v}
      </span>
    </div>
  );
}
