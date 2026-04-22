// /agents/accounting/reports/[id] — detail: lines table with pagination,
// re-categorize modal, finalize button, export dropdown (CSV / QBO / Xero /
// NetSuite) via signed URL.

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Shell, Card, Metric } from "@/components/agents/Shell";
import { apiFetch } from "../../../_lib/session";
import {
  BORDER, ROW_SEP, TEXT, MUTED, LIGHT,
  ZP_GREEN, ZP_CYAN, ZP_PURPLE,
  fmtUSD, fmtDate,
} from "@/components/agents/theme";

interface Report {
  id: string;
  period_start: string;
  period_end: string;
  status: "draft" | "finalized";
  finalized_at: string | null;
  notes: string | null;
  created_at: string;
  parent_report_id: string | null;
}

interface Line {
  id: string;
  report_id: string;
  card_auth_id: string | null;
  transaction_id: string | null;
  gl_account_id: string | null;
  memo: string | null;
  amount_cents: number;
  currency: string;
  converted_usd_cents: number;
  manually_categorized: boolean;
  created_at: string;
}

interface GlAccount { id: string; code: string; name: string; active: boolean }

interface DetailResponse {
  report: Report;
  lines: Line[];
  next_cursor: string | null;
  totals: { usd: number; lines: number; by_gl: Record<string, number> };
}

