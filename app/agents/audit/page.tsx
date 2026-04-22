// /agents/audit — SOC2 export wizard. Step 1: scope → Step 2: date range
// → Step 3: options → Generate. The download happens via a direct
// window.location → the API route streams NDJSON. After download kicks
// off, the past-exports history refreshes so the new run is visible.

"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Shell, Card } from "@/components/agents/Shell";
import { apiFetch, readSession } from "../_lib/session";
import {
  BORDER, ROW_SEP, TEXT, MUTED, LIGHT,
  ZP_GREEN, ZP_CYAN,
  fmtDate,
} from "@/components/agents/theme";

type Scope = "organization" | "agent" | "card";

interface ExportRun {
  id: string;
  scope: string;
  scope_ref: string | null;
  window_start: string;
  window_end: string;
  row_count: number;
  bytes_written: number;
  merkle_root_hex: string;
  key_id: string;
  include_merkle_proofs: boolean;
  created_at: string;
}

export default function AuditExportWizard() {
  const [scope, setScope] = useState<Scope>("organization");
  const [scopeRef, setScopeRef] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [includeProofs, setIncludeProofs] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [history, setHistory] = useState<ExportRun[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const r = await apiFetch<{ exports: ExportRun[] }>("/api/v1/agents/audit/export/history");
      setHistory(r.exports);
    } finally { setLoadingHistory(false); }
  }, []);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  // Default: last 7 days UTC.
  useEffect(() => {
    if (!start || !end) {
      const now = new Date();
      const sevenAgo = new Date(now.getTime() - 7 * 86_400_000);
      setStart(sevenAgo.toISOString().slice(0, 16));
      setEnd(now.toISOString().slice(0, 16));
    }
  }, [start, end]);

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const startIso = new Date(start).toISOString();
      const endIso   = new Date(end).toISOString();
      // Use a direct fetch for the streaming download (apiFetch would
      // buffer the JSON response).
      const session = readSession();
      if (!session) throw new Error("session missing — please sign in");

      const res = await fetch("/api/v1/agents/audit/export", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-zp-agents-org": session.organizationId,
          ...(session.userId ? { "x-zp-agents-user": session.userId } : {}),
        },
        body: JSON.stringify({
          start: startIso,
          end: endIso,
          scope,
          scope_ref: scope === "organization" ? null : scopeRef,
          include_merkle_proofs: includeProofs,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text}`);
      }
      // Download blob.
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = res.headers.get("content-disposition") ?? "";
      const fname = /filename="([^"]+)"/.exec(cd)?.[1] ?? `zenipay_audit_${Date.now()}.ndjson`;
      a.download = fname;
      a.click();
      URL.revokeObjectURL(url);
      await loadHistory();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  return (
    <Shell title="Audit export">
      <Card style={{ marginBottom: 14 }}>
        <p style={{ margin: 0, fontSize: 12, color: MUTED, lineHeight: 1.55 }}>
          Generate a signed, tamper-evident export of the audit log for a SOC2 auditor.
          Each export is an NDJSON file containing a header, every audit entry, an optional
          Merkle-proof block, and a signed trailer. The trailer is signed with our Ed25519 audit key —
          the public key is served at{" "}
          <Link href="/.well-known/audit-signing-key.pub" style={{ color: ZP_GREEN, fontWeight: 700, textDecoration: "none" }} target="_blank" rel="noopener">
            /.well-known/audit-signing-key.pub
          </Link>
          . The verification procedure is documented in <code>docs/agents/AUDITOR_GUIDE.md</code>.
        </p>
      </Card>

      {err && (
        <Card style={{ marginBottom: 14, borderLeft: "4px solid #DC2626" }}>
          <p style={{ margin: 0, color: "#DC2626", fontSize: 12 }}>{err}</p>
        </Card>
      )}

      <Card style={{ marginBottom: 20 }}>
        <form onSubmit={generate}>
          <h3 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 800, color: TEXT, letterSpacing: "-0.2px" }}>Scope</h3>
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr 1fr", marginBottom: 16 }}>
            <ScopeOption v="organization" label="Organization" desc="All activity for your org" current={scope} onChange={setScope} />
            <ScopeOption v="agent" label="Single agent" desc="Filter by agent_id" current={scope} onChange={setScope} />
            <ScopeOption v="card" label="Single card" desc="Filter by card_id" current={scope} onChange={setScope} />
          </div>
          {(scope === "agent" || scope === "card") && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: MUTED, fontWeight: 700 }}>
                {scope === "agent" ? "agent_id" : "card_id"}
                <input
                  required
                  value={scopeRef}
                  onChange={(e) => setScopeRef(e.target.value)}
                  placeholder={scope === "agent" ? "agt_…" : "crd_…"}
                  style={{ display: "block", width: "100%", marginTop: 4, padding: "8px 12px", fontSize: 13, border: `1px solid ${BORDER}`, borderRadius: 10, fontFamily: "ui-monospace" }}
                />
              </label>
            </div>
          )}

          <h3 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 800, color: TEXT }}>Window</h3>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr", marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: MUTED, fontWeight: 700 }}>
              Start (UTC)
              <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required style={{ display: "block", width: "100%", marginTop: 4, padding: "8px 12px", fontSize: 13, border: `1px solid ${BORDER}`, borderRadius: 10 }} />
            </label>
            <label style={{ fontSize: 11, color: MUTED, fontWeight: 700 }}>
              End (UTC)
              <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} required style={{ display: "block", width: "100%", marginTop: 4, padding: "8px 12px", fontSize: 13, border: `1px solid ${BORDER}`, borderRadius: 10 }} />
            </label>
          </div>

          <h3 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 800, color: TEXT }}>Options</h3>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 10, border: `1px solid ${BORDER}`, background: includeProofs ? "rgba(45,190,96,0.05)" : "#fff", cursor: "pointer", marginBottom: 20 }}>
            <input type="checkbox" checked={includeProofs} onChange={(e) => setIncludeProofs(e.target.checked)} style={{ accentColor: ZP_GREEN, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>Include Merkle proofs per row</div>
              <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
                Lets auditors verify a single row without rehashing the whole log.
                Doubles file size; skip for quick exports.
              </div>
            </div>
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" disabled={busy} style={{ padding: "10px 20px", borderRadius: 10, background: ZP_GREEN, color: "#fff", border: "none", fontSize: 12, fontWeight: 800, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>
              {busy ? "Generating + downloading…" : "Generate + download"}
            </button>
          </div>
        </form>
      </Card>

      <Card>
        <h3 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 800, color: TEXT }}>Past exports</h3>
        {loadingHistory ? (
          <p style={{ color: MUTED, fontSize: 12, margin: 0 }}>Loading…</p>
        ) : history.length === 0 ? (
          <p style={{ color: MUTED, fontSize: 12, margin: 0 }}>No exports yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ textAlign: "left", color: MUTED, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                <th style={{ padding: "6px 4px" }}>When</th>
                <th style={{ padding: "6px 4px" }}>Scope</th>
                <th style={{ padding: "6px 4px" }}>Window</th>
                <th style={{ padding: "6px 4px", textAlign: "right" }}>Rows</th>
                <th style={{ padding: "6px 4px", textAlign: "right" }}>Bytes</th>
                <th style={{ padding: "6px 4px" }}>Merkle root</th>
                <th style={{ padding: "6px 4px" }}>Key</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} style={{ borderTop: `1px solid ${ROW_SEP}` }}>
                  <td style={{ padding: "8px 4px", color: MUTED }}>{fmtDate(h.created_at)}</td>
                  <td style={{ padding: "8px 4px", color: TEXT }}>
                    {h.scope}{h.scope_ref && <span style={{ color: MUTED, fontSize: 11 }}> · {h.scope_ref.slice(0, 10)}…</span>}
                  </td>
                  <td style={{ padding: "8px 4px", color: MUTED, fontSize: 11 }}>
                    {h.window_start.slice(0, 10)} → {h.window_end.slice(0, 10)}
                  </td>
                  <td style={{ padding: "8px 4px", textAlign: "right", color: TEXT }}>{h.row_count.toLocaleString()}</td>
                  <td style={{ padding: "8px 4px", textAlign: "right", color: MUTED }}>{formatBytes(h.bytes_written)}</td>
                  <td style={{ padding: "8px 4px", fontFamily: "ui-monospace", color: LIGHT, fontSize: 10 }}>
                    {h.merkle_root_hex.slice(0, 12)}…
                  </td>
                  <td style={{ padding: "8px 4px", color: MUTED, fontFamily: "ui-monospace", fontSize: 11 }}>{h.key_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </Shell>
  );
}

function ScopeOption({ v, label, desc, current, onChange }: { v: Scope; label: string; desc: string; current: Scope; onChange: (s: Scope) => void }) {
  const active = v === current;
  return (
    <label style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px", borderRadius: 10, border: `1px solid ${active ? ZP_GREEN : BORDER}`, background: active ? "rgba(45,190,96,0.05)" : "#fff", cursor: "pointer" }}>
      <input type="radio" name="scope" checked={active} onChange={() => onChange(v)} style={{ accentColor: ZP_GREEN, marginTop: 2 }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{label}</div>
        <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{desc}</div>
      </div>
    </label>
  );
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

void ZP_CYAN;
