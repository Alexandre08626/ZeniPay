// /agents/settings/profile — approver credential enrollment (TOTP only in PR 3).

"use client";

import React, { useEffect, useState } from "react";
import { Shell, Card } from "@/components/agents/Shell";
import { apiFetch, readSession } from "../../_lib/session";
import {
  BORDER, TEXT, MUTED, LIGHT,
  ZP_GRAD, ZP_GREEN,
  fmtDate,
} from "@/components/agents/theme";

export default function ApproverEnrollmentPage() {
  const [status, setStatus] = useState<{ enrolled: boolean; rotated_at: string | null; created_at: string | null } | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [qrUri, setQrUri] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const loadStatus = async () => {
    const s = await apiFetch<{ enrolled: boolean; rotated_at: string | null; created_at: string | null }>("/api/v1/agents/approvers/status");
    setStatus(s);
  };
  useEffect(() => { void loadStatus(); }, []);

  const enroll = async () => {
    setErr(""); setBusy(true); setVerified(false);
    try {
      const email = readSession()?.email;
      const r = await apiFetch<{ secret: string; provisioning_uri: string }>("/api/v1/agents/approvers/enroll", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSecret(r.secret); setQrUri(r.provisioning_uri);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "failed");
    } finally { setBusy(false); }
  };

  const verify = async () => {
    setErr(""); setBusy(true);
    try {
      await apiFetch("/api/v1/agents/approvers/verify", {
        method: "POST",
        body: JSON.stringify({ code: verifyCode }),
      });
      setVerified(true);
      setSecret(null); setQrUri(null); setVerifyCode("");
      await loadStatus();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "invalid code");
    } finally { setBusy(false); }
  };

  const qrImgSrc = qrUri ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrUri)}` : null;

  return (
    <Shell title="Approver setup">
      <Card style={{ marginBottom: 14 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 800 }}>TOTP authenticator</h3>
        <p style={{ margin: "0 0 12px", fontSize: 12, color: MUTED }}>
          A time-based one-time password (RFC 6238) app is required to sign approvals. Works with
          Google Authenticator, 1Password, Authy, Bitwarden, Apple Passwords — anything that scans an
          <code style={{ margin: "0 4px" }}>otpauth://</code> URL.
        </p>

        {status?.enrolled ? (
          <div style={{ padding: 12, borderRadius: 10, background: "rgba(45,190,96,0.08)", border: "1px solid rgba(45,190,96,0.25)" }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#16A34A" }}>
              ✓ Enrolled
            </div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
              Last activity {status.rotated_at ? fmtDate(status.rotated_at) : "—"}{" "}
              · enrolled {status.created_at ? fmtDate(status.created_at) : "—"}
            </div>
            <button
              onClick={enroll}
              disabled={busy}
              style={{ marginTop: 10, background: "rgba(220,38,38,0.08)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.3)", padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer" }}
            >
              Rotate TOTP secret
            </button>
          </div>
        ) : !secret ? (
          <button onClick={enroll} disabled={busy}
            style={{ background: ZP_GRAD, color: "#fff", border: "none", padding: "10px 18px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: busy ? "not-allowed" : "pointer" }}>
            {busy ? "Provisioning…" : "Set up TOTP authenticator"}
          </button>
        ) : (
          <div>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
              {qrImgSrc && (
                <img src={qrImgSrc} width={220} height={220} alt="TOTP QR code"
                  style={{ borderRadius: 12, border: `1px solid ${BORDER}` }} />
              )}
              <div style={{ flex: 1, minWidth: 220 }}>
                <p style={{ margin: 0, fontSize: 12, color: MUTED }}>
                  Scan the QR code with your authenticator app, or paste this secret manually:
                </p>
                <div style={{ marginTop: 10, padding: "10px 14px", background: "#0f172a", color: "#e5e7eb", fontFamily: "ui-monospace", fontSize: 13, borderRadius: 8, wordBreak: "break-all", letterSpacing: "0.08em" }}>
                  {secret}
                </div>
                <p style={{ margin: "10px 0 0", fontSize: 11, color: "#D97706", fontWeight: 700 }}>
                  ⚠ This secret is shown once. Save it now.
                </p>
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <label style={{ fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: "0.08em" }}>
                ENTER THE FIRST 6-DIGIT CODE FROM YOUR APP
              </label>
              <input
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                inputMode="numeric"
                autoComplete="one-time-code"
                style={{ width: 200, padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${BORDER}`, fontSize: 20, outline: "none", margin: "6px 0 10px", boxSizing: "border-box", background: "#f8fafc", color: TEXT, letterSpacing: "0.3em", fontFamily: "ui-monospace" }}
              />
              <div>
                <button onClick={verify} disabled={busy || verifyCode.length !== 6}
                  style={{ background: busy || verifyCode.length !== 6 ? "#94a3b8" : ZP_GRAD, color: "#fff", border: "none", padding: "10px 18px", borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: busy ? "not-allowed" : "pointer" }}>
                  {busy ? "Verifying…" : "Activate"}
                </button>
              </div>
            </div>
          </div>
        )}

        {verified && (
          <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(45,190,96,0.08)", color: "#16A34A", fontSize: 13, fontWeight: 700, borderRadius: 8 }}>
            ✓ Authenticator activated. You can now sign approvals.
          </div>
        )}
        {err && (
          <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(220,38,38,0.08)", color: "#DC2626", fontSize: 13, fontWeight: 700, borderRadius: 8 }}>
            {err}
          </div>
        )}
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 800 }}>WebAuthn / Passkeys</h3>
        <p style={{ margin: 0, fontSize: 12, color: MUTED }}>
          Coming in Phase 4 — Touch ID / Face ID / YubiKey sign-off for high-value approvals.
          The schema already supports hardware credentials; only the client-side flow is deferred.
        </p>
      </Card>

      <p style={{ color: LIGHT, fontSize: 11, textAlign: "center", marginTop: 12 }}>
        Your TOTP seed is encrypted at rest in Supabase Vault (AES-256-GCM). Only your browser sees the plaintext, and only once.
      </p>
    </Shell>
  );
}
