// /agents/fraud — alerts inbox. Tabs: open | investigating | resolved.
// Each row links to /agents/fraud/[id] for full context.

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Shell, Card, Metric } from "@/components/agents/Shell";
import { apiFetch } from "../_lib/session";
import {
  BORDER, ROW_SEP, TEXT, MUTED, LIGHT,
  ZP_GREEN, ZP_CYAN,
  fmtDate,
} from "@/components/agents/theme";

interface Alert {
  id: string;
  scope_type: "agent" | "card" | "org";
  scope_ref: string;
  alert_type: string;
  severity: "info" | "warn" | "critical";
  details: Record<string, unknown>;
  status: "open" | "investigating" | "dismissed" | "confirmed_fraud";
  auto_action_taken: string;
  card_id: string | null;
  resolved_at: string | null;
  created_at: string;
}

type Tab = "open" | "investigating" | "resolved";

export default function FraudInboxPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [counts, setCounts] = useState<{ by_status?: Record<string, number>; by_severity?: Record<string, number> } | null>(null);
  const [tab, setTab] = useState<Tab>("open");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const statusFilter =
        tab === "open"          ? "?status=open"
        : tab === "investigating" ? "?status=investigating"
        : "";
      const r = await apiFetch<{ alerts: Alert[]; counts: typeof counts }>(
        `/api/v1/agents/fraud/alerts${statusFilter}`,
      );
      setAlerts(tab === "resolved"
        ? r.alerts.filter((a) => a.status === "dismissed" || a.status === "confirmed_fraud")
        : r.alerts);
      setCounts(r.counts);
    } finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { void load(); const id = setInterval(load, 30_000); return () => clearInterval(id); }, [load]);

  const severityCounts = counts?.by_severity ?? {};

  return (
    <Shell title="Fraud alerts">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
        <Metric label="Open" value={String(counts?.by_status?.open ?? 0)} color="#DC2626" />
        <Metric label="Investigating" value={String(counts?.by_status?.investigating ?? 0)} color="#D97706" />
        <Metric label="Critical" value={String(severityCounts.critical ?? 0)} sub="z ≥ 6.0" color="#DC2626" />
        <Metric label="Warn" value={String(severityCounts.warn ?? 0)} sub="3.0 ≤ z < 6.0" color="#D97706" />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <TabBtn active={tab === "open"} onClick={() => setTab("open")} label="Open" count={counts?.by_status?.open ?? 0} urgent />
        <TabBtn active={tab === "investigating"} onClick={() => setTab("investigating")} label="Investigating" count={counts?.by_status?.investigating ?? 0} />
        <TabBtn active={tab === "resolved"} onClick={() => setTab("resolved")} label="Resolved" />
      </div>

      {loading && alerts.length === 0 ? (
        <Card><p style={{ color: MUTED, fontSize: 12, margin: 0 }}>Loading…</p></Card>
      ) : alerts.length === 0 ? (
        <Card>
          <div style={{ padding: "28px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🛡️</div>
            <p style={{ fontSize: 14, fontWeight: 800, color: TEXT, margin: "0 0 4px" }}>No {tab} alerts</p>
            <p style={{ fontSize: 11, color: MUTED, margin: 0, maxWidth: 380, marginInline: "auto", lineHeight: 1.5 }}>
              {tab === "open"
                ? "The hourly cron writes anomaly_signals; alerts appear here when z-score exceeds 3.0."
                : tab === "investigating"
                ? "Alerts you've acknowledged sit here until resolved."
                : "Dismissed + confirmed-fraud alerts accumulate here."}
            </p>
          </div>
        </Card>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {alerts.map((a) => <AlertTile key={a.id} alert={a} />)}
        </div>
      )}
    </Shell>
  );
}

function TabBtn({ active, onClick, label, count, urgent }: { active: boolean; onClick: () => void; label: string; count?: number; urgent?: boolean }) {
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
      {count != null && count > 0 && (
        <span style={{
          padding: "1px 8px", borderRadius: 999,
          background: active ? "#fff" : urgent ? "#DC2626" : "#f1f5f9",
          color: active ? TEXT : urgent ? "#fff" : MUTED,
          fontSize: 10, fontWeight: 800,
        }}>{count}</span>
      )}
    </button>
  );
}

