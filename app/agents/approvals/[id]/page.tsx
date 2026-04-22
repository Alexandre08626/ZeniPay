// /agents/approvals/[id] — detail + approve/deny with TOTP step-up.

"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Shell, Card } from "@/components/agents/Shell";
import { apiFetch } from "../../_lib/session";
import {
  BORDER, ROW_SEP, TEXT, MUTED, LIGHT,
  ZP_GRAD, ZP_GREEN,
  fmtUSD, fmtDate,
} from "@/components/agents/theme";

interface ApprovalDetail {
  request: {
    id: string; status: string; expires_at: string;
    requested_amount_cents: number | null; requested_currency: string | null;
    requested_by_agent_id: string | null;
    context: { merchant?: string; merchant_category?: string; card_id?: string; required_signatures?: number };
    created_at: string; resolved_at: string | null; resolution_notes: string | null;
  };
  policy: { id: string; name: string; trigger_type: string; approver_type: string; timeout_seconds: number } | null;
  agent: { id: string; name: string } | null;
  signatures: Array<{ id: string; approver_user_id: string; decision: string; signed_at: string }>;
}

export default function ApprovalDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const router = useRouter();
  const [d, setD] = useState<ApprovalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"approve" | "deny" | null>(null);
  const [totp, setTotp] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [enrollStatus, setEnrollStatus] = useState<"unknown" | "enrolled" | "not_enrolled">("unknown");

  const load = async () => {
    setLoading(true);
    try {
      const r = await apiFetch<ApprovalDetail>(`/api/v1/agents/approvals/${id}`);
      setD(r);
    } finally { setLoading(false); }
  };
  useEffect(() => { if (id) void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  useEffect(() => {
    void apiFetch<{ enrolled: boolean }>("/api/v1/agents/approvers/status").then((r) => {
      setEnrollStatus(r.enrolled ? "enrolled" : "not_enrolled");
    }).catch(() => setEnrollStatus("unknown"));
  }, []);

  const submit = async () => {
    if (!mode) return;
    setErr(""); setSubmitting(true);
    try {
      await apiFetch(`/api/v1/agents/approvals/${id}/${mode}`, {
        method: "POST",
        body: JSON.stringify({ totp_code: totp, ...(mode === "deny" ? { reason: notes } : { notes: notes || undefined }) }),
      });
      setMode(null); setTotp(""); setNotes("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "failed");
    } finally { setSubmitting(false); }
  };

  if (loading && !d) return <Shell title="Approval"><p style={{ color: MUTED }}>Loading…</p></Shell>;
  if (!d) return <Shell title="Not found"><p>Request not found.</p></Shell>;

  const { request: req, policy, agent, signatures } = d;
  const requiredSigs = req.context.required_signatures ?? 1;
  const approvedSigs = signatures.filter((s) => s.decision === "approved").length;
  const ttlSec = Math.max(0, Math.round((new Date(req.expires_at).getTime() - Date.now()) / 1000));
  const canAct = req.status === "pending" && ttlSec > 0 && enrollStatus === "enrolled";

  return (
    <Shell title="Approval request">
      <div style={{ marginBottom: 12 }}>
        <Link href="/agents/approvals" style={{ fontSize: 12, color: MUTED, fontWeight: 700, textDecoration: "none" }}>
          ← Inbox
        </Link>
      </div>

      {enrollStatus === "not_enrolled" && (
        <Card style={{ marginBottom: 14, borderLeft: `4px solid #D97706`, background: "rgba(245,166,35,0.04)" }}>
          <p style={{ margin: 0, fontWeight: 700, color: "#92400E" }}>You&apos;re not enrolled as an approver yet.</p>
          <p style={{ margin: "4px 0 8px", fontSize: 13, color: MUTED }}>
            Set up a TOTP authenticator (Google Authenticator, 1Password, Authy) to sign approvals.
          </p>
          <Link href="/agents/settings/profile" style={{ background: ZP_GRAD, color: "#fff", padding: "8px 14px", borderRadius: 8, textDecoration: "none", fontWeight: 700, fontSize: 12, display: "inline-block" }}>
            Set up approver credentials →
          </Link>
        </Card>
      )}

      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: MUTED, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {req.requested_currency ?? "USD"} amount
            </div>
            <div style={{ fontSize: 40, fontWeight: 900, color: TEXT, letterSpacing: "-1px", lineHeight: 1 }}>
              {fmtUSD(req.requested_amount_cents ?? 0)}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: MUTED, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Status</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: TEXT }}>{req.status}</div>
          </div>
        </div>
        <div style={{ marginTop: 16, padding: 14, background: "#f8fafc", borderRadius: 10, border: `1px solid ${BORDER}` }}>
          <KV k="Merchant" v={req.context.merchant ?? "—"} />
          <KV k="MCC" v={req.context.merchant_category ?? "—"} />
          <KV k="Card" v={req.context.card_id ?? "—"} />
          <KV k="Agent" v={agent?.name ?? "—"} />
          <KV k="Policy" v={policy?.name ?? "—"} />
          <KV k="Trigger" v={policy?.trigger_type ?? "—"} />
          <KV k="Signatures" v={`${approvedSigs} / ${requiredSigs}`} />
          <KV k="Expires in" v={ttlSec > 60 ? `${Math.floor(ttlSec / 60)}m ${ttlSec % 60}s` : `${ttlSec}s`} />
          {req.resolved_at && <KV k="Resolved at" v={fmtDate(req.resolved_at)} />}
          {req.resolution_notes && <KV k="Notes" v={req.resolution_notes} />}
        </div>
      </Card>

      {signatures.length > 0 && (
        <Card style={{ marginBottom: 14, padding: 0 }}>
          <div style={{ padding: "12px 18px", borderBottom: `1px solid ${BORDER}` }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800 }}>Signatures collected</h3>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {signatures.map((s) => (
                <tr key={s.id} style={{ borderBottom: `1px solid ${ROW_SEP}` }}>
                  <td style={{ padding: "10px 16px", fontSize: 11, color: LIGHT, fontFamily: "ui-monospace" }}>{s.approver_user_id.slice(0, 8)}…</td>
                  <td style={{ padding: "10px 16px", fontSize: 12 }}>
                    <span style={{ fontWeight: 700, color: s.decision === "approved" ? "#16A34A" : "#DC2626" }}>
                      {s.decision === "approved" ? "✓ approved" : "✗ denied"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 16px", fontSize: 11, color: MUTED, textAlign: "right" }}>{fmtDate(s.signed_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {canAct && !mode && (
        <Card>
          <h3 style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 800 }}>Decide</h3>
          <p style={{ margin: "0 0 14px", fontSize: 12, color: MUTED }}>
            Both actions require your TOTP code to sign the decision cryptographically.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setMode("approve")}
              style={{ flex: 1, background: ZP_GRAD, color: "#fff", border: "none", padding: "12px", borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
              ✓ Approve
            </button>
            <button onClick={() => setMode("deny")}
              style={{ flex: 1, background: "rgba(220,38,38,0.08)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.35)", padding: "12px", borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
              ✗ Deny
            </button>
          </div>
        </Card>
      )}

      {mode && (
        <Card style={{ borderLeft: `4px solid ${mode === "approve" ? ZP_GREEN : "#DC2626"}` }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 800 }}>
            {mode === "approve" ? "Approve this request" : "Deny this request"}
          </h3>
          <label style={{ fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: "0.08em" }}>
            6-DIGIT TOTP CODE
          </label>
          <input
            value={totp}
            onChange={(e) => setTotp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
            inputMode="numeric"
            autoComplete="one-time-code"
            style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${BORDER}`, fontSize: 18, outline: "none", margin: "6px 0 10px", boxSizing: "border-box", background: "#f8fafc", color: TEXT, letterSpacing: "0.3em", fontFamily: "ui-monospace" }}
          />
          <label style={{ fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: "0.08em" }}>
            {mode === "approve" ? "NOTES (optional)" : "REASON"}
          </label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={mode === "approve" ? "" : "Why deny?"}
            style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: `1.5px solid ${BORDER}`, fontSize: 14, outline: "none", margin: "6px 0 6px", boxSizing: "border-box", background: "#f8fafc", color: TEXT }}
          />
          {err && <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(220,38,38,0.08)", color: "#DC2626", fontSize: 12, fontWeight: 700, borderRadius: 8 }}>{err}</div>}
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button onClick={() => { setMode(null); setTotp(""); setErr(""); }}
              style={{ flex: 1, background: "#f1f5f9", color: MUTED, border: `1px solid ${BORDER}`, padding: "10px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              Cancel
            </button>
            <button onClick={submit} disabled={submitting || totp.length !== 6}
              style={{ flex: 1.4, background: submitting || totp.length !== 6 ? "#94a3b8" : (mode === "approve" ? ZP_GRAD : "#DC2626"), color: "#fff", border: "none", padding: "10px", borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: submitting ? "not-allowed" : "pointer" }}>
              {submitting ? "Signing…" : mode === "approve" ? "Sign approval" : "Sign denial"}
            </button>
          </div>
        </Card>
      )}

      {!canAct && req.status === "pending" && ttlSec === 0 && (
        <Card><p style={{ color: "#DC2626", fontWeight: 700, margin: 0 }}>This request has expired. The agent must retry — a new request will be created.</p></Card>
      )}

      <button onClick={() => router.refresh()} style={{ display: "none" }}>refresh</button>
    </Shell>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${ROW_SEP}` }}>
      <span style={{ color: MUTED, fontSize: 12, fontWeight: 700 }}>{k}</span>
      <span style={{ color: TEXT, fontSize: 12, fontWeight: 700, maxWidth: 360, textAlign: "right", wordBreak: "break-word" }}>{v}</span>
    </div>
  );
}
