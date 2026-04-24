// PR 14 Part 3 — KYB status banner on /app/overview.
// Shows a warning for pending_kyb (with a "Submit documents" CTA) or a
// rejection message with the reason. No banner for active / sandbox
// merchants so the default dashboard stays clean.

"use client";

import React, { useEffect, useState } from "react";
import { Clock, AlertCircle, X } from "lucide-react";
import zp from "@/lib/design-system/zenipay-brand";

interface MerchantStatus {
  id: string;
  status: string;
  kyb_rejection_reason: string | null;
}

export function KybBanner({ merchantId }: { merchantId: string }) {
  const [merchant, setMerchant] = useState<MerchantStatus | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    if (!merchantId) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/v1/merchant/kyb/status?merchant_id=${encodeURIComponent(merchantId)}`).then((r) => r.json());
        if (!cancelled) setMerchant(r.merchant ?? null);
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, [merchantId]);

  if (!merchant) return null;
  if (merchant.status === "pending_kyb") {
    return (
      <>
        <div style={{
          marginBottom: 16, padding: "14px 18px", borderRadius: 14,
          background: "rgba(245,166,35,0.08)", border: "1px solid rgba(245,166,35,0.3)",
          display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
        }}>
          <Clock size={20} color="#D97706" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontSize: 14, fontWeight: zp.weight.semibold, color: zp.text.primary }}>
              Your account is pending verification (1-2 business days).
            </div>
            <div style={{ fontSize: 12, color: zp.text.muted, marginTop: 2 }}>
              Payment links, payouts, and high-value transfers are disabled until verification is complete.
            </div>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            style={{
              background: zp.gradient.main, color: "#fff", border: "none",
              padding: "9px 16px", borderRadius: 10,
              fontSize: 13, fontWeight: zp.weight.semibold, cursor: "pointer",
            }}
          >Upload documents</button>
        </div>
        {showUpload && <KybUploadModal merchantId={merchantId} onClose={() => setShowUpload(false)} />}
      </>
    );
  }
  if (merchant.status === "rejected") {
    return (
      <div style={{
        marginBottom: 16, padding: "14px 18px", borderRadius: 14,
        background: zp.semantic.dangerBg, border: `1px solid ${zp.semantic.danger}44`,
        display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
      }}>
        <AlertCircle size={20} color={zp.semantic.danger} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontSize: 14, fontWeight: zp.weight.semibold, color: zp.semantic.danger }}>
            Account verification was rejected.
          </div>
          <div style={{ fontSize: 12, color: zp.text.muted, marginTop: 2 }}>
            {merchant.kyb_rejection_reason || "No reason provided."}  Contact{" "}
            <a href="mailto:info@zeniva.ca" style={{ color: zp.semantic.danger, fontWeight: zp.weight.semibold }}>info@zeniva.ca</a>.
          </div>
        </div>
      </div>
    );
  }
  return null;
}

function KybUploadModal({ merchantId, onClose }: { merchantId: string; onClose: () => void }) {
  const [docType, setDocType] = useState<"government_id" | "business_registration" | "bank_statement" | "proof_of_address">("government_id");
  const [filename, setFilename] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setErr(null);
    if (!filename.trim()) { setErr("Name the document."); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/v1/merchant/kyb/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchant_id: merchantId, document_type: docType, filename: filename.trim(), notes }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || data?.error) { setErr(data?.error?.message ?? data?.error ?? "Submit failed."); return; }
      setDone(true);
    } finally { setSaving(false); }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: zp.surface.overlay, backdropFilter: "blur(4px)",
        zIndex: zp.zIndex.modal, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 460, background: "#fff",
          borderRadius: 14, padding: 24, boxShadow: zp.elevation.lg,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: zp.weight.semibold, color: zp.text.primary }}>
            {done ? "Document submitted" : "Submit KYB document"}
          </h3>
          <button onClick={onClose} aria-label="Close" style={{
            background: zp.surface.bg3, border: "none", borderRadius: 8, width: 30, height: 30,
            cursor: "pointer", color: zp.text.primary,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}><X size={16} /></button>
        </div>

        {done ? (
          <div>
            <p style={{ fontSize: 13, color: zp.text.muted, margin: "0 0 14px" }}>
              We’ll review this within 1-2 business days and email you when your account is active.
            </p>
            <button onClick={onClose} style={{
              width: "100%", background: zp.gradient.main, color: "#fff", border: "none",
              padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: zp.weight.semibold, cursor: "pointer",
            }}>Got it</button>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 12, color: zp.text.muted, margin: "0 0 12px" }}>
              File upload to private Supabase Storage is coming in the next release. For now, tell us the document name + type and our ops team will reach out to collect the file securely.
            </p>

            <label style={{ display: "block", fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 5 }}>Document type</label>
            <select value={docType} onChange={(e) => setDocType(e.target.value as typeof docType)} style={input}>
              <option value="government_id">Government ID</option>
              <option value="business_registration">Business registration</option>
              <option value="bank_statement">Bank statement</option>
              <option value="proof_of_address">Proof of address</option>
            </select>

            <label style={{ display: "block", fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 5, marginTop: 12 }}>Filename</label>
            <input value={filename} onChange={(e) => setFilename(e.target.value)} placeholder="e.g. passport.pdf" style={input} />

            <label style={{ display: "block", fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 5, marginTop: 12 }}>Notes (optional)</label>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...input, resize: "vertical", fontFamily: "inherit" }} />

            {err && (
              <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 8, background: zp.semantic.dangerBg, color: zp.semantic.danger, fontSize: 12, fontWeight: zp.weight.semibold }}>{err}</div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <button onClick={onClose} disabled={saving} style={{ background: "transparent", border: "none", color: zp.text.muted, padding: "9px 14px", fontSize: 12, fontWeight: zp.weight.semibold, cursor: "pointer" }}>Cancel</button>
              <button onClick={submit} disabled={saving} style={{
                background: zp.gradient.main, color: "#fff", border: "none",
                padding: "9px 18px", borderRadius: 10, fontSize: 12, fontWeight: zp.weight.semibold,
                cursor: saving ? "wait" : "pointer", opacity: saving ? 0.6 : 1,
              }}>{saving ? "Submitting…" : "Submit"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const input: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 10,
  border: `1.5px solid ${zp.surface.border}`, fontSize: 13, outline: "none",
  boxSizing: "border-box", background: zp.surface.bg2, color: zp.text.primary,
};
