// /agents/fraud/[id] — alert detail. Shows z-score breakdown, recent
// authorizations for context, a sparkline of the last 30 signal points,
// and the resolve modal (false_positive | legitimate_anomaly | confirmed_fraud).

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Shell, Card, Metric } from "@/components/agents/Shell";
import { apiFetch } from "../../_lib/session";
import {
  BORDER, ROW_SEP, TEXT, MUTED, LIGHT,
  ZP_GREEN, ZP_CYAN,
  fmtUSD, fmtDate,
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
  resolved_by: string | null;
  created_at: string;
}

interface Signal {
  value: number;
  baseline: { mean: number; stddev: number; sample_count: number } | null;
  z_score: number | null;
  computed_at: string;
  time_window: string;
}

interface Auth {
  id: string;
  amount_cents: number;
  currency: string;
  merchant_name: string | null;
  merchant_category: string | null;
  decision: string;
  created_at: string;
}

export default function FraudAlertDetail() {
  const { id } = useParams<{ id: string }>();
  const [alert, setAlert] = useState<Alert | null>(null);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [recent, setRecent] = useState<Auth[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolution, setResolution] = useState<"false_positive" | "legitimate_anomaly" | "confirmed_fraud">("false_positive");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiFetch<{ alert: Alert; signals: Signal[]; recent_auths: Auth[] }>(
        `/api/v1/agents/fraud/alerts/${id}`,
      );
      setAlert(r.alert);
      setSignals(r.signals);
      setRecent(r.recent_auths);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const ack = async () => {
    setBusy(true);
    try {
      await apiFetch(`/api/v1/agents/fraud/alerts/${id}/ack`, { method: "POST" });
      await load();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const resolve = async () => {
    setBusy(true); setErr(null);
    try {
      await apiFetch(`/api/v1/agents/fraud/alerts/${id}/resolve`, {
        method: "POST",
        body: JSON.stringify({ resolution, note: note.trim() || undefined }),
      });
      setResolving(false); setNote("");
      await load();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const sparkline = useMemo(() => {
    if (signals.length === 0) return null;
    // Draw z-scores in signals[] reversed (oldest → newest).
    const points = signals.slice().reverse().map((s) => s.z_score).filter((v): v is number => v != null);
    if (points.length < 2) return null;
    const max = Math.max(...points, 3);
    const min = Math.min(...points, -3);
    const span = Math.max(1, max - min);
    const w = 240, h = 50;
    const path = points.map((v, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((v - min) / span) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    return { path, w, h, max, min, count: points.length };
  }, [signals]);

  if (loading && !alert) return <Shell title="Alert"><Card><p style={{ color: MUTED, fontSize: 12, margin: 0 }}>Loading…</p></Card></Shell>;
  if (!alert) return <Shell title="Alert"><Card><p style={{ color: MUTED, fontSize: 12, margin: 0 }}>Not found.</p></Card></Shell>;

  const metric = (alert.details?.metric as string | undefined) ?? "—";
  const z = (alert.details?.z_score as number | undefined) ?? null;
  const mean = (alert.details?.baseline_mean as number | undefined) ?? 0;
  const stddev = (alert.details?.baseline_stddev as number | undefined) ?? 0;
  const current = (alert.details?.current_value as number | undefined) ?? 0;
  const samples = (alert.details?.sample_count as number | undefined) ?? 0;
  const isOpen = alert.status === "open" || alert.status === "investigating";

  return (
    <Shell title="Fraud alert">
      <div style={{ fontSize: 11, color: MUTED, marginBottom: 14 }}>
        <Link href="/agents/fraud" style={{ color: MUTED, textDecoration: "none" }}>Fraud</Link>
        {" · "}
        <span style={{ color: TEXT, fontWeight: 700 }}>{alert.id.slice(0, 16)}…</span>
      </div>

      {err && (
        <Card style={{ marginBottom: 14, borderLeft: "4px solid #DC2626" }}>
          <p style={{ margin: 0, color: "#DC2626", fontSize: 12 }}>{err}</p>
        </Card>
      )}

      <Card style={{ marginBottom: 14, borderLeft: `4px solid ${severityColor(alert.severity)}` }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <SeverityPill severity={alert.severity} />
              <StatusPill status={alert.status} />
              {alert.auto_action_taken !== "none" && (
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "rgba(220,38,38,0.12)", color: "#DC2626", fontWeight: 800, textTransform: "uppercase" }}>
                  {alert.auto_action_taken}
                </span>
              )}
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: TEXT, letterSpacing: "-0.3px" }}>
              {humanAlertType(alert.alert_type)}
            </div>
            <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>
              {humanMetric(metric)} on {alert.scope_type}{" "}
              <span style={{ fontFamily: "ui-monospace" }}>{alert.scope_ref}</span>
            </div>
            <div style={{ fontSize: 10, color: LIGHT, fontFamily: "ui-monospace", marginTop: 6 }}>
              raised {fmtDate(alert.created_at)}
              {alert.resolved_at && ` · resolved ${fmtDate(alert.resolved_at)}`}
              {alert.card_id && ` · card ${alert.card_id}`}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {isOpen && alert.status === "open" && (
              <button
                onClick={ack}
                disabled={busy}
                style={{ padding: "8px 14px", borderRadius: 10, background: "transparent", border: `1px solid ${BORDER}`, color: TEXT, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
              >
                Ack
              </button>
            )}
            {isOpen && (
              <button
                onClick={() => setResolving(true)}
                disabled={busy}
                style={{ padding: "8px 14px", borderRadius: 10, background: ZP_GREEN, border: "none", color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer" }}
              >
                Resolve…
              </button>
            )}
          </div>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 14 }}>
        <Metric label="Z-score" value={z != null ? `${z.toFixed(2)}σ` : "—"} color={severityColor(alert.severity)} />
        <Metric label="Current" value={fmtSmart(metric, current)} color={ZP_CYAN} />
        <Metric label="Baseline μ" value={fmtSmart(metric, mean)} sub={`σ=${fmtSmart(metric, stddev)} · n=${samples}`} color={ZP_GREEN} />
      </div>

      {sparkline && (
        <Card style={{ marginBottom: 14 }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 800, color: TEXT }}>Z-score over last {sparkline.count} signals</h3>
          <svg width={sparkline.w} height={sparkline.h} style={{ display: "block", maxWidth: "100%" }}>
            <rect x={0} y={0} width={sparkline.w} height={sparkline.h} fill="#f8fafc" />
            {/* threshold lines */}
            {[3, -3].map((t) => {
              const span = Math.max(1, sparkline.max - sparkline.min);
              const y = sparkline.h - ((t - sparkline.min) / span) * sparkline.h;
              if (y < 0 || y > sparkline.h) return null;
              return <line key={t} x1={0} y1={y} x2={sparkline.w} y2={y} stroke="#DC2626" strokeDasharray="3 3" strokeOpacity={0.4} />;
            })}
            <path d={sparkline.path} stroke={severityColor(alert.severity)} strokeWidth={1.8} fill="none" />
          </svg>
          <p style={{ margin: "6px 0 0", fontSize: 10, color: LIGHT }}>
            dashed red = ±3σ alert threshold. range: {sparkline.min.toFixed(1)} → {sparkline.max.toFixed(1)}
          </p>
        </Card>
      )}

      {alert.scope_type === "card" && recent.length > 0 && (
        <Card>
          <h3 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 800, color: TEXT }}>Recent card authorizations</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ textAlign: "left", color: MUTED, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                <th style={{ padding: "6px 4px" }}>When</th>
                <th style={{ padding: "6px 4px" }}>Merchant</th>
                <th style={{ padding: "6px 4px", textAlign: "right" }}>Amount</th>
                <th style={{ padding: "6px 4px" }}>Decision</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} style={{ borderTop: `1px solid ${ROW_SEP}` }}>
                  <td style={{ padding: "8px 4px", color: MUTED }}>{fmtDate(r.created_at)}</td>
                  <td style={{ padding: "8px 4px", color: TEXT }}>
                    {r.merchant_name ?? <span style={{ color: LIGHT }}>—</span>}
                    {r.merchant_category && <span style={{ color: MUTED, marginLeft: 6, fontSize: 11 }}>MCC {r.merchant_category}</span>}
                  </td>
                  <td style={{ padding: "8px 4px", textAlign: "right", color: TEXT, fontWeight: 700 }}>
                    {r.currency === "USD" ? fmtUSD(r.amount_cents) : `${(r.amount_cents / 100).toFixed(2)} ${r.currency}`}
                  </td>
                  <td style={{ padding: "8px 4px", color: r.decision === "approved" ? "#16A34A" : "#DC2626" }}>{r.decision}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {resolving && (
        <div
          onClick={() => setResolving(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, padding: 24, maxWidth: 460, width: "100%", boxShadow: "0 10px 30px rgba(15,23,42,0.2)" }}>
            <h2 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 800 }}>Resolve alert</h2>
            <p style={{ margin: "0 0 14px", fontSize: 12, color: MUTED, lineHeight: 1.5 }}>
              <strong>confirmed_fraud</strong> on a card-scoped alert immediately pauses the card.
              The other two just close the alert.
            </p>
            <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
              <ResolveOption v="false_positive" label="False positive" desc="The signal is explainable, no fraud" current={resolution} onChange={setResolution} />
              <ResolveOption v="legitimate_anomaly" label="Legitimate anomaly" desc="Anomalous but not fraud (e.g. new campaign)" current={resolution} onChange={setResolution} />
              <ResolveOption v="confirmed_fraud" label="Confirmed fraud" desc="Pauses the card atomically. Audit logged." current={resolution} onChange={setResolution} danger />
            </div>
            <label style={{ fontSize: 11, color: MUTED, fontWeight: 700 }}>
              Note (optional)
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} style={{ display: "block", width: "100%", marginTop: 4, padding: "8px 10px", fontSize: 12, border: `1px solid ${BORDER}`, borderRadius: 10, fontFamily: "inherit", resize: "vertical" }} />
            </label>
            <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setResolving(false)} style={{ padding: "8px 16px", borderRadius: 10, background: "transparent", border: `1px solid ${BORDER}`, color: TEXT, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
              <button
                onClick={resolve}
                disabled={busy}
                style={{ padding: "8px 16px", borderRadius: 10, background: resolution === "confirmed_fraud" ? "#DC2626" : ZP_GREEN, color: "#fff", border: "none", fontSize: 12, fontWeight: 800, cursor: "pointer" }}
              >
                {busy ? "Saving…" : resolution === "confirmed_fraud" ? "Confirm fraud + pause card" : "Resolve"}
              </button>
            </div>
          </div>
        </div>
      )}

    </Shell>
  );
}

function ResolveOption({ v, label, desc, current, onChange, danger }: { v: "false_positive" | "legitimate_anomaly" | "confirmed_fraud"; label: string; desc: string; current: string; onChange: (s: "false_positive" | "legitimate_anomaly" | "confirmed_fraud") => void; danger?: boolean }) {
  const active = v === current;
  const color = danger ? "#DC2626" : ZP_GREEN;
  return (
    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 10, border: `1px solid ${active ? color : BORDER}`, background: active ? `${color}11` : "#fff", cursor: "pointer" }}>
      <input type="radio" name="resolution" value={v} checked={active} onChange={() => onChange(v)} style={{ accentColor: color, marginTop: 2 }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{label}</div>
        <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{desc}</div>
      </div>
    </label>
  );
}

function humanAlertType(t: string): string {
  return { velocity_spike: "Velocity spike", new_merchant_burst: "New-merchant burst", unusual_amount: "Unusual amount", off_hours_spend: "Off-hours spend", geographic_anomaly: "Geographic anomaly", policy_boundary_probe: "Policy boundary probe" }[t] ?? t;
}
function humanMetric(m: string): string {
  return { daily_spend_cents: "Daily spend (cents)", auth_count_1h: "Auths / hour", distinct_merchants_24h: "Distinct merchants / 24h" }[m] ?? m;
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
function fmtSmart(metric: string, v: number): string {
  if (metric === "daily_spend_cents") return fmtUSD(v);
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}
