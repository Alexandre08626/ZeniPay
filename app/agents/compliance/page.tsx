// /agents/compliance — SOC2 readiness dashboard.
// Reads zenipay_compliance_checks + the last 10 warning/critical
// audit events for the merchant behind the caller org.

"use client";

import React, { useEffect, useState } from "react";
import { Shield, Check, AlertTriangle, X, Clock, Download } from "lucide-react";
import { Shell, Card } from "@/components/agents/Shell";
import { apiFetch } from "../_lib/session";
import {
  BORDER, TEXT, MUTED, LIGHT, ZP_GREEN, ZP_PURPLE, fmtDate,
} from "@/components/agents/theme";

interface ComplianceCheck {
  id: string;
  check_type: string;
  status: "pass" | "fail" | "warning" | "pending";
  details: string | null;
  last_checked_at: string;
}
interface AuditEvent {
  id: string;
  action: string;
  severity: "info" | "warning" | "critical";
  resource_type: string;
  resource_id: string | null;
  created_at: string;
  actor_type: string;
  actor_email: string | null;
}

export default function CompliancePage() {
  const [checks, setChecks] = useState<ComplianceCheck[]>([]);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await apiFetch<{
          checks: ComplianceCheck[]; recent_events: AuditEvent[]; score: number; total: number;
        }>("/api/v1/agents/compliance");
        setChecks(r.checks ?? []);
        setEvents(r.recent_events ?? []);
        setScore(r.score ?? 0);
        setTotal(r.total ?? 0);
      } finally { setLoading(false); }
    })();
  }, []);

  const pct = total > 0 ? Math.round((score / total) * 100) : 0;

  const exportSummary = () => {
    const lines = [
      "ZeniPay — SOC2 Readiness Report",
      `Generated: ${new Date().toISOString()}`,
      `Score: ${score} / ${total} (${pct}%)`,
      "",
      "CHECKS",
      ...checks.map((c) => `  ${c.status.toUpperCase().padEnd(8)} ${c.check_type} — ${c.details ?? ""}`),
      "",
      "RECENT SECURITY EVENTS",
      ...events.map((e) => `  [${e.severity.toUpperCase()}] ${e.created_at} ${e.action} ${e.resource_type}/${e.resource_id ?? ""}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zenipay-soc2-report-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Shell title="Compliance">
      {/* Hero */}
      <div style={{
        background: "linear-gradient(135deg, rgba(45,190,96,0.08) 0%, rgba(123,79,191,0.08) 100%)",
        border: `1px solid ${BORDER}`, borderRadius: 16, padding: "24px 26px", marginBottom: 18,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <Shield size={24} color={ZP_PURPLE} />
          <div style={{
            fontSize: 11, fontWeight: 800, color: ZP_PURPLE,
            letterSpacing: "0.14em", textTransform: "uppercase",
          }}>SOC2 Readiness</div>
          <span style={{
            marginLeft: "auto",
            fontSize: 10, fontWeight: 800, padding: "4px 10px", borderRadius: 999,
            background: "rgba(245,166,35,0.12)", color: "#D97706",
            letterSpacing: "0.06em", textTransform: "uppercase",
          }}>SOC2 Type II — In Progress</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <div style={{
            fontFamily: "ui-monospace", fontSize: 52, fontWeight: 900,
            color: TEXT, letterSpacing: "-0.03em", lineHeight: 1,
          }}>
            {score}<span style={{ fontSize: 28, color: MUTED, fontWeight: 700 }}>/{total}</span>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>checks passing</div>
            <div style={{ fontSize: 12, color: MUTED }}>{pct}% of ZeniPay’s SOC2 controls are green.</div>
          </div>
        </div>
        <div style={{ marginTop: 18, height: 8, borderRadius: 999, background: "#fff", border: `1px solid ${BORDER}`, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${pct}%`,
            background: "linear-gradient(135deg,#2DBE60,#15B8C9,#7B4FBF)",
            transition: "width 0.5s cubic-bezier(.4,0,.2,1)",
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
          <button
            onClick={exportSummary}
            style={{
              background: "#fff", color: TEXT,
              border: `1px solid ${BORDER}`,
              padding: "8px 14px", borderRadius: 10,
              fontSize: 12, fontWeight: 700, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}
          ><Download size={13} /> Download SOC2 summary</button>
        </div>
      </div>

      {/* Checks grid */}
      <h2 style={sectionHdr}>Controls</h2>
      {loading && checks.length === 0 ? (
        <Card><p style={{ margin: 0, fontSize: 13, color: MUTED }}>Loading…</p></Card>
      ) : checks.length === 0 ? (
        <Card><p style={{ margin: 0, fontSize: 13, color: MUTED }}>No compliance checks configured for this merchant yet.</p></Card>
      ) : (
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 12, marginBottom: 22,
        }}>
          {checks.map((c) => <CheckCard key={c.id} check={c} />)}
        </div>
      )}

      {/* Recent security events */}
      <h2 style={sectionHdr}>Recent security events</h2>
      <Card style={{ padding: 0 }}>
        {events.length === 0 ? (
          <p style={{ padding: "22px 18px", margin: 0, color: MUTED, fontSize: 13 }}>
            No warning or critical events in the last 90 days. ✓
          </p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["When", "Severity", "Action", "Resource", "Actor"].map((h) => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                  <td style={{ ...td, color: MUTED }}>{fmtDate(e.created_at)}</td>
                  <td style={td}><SeverityPill severity={e.severity} /></td>
                  <td style={{ ...td, fontWeight: 700 }}>{e.action}</td>
                  <td style={{ ...td, fontFamily: "ui-monospace" }}>{e.resource_type}{e.resource_id ? ` / ${e.resource_id}` : ""}</td>
                  <td style={{ ...td, color: MUTED }}>{e.actor_email ?? e.actor_type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </Shell>
  );
}

function CheckCard({ check }: { check: ComplianceCheck }) {
  const config = {
    pass:    { color: ZP_GREEN,  bg: "rgba(45,190,96,0.08)",  border: "rgba(45,190,96,0.25)",  icon: <Check       size={18} color={ZP_GREEN} /> },
    warning: { color: "#D97706", bg: "rgba(245,166,35,0.08)", border: "rgba(245,166,35,0.3)",  icon: <AlertTriangle size={18} color="#D97706" /> },
    fail:    { color: "#DC2626", bg: "rgba(220,38,38,0.06)",  border: "rgba(220,38,38,0.25)",  icon: <X           size={18} color="#DC2626" /> },
    pending: { color: MUTED,     bg: "#f8fafc",                border: BORDER,                  icon: <Clock       size={18} color={MUTED} /> },
  }[check.status];

  return (
    <div style={{
      background: "#fff", border: `1px solid ${config.border}`, borderRadius: 14,
      padding: "14px 16px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10, background: config.bg,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
        }}>{config.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 800, color: TEXT,
            textTransform: "capitalize" as const,
          }}>
            {check.check_type.replace(/_/g, " ")}
          </div>
          <div style={{ fontSize: 10, color: LIGHT, fontFamily: "ui-monospace" }}>
            last checked {fmtDate(check.last_checked_at)}
          </div>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 999,
          background: config.bg, color: config.color,
          letterSpacing: "0.06em", textTransform: "uppercase" as const,
        }}>{check.status}</span>
      </div>
      {check.details && (
        <p style={{ margin: "6px 0 0", fontSize: 12, color: MUTED, lineHeight: 1.5 }}>{check.details}</p>
      )}
    </div>
  );
}

function SeverityPill({ severity }: { severity: "info" | "warning" | "critical" }) {
  const map: Record<string, { bg: string; fg: string }> = {
    info:     { bg: "rgba(15,184,201,0.1)", fg: "#0891B2" },
    warning:  { bg: "rgba(245,166,35,0.12)", fg: "#D97706" },
    critical: { bg: "rgba(220,38,38,0.1)", fg: "#DC2626" },
  };
  const c = map[severity] ?? map.info;
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999,
      background: c.bg, color: c.fg, textTransform: "uppercase", letterSpacing: "0.06em",
    }}>{severity}</span>
  );
}

const sectionHdr: React.CSSProperties = {
  margin: "0 0 12px", fontFamily: "inherit", fontSize: 16, fontWeight: 800,
  color: TEXT, letterSpacing: "-0.01em",
};

const th: React.CSSProperties = {
  textAlign: "left", padding: "10px 14px", fontSize: 10, fontWeight: 800,
  color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em",
  borderBottom: `1px solid ${BORDER}`,
};
const td: React.CSSProperties = { padding: "12px 14px", fontSize: 12 };