const FORMATS: Array<{ v: "csv" | "quickbooks" | "xero" | "netsuite"; label: string; note: string }> = [
  { v: "csv",        label: "Generic CSV",          note: "RFC 4180, 11 cols"       },
  { v: "quickbooks", label: "QuickBooks 3-col CSV", note: "mm/dd/yyyy negatives"    },
  { v: "xero",       label: "Xero bank statement",  note: "dd/mm/yyyy strict cols"  },
  { v: "netsuite",   label: "NetSuite JSON journal", note: "externalId per line"    },
];

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [gls, setGls] = useState<GlAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [pages, setPages] = useState<Line[][]>([]);
  const [recatLine, setRecatLine] = useState<Line | null>(null);

  const load = useCallback(async (c: string | null = null) => {
    setLoading(true);
    try {
      const [d, g] = await Promise.all([
        apiFetch<DetailResponse>(`/api/v1/agents/accounting/expense-reports/${id}${c ? `?cursor=${encodeURIComponent(c)}` : ""}`),
        apiFetch<{ accounts: GlAccount[] }>("/api/v1/agents/accounting/gl-accounts"),
      ]);
      setDetail(d);
      setGls(g.accounts.filter((a) => a.active));
      setCursor(d.next_cursor);
      if (c === null) {
        setPages([d.lines]);
      } else {
        setPages((prev) => [...prev, d.lines]);
      }
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(null); }, [load]);

  const finalize = async () => {
    if (!detail) return;
    if (!confirm("Finalize this report? This is irreversible — finalized reports can't be edited.")) return;
    setBusy(true);
    try {
      await apiFetch(`/api/v1/agents/accounting/expense-reports/${id}`, {
        method: "PATCH", body: JSON.stringify({ status: "finalized" }),
      });
      await load(null);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const exportAs = async (format: "csv" | "quickbooks" | "xero" | "netsuite") => {
    setBusy(true); setErr(null);
    try {
      const r = await apiFetch<{ url: string }>(`/api/v1/agents/accounting/expense-reports/${id}/export`, {
        method: "POST", body: JSON.stringify({ format }),
      });
      window.location.href = r.url;
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const recategorize = async (glAccountId: string) => {
    if (!recatLine) return;
    setBusy(true);
    try {
      await apiFetch(`/api/v1/agents/accounting/expense-reports/${id}/re-categorize`, {
        method: "POST",
        body: JSON.stringify({ line_id: recatLine.id, gl_account_id: glAccountId }),
      });
      setRecatLine(null);
      await load(null);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const glById = useMemo(() => new Map(gls.map((g) => [g.id, g])), [gls]);
  const allLines = useMemo(() => pages.flat(), [pages]);
  const isDraft = detail?.report.status === "draft";

  return (
    <Shell title={detail ? `Report ${detail.report.period_start} → ${detail.report.period_end}` : "Report"}>
      <Breadcrumbs />

      {err && (
        <Card style={{ marginBottom: 14, borderLeft: "4px solid #DC2626" }}>
          <p style={{ margin: 0, color: "#DC2626", fontSize: 12 }}>{err}</p>
        </Card>
      )}

      {loading && !detail ? (
        <Card><p style={{ color: MUTED, fontSize: 12, margin: 0 }}>Loading…</p></Card>
      ) : !detail ? (
        <Card><p style={{ color: MUTED, fontSize: 12, margin: 0 }}>Report not found.</p></Card>
      ) : (
        <>
          {/* Header card: status + actions */}
          <Card style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <StatusPill status={detail.report.status} />
                <div style={{ fontSize: 22, fontWeight: 900, color: TEXT, marginTop: 8, letterSpacing: "-0.4px" }}>
                  {detail.report.period_start} → {detail.report.period_end}
                </div>
                <div style={{ fontSize: 11, color: LIGHT, fontFamily: "ui-monospace", marginTop: 2 }}>
                  {detail.report.id} · built {fmtDate(detail.report.created_at)}
                  {detail.report.finalized_at && ` · finalized ${fmtDate(detail.report.finalized_at)}`}
                </div>
                {detail.report.notes && (
                  <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: "#f8fafc", fontSize: 12, color: TEXT, border: `1px solid ${BORDER}` }}>
                    {detail.report.notes}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
                {isDraft && (
                  <button
                    onClick={finalize}
                    disabled={busy}
                    style={{ padding: "9px 16px", borderRadius: 10, background: ZP_GREEN, color: "#fff", border: "none", fontSize: 12, fontWeight: 800, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}
                  >
                    Finalize
                  </button>
                )}
                <ExportMenu busy={busy} onPick={exportAs} />
              </div>
            </div>
          </Card>

          {/* Totals */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 14 }}>
            <Metric label="Total USD" value={fmtUSD(detail.totals.usd)} sub={`${detail.totals.lines} lines`} color={ZP_GREEN} />
            <Metric label="GL accounts used" value={String(Object.keys(detail.totals.by_gl).length)} color={ZP_CYAN} />
            <Metric
              label="Manually categorized"
              value={String(allLines.filter((l) => l.manually_categorized).length)}
              sub="CFO overrides preserved"
              color={ZP_PURPLE}
            />
          </div>

          {/* Breakdown by GL */}
          <Card style={{ marginBottom: 14 }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 800, color: TEXT }}>By GL account</h3>
            {Object.keys(detail.totals.by_gl).length === 0 ? (
              <p style={{ color: MUTED, fontSize: 12, margin: 0 }}>No lines categorized yet.</p>
            ) : (
              <div style={{ display: "grid", gap: 4 }}>
                {Object.entries(detail.totals.by_gl)
                  .sort(([, a], [, b]) => b - a)
                  .map(([glId, cents]) => {
                    const g = glById.get(glId);
                    const pct = detail.totals.usd > 0 ? (cents / detail.totals.usd) * 100 : 0;
                    return (
                      <div key={glId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${ROW_SEP}`, fontSize: 12 }}>
                        <span>
                          {g ? (
                            <>
                              <span style={{ fontFamily: "ui-monospace", fontWeight: 700, color: TEXT }}>{g.code}</span>
                              {" · "}
                              <span style={{ color: TEXT }}>{g.name}</span>
                            </>
                          ) : (
                            <span style={{ color: MUTED, fontStyle: "italic" }}>Uncategorized</span>
                          )}
                        </span>
                        <span style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
                          <span style={{ color: LIGHT, fontSize: 11 }}>{pct.toFixed(1)}%</span>
                          <span style={{ fontWeight: 700, color: TEXT, minWidth: 90, textAlign: "right" }}>{fmtUSD(cents)}</span>
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </Card>

          {/* Lines */}
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: TEXT }}>Lines</h3>
              <span style={{ fontSize: 11, color: MUTED }}>{allLines.length} loaded · {detail.totals.lines} total</span>
            </div>
            {allLines.length === 0 ? (
              <p style={{ color: MUTED, fontSize: 12, margin: 0 }}>No lines in this report.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: MUTED, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    <th style={{ padding: "6px 4px" }}>Memo</th>
                    <th style={{ padding: "6px 4px" }}>GL</th>
                    <th style={{ padding: "6px 4px", textAlign: "right" }}>Amount</th>
                    <th style={{ padding: "6px 4px", textAlign: "right" }}>USD</th>
                    <th style={{ padding: "6px 4px" }}>Source</th>
                    {isDraft && <th style={{ padding: "6px 4px", textAlign: "right" }}></th>}
                  </tr>
                </thead>
                <tbody>
                  {allLines.map((l) => {
                    const g = l.gl_account_id ? glById.get(l.gl_account_id) : null;
                    return (
                      <tr key={l.id} style={{ borderTop: `1px solid ${ROW_SEP}` }}>
                        <td style={{ padding: "8px 4px", color: TEXT, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {l.memo ?? <span style={{ color: LIGHT }}>—</span>}
                        </td>
                        <td style={{ padding: "8px 4px" }}>
                          {g ? (
                            <>
                              <span style={{ fontFamily: "ui-monospace", fontWeight: 700, color: TEXT }}>{g.code}</span>
                              <span style={{ color: MUTED }}> · {g.name}</span>
                            </>
                          ) : (
                            <span style={{ color: LIGHT, fontStyle: "italic" }}>Uncategorized</span>
                          )}
                          {l.manually_categorized && (
                            <span style={{ marginLeft: 6, fontSize: 9, padding: "1px 6px", borderRadius: 999, background: "rgba(123,79,191,0.12)", color: ZP_PURPLE, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                              manual
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "8px 4px", textAlign: "right", color: MUTED }}>
                          {(l.amount_cents / 100).toFixed(2)} {l.currency}
                        </td>
                        <td style={{ padding: "8px 4px", textAlign: "right", color: TEXT, fontWeight: 700 }}>
                          {fmtUSD(l.converted_usd_cents)}
                        </td>
                        <td style={{ padding: "8px 4px", color: LIGHT, fontSize: 10 }}>
                          {l.card_auth_id ? "card" : l.transaction_id ? "api" : "—"}
                        </td>
                        {isDraft && (
                          <td style={{ padding: "8px 4px", textAlign: "right" }}>
                            <button
                              onClick={() => setRecatLine(l)}
                              disabled={busy}
                              style={{ padding: "3px 10px", borderRadius: 8, background: "transparent", border: `1px solid ${ZP_CYAN}`, color: "#0891B2", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                            >
                              Re-categorize
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {cursor && (
              <div style={{ marginTop: 14, textAlign: "center" }}>
                <button
                  onClick={() => void load(cursor)}
                  disabled={loading}
                  style={{ padding: "8px 18px", borderRadius: 10, background: "transparent", border: `1px solid ${BORDER}`, color: TEXT, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  {loading ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </Card>
        </>
      )}

      {recatLine && (
        <RecatModal
          line={recatLine}
          gls={gls}
          onCancel={() => setRecatLine(null)}
          onSave={(glId) => void recategorize(glId)}
          busy={busy}
        />
      )}
    </Shell>
  );
}

function RecatModal({
  line, gls, onCancel, onSave, busy,
}: {
  line: Line;
  gls: GlAccount[];
  onCancel: () => void;
  onSave: (glId: string) => void;
  busy: boolean;
}) {
  const [chosen, setChosen] = useState("");
  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 100, padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 14, padding: 24, maxWidth: 440, width: "100%", boxShadow: "0 10px 30px rgba(15,23,42,0.2)" }}
      >
        <h2 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 800, color: TEXT }}>Re-categorize line</h2>
        <p style={{ margin: "0 0 14px", fontSize: 12, color: MUTED, lineHeight: 1.5 }}>
          This sets <code>manually_categorized = true</code>. Future cron runs will skip this line.
        </p>
        <div style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: 8, fontSize: 12, color: TEXT, marginBottom: 14, border: `1px solid ${BORDER}` }}>
          <div style={{ fontWeight: 700 }}>{line.memo ?? <span style={{ color: LIGHT }}>—</span>}</div>
          <div style={{ color: MUTED, marginTop: 2 }}>
            {fmtUSD(line.converted_usd_cents)} · {(line.amount_cents / 100).toFixed(2)} {line.currency}
          </div>
        </div>
        <label style={{ fontSize: 11, color: MUTED, fontWeight: 700 }}>
          New GL account
          <select
            value={chosen}
            onChange={(e) => setChosen(e.target.value)}
            style={{ display: "block", width: "100%", marginTop: 4, padding: "8px 10px", fontSize: 13, border: `1px solid ${BORDER}`, borderRadius: 10, background: "#fff" }}
          >
            <option value="">Pick an account…</option>
            {gls.map((g) => <option key={g.id} value={g.id}>{g.code} · {g.name}</option>)}
          </select>
        </label>
        <div style={{ marginTop: 18, display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ padding: "8px 16px", borderRadius: 10, background: "transparent", border: `1px solid ${BORDER}`, color: TEXT, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            Cancel
          </button>
          <button
            onClick={() => chosen && onSave(chosen)}
            disabled={!chosen || busy}
            style={{ padding: "8px 16px", borderRadius: 10, background: ZP_GREEN, color: "#fff", border: "none", fontSize: 12, fontWeight: 800, cursor: chosen && !busy ? "pointer" : "default", opacity: chosen && !busy ? 1 : 0.5 }}
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ExportMenu({ onPick, busy }: { onPick: (f: "csv" | "quickbooks" | "xero" | "netsuite") => void; busy: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        style={{ padding: "9px 16px", borderRadius: 10, background: "transparent", border: `1px solid ${BORDER}`, color: TEXT, fontSize: 12, fontWeight: 800, cursor: "pointer" }}
      >
        Export ↓
      </button>
      {open && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 6px)", right: 0,
            background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12,
            boxShadow: "0 10px 30px rgba(15,23,42,0.15)", minWidth: 260, zIndex: 50,
            padding: 6,
          }}
        >
          {FORMATS.map((f) => (
            <button
              key={f.v}
              onClick={() => { setOpen(false); onPick(f.v); }}
              style={{ display: "block", width: "100%", padding: "9px 12px", borderRadius: 8, textAlign: "left", background: "transparent", border: "none", cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{f.label}</div>
              <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>{f.note}</div>
            </button>
          ))}
        </div>
      )}
    </div>
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
      <Link href="/agents/accounting/reports" style={{ color: MUTED, textDecoration: "none" }}>Reports</Link>
      {" · "}
      <span style={{ color: TEXT, fontWeight: 700 }}>Detail</span>
    </div>
  );
}
