"use client";
import React, { useState } from "react";

const ZP_GREEN = "#2DBE60";
const ZP_GRAD = "linear-gradient(135deg, #2DBE60 0%, #15B8C9 45%, #7B4FBF 100%)";
const PAGE_BG = "#f0f4f8"; const CARD_BG = "#ffffff"; const BORDER = "#e2e8f0";
const TEXT = "#0f172a"; const MUTED = "#64748b";

interface StepResult { status: string; details?: Record<string, unknown>; error?: string; }
interface Report { all_passed: boolean; duration_ms: number; timestamp: string; steps: Record<string, StepResult>; }

function Badge({ s }: { s: string }) {
  const c = s === "PASS" ? ZP_GREEN : s === "FAIL" ? "#ef4444" : s === "SKIP" ? "#eab308" : "#94a3b8";
  return <span style={{ padding: "2px 10px", borderRadius: 9999, fontSize: 12, fontWeight: 700, color: "#fff", background: c }}>{s}</span>;
}

function Step({ name, r }: { name: string; r: StepResult }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: CARD_BG, border: "1px solid " + BORDER, borderRadius: 12, padding: "16px 20px", marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setOpen(!open)}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 14, color: MUTED }}>{open ? "▼" : "▶"}</span>
          <span style={{ fontWeight: 600, color: TEXT, fontSize: 15 }}>{name}</span>
        </div>
        <Badge s={r.status} />
      </div>
      {open && <div style={{ marginTop: 12 }}>
        {r.error && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 8 }}>Error: {r.error}</div>}
        {r.details && <pre style={{ background: PAGE_BG, border: "1px solid " + BORDER, borderRadius: 8, padding: 12, fontSize: 12, color: TEXT, overflow: "auto", maxHeight: 300 }}>{JSON.stringify(r.details, null, 2)}</pre>}
      </div>}
    </div>
  );
}

export default function CertificationPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const run = async () => { setLoading(true); setReport(null); try { const r = await fetch("/api/finix/test-certification"); setReport(await r.json()); } catch (e) { console.error(e); } finally { setLoading(false); } };
  const copy = async () => { if (!report) return; await navigator.clipboard.writeText(JSON.stringify(report, null, 2)); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div style={{ minHeight: "100vh", background: PAGE_BG, padding: "40px 20px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, background: ZP_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 8 }}>Finix Sandbox Certification</h1>
        <p style={{ color: MUTED, fontSize: 14, marginBottom: 24 }}>Run all 6 certification steps against the Finix sandbox.</p>
        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          <button onClick={run} disabled={loading} style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: loading ? MUTED : ZP_GREEN, color: "#fff", fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer" }}>{loading ? "Running..." : "Run All Tests"}</button>
          {report && <button onClick={copy} style={{ padding: "10px 24px", borderRadius: 8, border: "1px solid " + BORDER, background: CARD_BG, color: TEXT, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>{copied ? "Copied!" : "Copy Report JSON"}</button>}
        </div>
        {loading && <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}><div style={{ width: 24, height: 24, border: "3px solid " + BORDER, borderTopColor: ZP_GREEN, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /><span style={{ color: MUTED, fontSize: 14 }}>Running certification tests...</span><style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style></div>}
        {report && <div style={{ background: report.all_passed ? ZP_GREEN : "#ef4444", color: "#fff", borderRadius: 12, padding: "16px 20px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontWeight: 700, fontSize: 16 }}>{report.all_passed ? "ALL TESTS PASSED" : "SOME TESTS FAILED"}</span><span style={{ fontSize: 13, opacity: 0.9 }}>{report.duration_ms}ms | {report.timestamp}</span></div>}
        {report && Object.entries(report.steps).map(([name, r]) => <Step key={name} name={name} r={r as StepResult} />)}
      </div>
    </div>
  );
}