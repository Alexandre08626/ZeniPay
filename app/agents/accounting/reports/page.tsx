// /agents/accounting/reports — list of all expense reports for the org,
// newest first. Filters by status. Link to /new to build a new one.

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shell, Card } from "@/components/agents/Shell";
import { apiFetch } from "../../_lib/session";
import {
  BORDER, ROW_SEP, TEXT, MUTED, LIGHT,
  ZP_GREEN,
  fmtDate,
} from "@/components/agents/theme";

interface ReportRow {
  id: string;
  period_start: string;
  period_end: string;
  status: "draft" | "finalized";
  finalized_at: string | null;
  finalized_by: string | null;
  export_format: string | null;
  notes: string | null;
  parent_report_id: string | null;
  created_at: string;
}

export default function ReportsListPage() {
  const router = useRouter();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "draft" | "finalized">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiFetch<{ reports: ReportRow[] }>("/api/v1/agents/accounting/expense-reports");
      setReports(r.reports);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    if (tab === "all") return reports;
    return reports.filter((r) => r.status === tab);
  }, [reports, tab]);

  return (
    <Shell title="Expense reports">
      <Breadcrumbs />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <TabBtn active={tab === "all"} onClick={() => setTab("all")} label="All" count={reports.length} />
          <TabBtn active={tab === "draft"} onClick={() => setTab("draft")} label="Draft" count={reports.filter((r) => r.status === "draft").length} />
          <TabBtn active={tab === "finalized"} onClick={() => setTab("finalized")} label="Finalized" count={reports.filter((r) => r.status === "finalized").length} />
        </div>
        <Link
          href="/agents/accounting/reports/new"
          style={{
            display: "inline-block",
            padding: "8px 16px", borderRadius: 10,
            background: ZP_GREEN, color: "#fff",
            fontSize: 12, fontWeight: 800, textDecoration: "none",
          }}
        >
          + New report
        </Link>
      </div>

      <Card>
        {loading ? (
          <p style={{ color: MUTED, fontSize: 12, margin: 0 }}>Loading…</p>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "28px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
            <p style={{ fontSize: 13, fontWeight: 700, color: TEXT, margin: "0 0 4px" }}>
              {tab === "all" ? "No reports yet" : `No ${tab} reports`}
            </p>
            <p style={{ fontSize: 11, color: MUTED, margin: "0 0 12px" }}>
              Build a report to roll up settled card charges over a period.
            </p>
            <Link
              href="/agents/accounting/reports/new"
              style={{
                display: "inline-block",
                padding: "8px 16px", borderRadius: 10,
                background: ZP_GREEN, color: "#fff",
                fontSize: 12, fontWeight: 800, textDecoration: "none",
              }}
            >
              Build new report →
            </Link>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: MUTED, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                <th style={{ padding: "8px 6px" }}>Period</th>
                <th style={{ padding: "8px 6px" }}>Status</th>
                <th style={{ padding: "8px 6px" }}>Built</th>
                <th style={{ padding: "8px 6px" }}>Finalized</th>
                <th style={{ padding: "8px 6px" }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => router.push(`/agents/accounting/reports/${r.id}`)}
                  style={{ borderTop: `1px solid ${ROW_SEP}`, cursor: "pointer" }}
                >
                  <td style={{ padding: "10px 6px" }}>
                    <div style={{ color: TEXT, fontWeight: 700 }}>{r.period_start} → {r.period_end}</div>
                    <div style={{ fontSize: 10, color: LIGHT, fontFamily: "ui-monospace", marginTop: 2 }}>
                      {r.id.slice(0, 20)}…
                    </div>
                  </td>
                  <td style={{ padding: "10px 6px" }}>
                    <StatusPill status={r.status} />
                  </td>
                  <td style={{ padding: "10px 6px", color: MUTED, fontSize: 12 }}>{fmtDate(r.created_at)}</td>
                  <td style={{ padding: "10px 6px", color: MUTED, fontSize: 12 }}>
                    {r.finalized_at ? fmtDate(r.finalized_at) : "—"}
                  </td>
                  <td style={{ padding: "10px 6px", color: MUTED, fontSize: 12, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.notes ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </Shell>
  );
}

function TabBtn({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px", borderRadius: 999,
        background: active ? TEXT : "#fff",
        color: active ? "#fff" : TEXT,
        border: `1px solid ${active ? TEXT : BORDER}`,
        fontSize: 12, fontWeight: 700, cursor: "pointer",
        display: "inline-flex", alignItems: "center", gap: 8,
      }}
    >
      {label}
      <span style={{ padding: "1px 8px", borderRadius: 999, background: active ? "#fff" : "#f1f5f9", color: active ? TEXT : MUTED, fontSize: 10, fontWeight: 800 }}>{count}</span>
    </button>
  );
}

function StatusPill({ status }: { status: string }) {
  const m: Record<string, { bg: string; fg: string }> = {
    draft:     { bg: "rgba(21,184,201,0.12)", fg: "#0891B2" },
    finalized: { bg: "rgba(45,190,96,0.12)", fg: "#16A34A" },
  };
  const c = m[status] ?? { bg: "#f1f5f9", fg: "#64748b" };
  return <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 999, background: c.bg, color: c.fg, textTransform: "uppercase", letterSpacing: "0.06em" }}>{status}</span>;
}

function Breadcrumbs() {
  return (
    <div style={{ fontSize: 11, color: MUTED, marginBottom: 14 }}>
      <Link href="/agents/accounting" style={{ color: MUTED, textDecoration: "none" }}>Accounting</Link>
      {" · "}
      <span style={{ color: TEXT, fontWeight: 700 }}>Reports</span>
    </div>
  );
}
