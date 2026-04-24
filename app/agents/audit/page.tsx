// /agents/audit — SOC2 audit log viewer.
// Reads zenipay_audit_log for the merchant linked to the caller's org.
// The legacy export wizard lives at /agents/audit/export.

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Shell, Card } from "@/components/agents/Shell";
import { apiFetch } from "../_lib/session";
import {
  BORDER, TEXT, MUTED, LIGHT, ZP_GREEN, ZP_CYAN, ZP_PURPLE, fmtDate,
} from "@/components/agents/theme";

interface AuditEvent {
  id: string;
  merchant_id: string | null;
  actor_type: "merchant_user" | "agent" | "api_key" | "system" | "admin";
  actor_id: string;
  actor_email: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  old_value: unknown;
  new_value: unknown;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  severity: "info" | "warning" | "critical";
  created_at: string;
}

export default function AuditLogPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [totals, setTotals] = useState({ total: 0, critical: 0 });
  const [loading, setLoading] = useState(true);
  const [severity, setSeverity] = useState("");
  const [actorType, setActorType] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (severity)  qs.set("severity", severity);
      if (actorType) qs.set("actor_type", actorType);
      qs.set("limit", "200");
      const r = await apiFetch<{ events: AuditEvent[]; total_count: number; critical_count: number }>(
        `/api/v1/agents/audit-log?${qs.toString()}`,
      );
      setEvents(r.events ?? []);
      setTotals({ total: r.total_count ?? 0, critical: r.critical_count ?? 0 });
    } finally { setLoading(false); }
  }, [severity, actorType]);
  useEffect(() => { void load(); }, [load]);

  const last24h = useMemo(() => {
    const cutoff = Date.now() - 86_400_000;
    return events.filter((e) => new Date(e.created_at).getTime() >= cutoff).length;
  }, [events]);

  const mostActiveActor = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of events) {
      const key = e.actor_email ?? e.actor_id;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] ?? "—";
  }, [events]);

  const exportCsv = () => {
    const header = "created_at,actor_type,actor_id,actor_email,action,resource_type,resource_id,severity,ip\n";
    const body = events.map((e) => {
      const esc = (s: string | null | undefined) => `"${(s ?? "").replace(/"/g, '""')}"`;
      return `${e.created_at},${esc(e.actor_type)},${esc(e.actor_id)},${esc(e.actor_email)},${esc(e.action)},${esc(e.resource_type)},${esc(e.resource_id)},${esc(e.severity)},${esc(e.ip_address)}`;
    }).join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zenipay-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Shell title="Audit log">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 18 }}>
        <Stat label="Total events" value={String(totals.total)} accent={ZP_CYAN} />
        <Stat label="Critical" value={String(totals.critical)} accent="#DC2626" />
        <Stat label="Last 24h" value={String(last24h)} accent={ZP_GREEN} />
        <Stat label="Most active" value={shortActor(mostActiveActor)} accent={ZP_PURPLE} />
      </div>

      <Card style={{ padding: 14, marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <FilterPill
            options={[
              { v: "", l: "All" },
              { v: "info", l: "Info" },
              { v: "warning", l: "Warning" },
              { v: "critical", l: "Critical" },
            ]}
            value={severity}
            onChange={setSeverity}
          />
          <FilterPill
            options={[
              { v: "", l: "Any actor" },
              { v: "merchant_user", l: "Merchant" },
              { v: "agent", l: "Agent" },
              { v: "api_key", l: "API key" },
              { v: "system", l: "System" },
              { v: "admin", l: "Admin" },
            ]}
            value={actorType}
            onChange={setActorType}
          />
          <div style={{ flex: 1 }} />
          <button onClick={exportCsv} style={{
            background: "#fff", color: TEXT, border: `1px solid ${BORDER}`,
            padding: "7px 14px", borderRadius: 8,
            fontSize: 12, fontWeight: 700, cursor: "pointer",
          }}>Export CSV</button>
        </div>
      </Card>

      <Card style={{ padding: 0 }}>
        {loading && events.length === 0 ? (
          <p style={{ padding: "22px 18px", margin: 0, color: MUTED, fontSize: 13 }}>Loading…</p>
        ) : events.length === 0 ? (
          <p style={{ padding: "22px 18px", margin: 0, color: MUTED, fontSize: 13 }}>
            No audit events match. The log populates as merchants + agents act on your resources.
          </p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "ui-monospace", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Timestamp", "Actor", "Action", "Resource", "Severity", "IP"].map((h) => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <React.Fragment key={e.id}>
                  <tr
                    onClick={() => setExpanded((x) => ({ ...x, [e.id]: !x[e.id] }))}
                    style={{ borderTop: `1px solid ${BORDER}`, cursor: "pointer" }}
                  >
                    <td style={{ ...td, color: MUTED }}>{fmtDate(e.created_at)}</td>
                    <td style={{ ...td, color: TEXT }}>
                      <div style={{ fontWeight: 700 }}>{e.actor_type}</div>
                      <div style={{ color: LIGHT, fontSize: 11 }}>{e.actor_email ?? e.actor_id}</div>
                    </td>
                    <td style={{ ...td, color: TEXT, fontWeight: 700 }}>{e.action}</td>
                    <td style={td}>
                      <div style={{ color: MUTED }}>{e.resource_type}</div>
                      {e.resource_id && <div style={{ color: LIGHT, fontSize: 11 }}>{e.resource_id}</div>}
                    </td>
                    <td style={td}><SeverityPill severity={e.severity} /></td>
                    <td style={{ ...td, color: MUTED }}>{e.ip_address ?? "—"}</td>
                  </tr>
                  {expanded[e.id] && (
                    <tr style={{ background: "#f8fafc", borderTop: `1px solid ${BORDER}` }}>
                      <td colSpan={6} style={{ padding: "12px 18px" }}>
                        <JsonDiff oldValue={e.old_value} newValue={e.new_value} />
                        {e.metadata && Object.keys(e.metadata).length > 0 && (
                          <details open style={{ marginTop: 10 }}>
                            <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 11, color: MUTED }}>Metadata</summary>
                            <pre style={codeBlock}>{JSON.stringify(e.metadata, null, 2)}</pre>
                          </details>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <p style={{ marginTop: 18, fontSize: 11, color: MUTED }}>
        Audit logs are retained for 90 days per ZeniPay data-retention policy.
      </p>
    </Shell>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{
      background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14,
      padding: "14px 16px", borderLeft: `4px solid ${accent}`,
    }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: TEXT, marginTop: 4, fontFamily: "ui-monospace" }}>{value}</div>
    </div>
  );
}

function FilterPill({
  options, value, onChange,
}: {
  options: Array<{ v: string; l: string }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "inline-flex", gap: 2, padding: 3, background: "#f1f5f9", border: `1px solid ${BORDER}`, borderRadius: 8 }}>
      {options.map((o) => {
        const active = o.v === value;
        return (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            style={{
              padding: "6px 12px", borderRadius: 6, border: "none", cursor: "pointer",
              background: active ? "#fff" : "transparent",
              color: active ? TEXT : MUTED,
              fontSize: 12, fontWeight: active ? 700 : 600,
            }}
          >{o.l}</button>
        );
      })}
    </div>
  );
}

