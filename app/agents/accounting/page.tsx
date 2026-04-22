// /agents/accounting — overview. MTD + YTD totals, breakdown by GL account,
// recent expense reports, quick links to chart-of-accounts / MCC mappings.

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Shell, Card, Metric } from "@/components/agents/Shell";
import { apiFetch } from "../_lib/session";
import {
  BORDER, ROW_SEP, TEXT, MUTED, LIGHT,
  ZP_GREEN, ZP_CYAN, ZP_PURPLE,
  fmtUSD, fmtDate,
} from "@/components/agents/theme";

interface ReportRow {
  id: string;
  period_start: string;
  period_end: string;
  status: "draft" | "finalized";
  finalized_at: string | null;
  notes: string | null;
  created_at: string;
}

interface GlRow { id: string; code: string; name: string; active: boolean }

export default function AccountingOverview() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [glAccounts, setGlAccounts] = useState<GlRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [r1, r2] = await Promise.all([
          apiFetch<{ reports: ReportRow[] }>("/api/v1/agents/accounting/expense-reports"),
          apiFetch<{ accounts: GlRow[] }>("/api/v1/agents/accounting/gl-accounts"),
        ]);
        if (!cancelled) {
          setReports(r1.reports);
          setGlAccounts(r2.accounts);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const draftCount = reports.filter((r) => r.status === "draft").length;
  const finalizedCount = reports.filter((r) => r.status === "finalized").length;

  return (
    <Shell title="Accounting">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 20 }}>
        <Metric label="Chart of accounts" value={String(glAccounts.length)} sub={`${glAccounts.filter((g) => g.active).length} active`} color={ZP_GREEN} />
        <Metric label="Reports · draft" value={String(draftCount)} sub="open for edit" color={ZP_CYAN} />
        <Metric label="Reports · finalized" value={String(finalizedCount)} sub="immutable, exportable" color={ZP_PURPLE} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, marginBottom: 20 }}>
        <QuickLink
          href="/agents/accounting/chart-of-accounts"
          title="Chart of accounts"
          desc="Create, rename, or archive GL accounts. 21 ZeniPay defaults seed on first use."
          icon="📒"
        />
        <QuickLink
          href="/agents/accounting/mcc-mappings"
          title="MCC mappings"
          desc="Override the default MCC → GL rules. Travel MCCs are handled separately."
          icon="🔀"
        />
        <QuickLink
          href="/agents/accounting/reports"
          title="Expense reports"
          desc="Build weekly / monthly / custom reports. Export to QuickBooks, Xero, NetSuite, CSV."
          icon="📊"
        />
      </div>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: TEXT, letterSpacing: "-0.2px" }}>
            Recent reports
          </h3>
          <Link href="/agents/accounting/reports" style={{ fontSize: 11, color: ZP_GREEN, fontWeight: 700, textDecoration: "none" }}>
            All reports →
          </Link>
        </div>
        {loading ? (
          <p style={{ color: MUTED, fontSize: 12, margin: 0 }}>Loading…</p>
        ) : reports.length === 0 ? (
          <div style={{ padding: "28px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <p style={{ fontSize: 13, fontWeight: 700, color: TEXT, margin: "0 0 4px" }}>No expense reports yet</p>
            <p style={{ fontSize: 11, color: MUTED, margin: "0 0 12px" }}>
              Reports roll up settled card transactions over a period.
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
              Build first report →
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 0 }}>
            {reports.slice(0, 6).map((r, i) => (
              <Link
                key={r.id}
                href={`/agents/accounting/reports/${r.id}`}
                style={{
                  padding: "10px 4px",
                  borderTop: i === 0 ? "none" : `1px solid ${ROW_SEP}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  textDecoration: "none",
                  color: TEXT,
                  gap: 10,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>
                    {r.period_start} → {r.period_end}
                  </div>
                  <div style={{ fontSize: 10, color: LIGHT, fontFamily: "ui-monospace", marginTop: 2 }}>
                    {r.id.slice(0, 16)}… · built {fmtDate(r.created_at)}
                  </div>
                </div>
                <StatusPill status={r.status} />
              </Link>
            ))}
          </div>
        )}
      </Card>
    </Shell>
  );
}

function QuickLink({ href, title, desc, icon }: { href: string; title: string; desc: string; icon: string }) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <Card style={{ cursor: "pointer", transition: "transform 80ms", height: "100%" }}>
        <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
        <div style={{ fontSize: 14, fontWeight: 800, color: TEXT, marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.45 }}>{desc}</div>
      </Card>
    </Link>
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

void BORDER;
