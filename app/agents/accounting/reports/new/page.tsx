// /agents/accounting/reports/new — build-report wizard.
// Pick weekly (ISO Mon-Sun) / monthly (UTC calendar month) / custom (start/end).

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shell, Card } from "@/components/agents/Shell";
import { apiFetch } from "../../../_lib/session";
import { BORDER, TEXT, MUTED, ZP_GREEN } from "@/components/agents/theme";

type Period = "weekly" | "monthly" | "custom";

export default function NewReportWizard() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("monthly");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const body: Record<string, unknown> = { period };
      if (period === "custom") {
        if (!start || !end) throw new Error("start + end required for custom range");
        body.start = start;
        body.end = end;
      }
      const r = await apiFetch<{ report_id: string }>("/api/v1/agents/accounting/expense-reports", {
        method: "POST", body: JSON.stringify(body),
      });
      if (notes.trim()) {
        await apiFetch(`/api/v1/agents/accounting/expense-reports/${r.report_id}`, {
          method: "PATCH", body: JSON.stringify({ notes: notes.trim() }),
        });
      }
      router.push(`/agents/accounting/reports/${r.report_id}`);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  return (
    <Shell title="Build new report">
      <Breadcrumbs />

      <Card style={{ maxWidth: 620 }}>
        <form onSubmit={submit}>
          <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800, color: TEXT, letterSpacing: "-0.3px" }}>
            Period
          </h3>
          <p style={{ margin: "0 0 14px", fontSize: 12, color: MUTED, lineHeight: 1.5 }}>
            Weekly = ISO week Mon→Sun UTC. Monthly = first→last day UTC.
            Custom = inclusive date range. FX rates are snapped at settlement time.
          </p>
          <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
            <PeriodOption v="weekly" label="Last completed week" desc="Previous Mon 00:00 UTC → Sun 23:59:59 UTC" current={period} onChange={setPeriod} />
            <PeriodOption v="monthly" label="Last completed month" desc="First → last day of previous month (UTC)" current={period} onChange={setPeriod} />
            <PeriodOption v="custom" label="Custom range" desc="Pick any start / end date (both inclusive)" current={period} onChange={setPeriod} />
          </div>

          {period === "custom" && (
            <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr", marginBottom: 20 }}>
              <label style={{ fontSize: 11, color: MUTED, fontWeight: 700 }}>
                Start (YYYY-MM-DD)
                <input
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  required
                  style={{ display: "block", marginTop: 4, width: "100%", padding: "8px 12px", fontSize: 13, border: `1px solid ${BORDER}`, borderRadius: 10, color: TEXT, background: "#fff" }}
                />
              </label>
              <label style={{ fontSize: 11, color: MUTED, fontWeight: 700 }}>
                End (YYYY-MM-DD)
                <input
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  required
                  style={{ display: "block", marginTop: 4, width: "100%", padding: "8px 12px", fontSize: 13, border: `1px solid ${BORDER}`, borderRadius: 10, color: TEXT, background: "#fff" }}
                />
              </label>
            </div>
          )}

          <h3 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 800, color: TEXT }}>
            Notes <span style={{ fontWeight: 400, color: MUTED }}>(optional)</span>
          </h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="E.g. “Q1 2026 ops expenses — exclude one-off fines”"
            style={{ width: "100%", padding: "10px 12px", fontSize: 13, border: `1px solid ${BORDER}`, borderRadius: 10, color: TEXT, background: "#fff", resize: "vertical", fontFamily: "inherit", marginBottom: 20 }}
          />

          {err && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", marginBottom: 16, fontSize: 12, color: "#DC2626" }}>
              {err}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Link
              href="/agents/accounting/reports"
              style={{ padding: "10px 18px", borderRadius: 10, background: "transparent", border: `1px solid ${BORDER}`, color: TEXT, fontSize: 12, fontWeight: 700, textDecoration: "none" }}
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={busy}
              style={{ padding: "10px 20px", borderRadius: 10, background: ZP_GREEN, color: "#fff", border: "none", fontSize: 12, fontWeight: 800, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}
            >
              {busy ? "Building…" : "Build report"}
            </button>
          </div>
        </form>
      </Card>
    </Shell>
  );
}

function PeriodOption({
  v, label, desc, current, onChange,
}: {
  v: Period; label: string; desc: string; current: Period; onChange: (p: Period) => void;
}) {
  const active = v === current;
  return (
    <label
      style={{
        display: "flex", alignItems: "flex-start", gap: 10,
        padding: "10px 14px", borderRadius: 12,
        border: `1px solid ${active ? ZP_GREEN : BORDER}`,
        background: active ? "rgba(45,190,96,0.05)" : "#fff",
        cursor: "pointer",
      }}
    >
      <input
        type="radio"
        name="period"
        value={v}
        checked={active}
        onChange={() => onChange(v)}
        style={{ accentColor: ZP_GREEN, marginTop: 2 }}
      />
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{label}</div>
        <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{desc}</div>
      </div>
    </label>
  );
}

function Breadcrumbs() {
  return (
    <div style={{ fontSize: 11, color: MUTED, marginBottom: 14 }}>
      <Link href="/agents/accounting" style={{ color: MUTED, textDecoration: "none" }}>Accounting</Link>
      {" · "}
      <Link href="/agents/accounting/reports" style={{ color: MUTED, textDecoration: "none" }}>Reports</Link>
      {" · "}
      <span style={{ color: TEXT, fontWeight: 700 }}>New</span>
    </div>
  );
}