function SeverityPill({ severity }: { severity: "info" | "warning" | "critical" }) {
  const map: Record<string, { bg: string; fg: string }> = {
    info:     { bg: "rgba(15,184,201,0.1)", fg: ZP_CYAN },
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

function JsonDiff({ oldValue, newValue }: { oldValue: unknown; newValue: unknown }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      <div>
        <div style={{ fontSize: 10, fontWeight: 800, color: MUTED, marginBottom: 4, letterSpacing: "0.08em", textTransform: "uppercase" }}>Before</div>
        <pre style={codeBlock}>{oldValue == null ? "null" : JSON.stringify(oldValue, null, 2)}</pre>
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 800, color: MUTED, marginBottom: 4, letterSpacing: "0.08em", textTransform: "uppercase" }}>After</div>
        <pre style={codeBlock}>{newValue == null ? "null" : JSON.stringify(newValue, null, 2)}</pre>
      </div>
    </div>
  );
}

function shortActor(s: string): string {
  if (s === "—") return s;
  if (s.includes("@")) return s;
  return s.length > 16 ? `${s.slice(0, 12)}…` : s;
}

const th: React.CSSProperties = {
  textAlign: "left", padding: "10px 14px", fontSize: 10, fontWeight: 800,
  color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em",
  borderBottom: `1px solid ${BORDER}`,
};
const td: React.CSSProperties = { padding: "12px 14px", verticalAlign: "top" };

const codeBlock: React.CSSProperties = {
  margin: 0, padding: 10, borderRadius: 8,
  background: "#0f172a", color: "#e5e7eb",
  fontFamily: "ui-monospace", fontSize: 11, lineHeight: 1.5,
  overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all",
};