function AlertTile({ alert }: { alert: Alert }) {
  const z = (alert.details?.z_score as number | undefined) ?? null;
  const metric = (alert.details?.metric as string | undefined) ?? "—";
  const mean = (alert.details?.baseline_mean as number | undefined) ?? null;
  const current = (alert.details?.current_value as number | undefined) ?? null;
  return (
    <Link href={`/agents/fraud/${alert.id}`} style={{ textDecoration: "none" }}>
      <Card style={{ borderLeft: `4px solid ${severityColor(alert.severity)}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
              <SeverityPill severity={alert.severity} />
              <StatusPill status={alert.status} />
              {alert.auto_action_taken !== "none" && (
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "rgba(220,38,38,0.12)", color: "#DC2626", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {alert.auto_action_taken}
                </span>
              )}
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: TEXT, letterSpacing: "-0.2px" }}>
              {humanAlertType(alert.alert_type)} — {humanMetric(metric)}
            </div>
            <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>
              scope: <strong style={{ color: TEXT }}>{alert.scope_type}</strong> ·{" "}
              <span style={{ fontFamily: "ui-monospace", fontSize: 11 }}>{alert.scope_ref.slice(0, 16)}…</span>
            </div>
            <div style={{ fontSize: 10, color: LIGHT, fontFamily: "ui-monospace", marginTop: 6 }}>
              {alert.id} · {fmtDate(alert.created_at)}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            {z != null && (
              <>
                <div style={{ fontSize: 10, color: MUTED, letterSpacing: "0.08em" }}>Z-SCORE</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: severityColor(alert.severity), letterSpacing: "-0.4px" }}>
                  {z.toFixed(2)}σ
                </div>
                {current != null && mean != null && (
                  <div style={{ fontSize: 10, color: LIGHT, marginTop: 2 }}>
                    {fmtNum(current)} vs μ={fmtNum(mean)}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

function humanAlertType(t: string): string {
  return { velocity_spike: "Velocity spike", new_merchant_burst: "New-merchant burst", unusual_amount: "Unusual amount", off_hours_spend: "Off-hours spend", geographic_anomaly: "Geographic anomaly", policy_boundary_probe: "Policy boundary probe" }[t] ?? t;
}
function humanMetric(m: string): string {
  return { daily_spend_cents: "daily spend", auth_count_1h: "auths / hour", distinct_merchants_24h: "distinct merchants / 24h" }[m] ?? m;
}
function severityColor(s: string): string {
  return s === "critical" ? "#DC2626" : s === "warn" ? "#D97706" : "#64748b";
}
function SeverityPill({ severity }: { severity: string }) {
  const color = severityColor(severity);
  return <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: `${color}22`, color, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>{severity}</span>;
}
function StatusPill({ status }: { status: string }) {
  const m: Record<string, { bg: string; fg: string }> = {
    open:             { bg: "rgba(220,38,38,0.12)", fg: "#DC2626" },
    investigating:    { bg: "rgba(217,119,6,0.12)", fg: "#D97706" },
    dismissed:        { bg: "#f1f5f9", fg: "#64748b" },
    confirmed_fraud:  { bg: "rgba(220,38,38,0.2)", fg: "#DC2626" },
  };
  const c = m[status] ?? { bg: "#f1f5f9", fg: "#64748b" };
  return <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: c.bg, color: c.fg, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>{status}</span>;
}
function fmtNum(v: number): string {
  if (Number.isInteger(v)) return String(v);
  if (v >= 1000) return v.toFixed(0);
  if (v >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

void useMemo;
