"use client";
import { useEffect, useRef, useState, useCallback } from "react";

interface Props { applicationId: string; environment: "sandbox" | "live"; onTokenize: (t: { id: string; brand: string; last4: string }) => void; onError: (e: string) => void; disabled?: boolean; }

export default function FinixTokenForm({ applicationId, environment, onTokenize, onError, disabled = false }: Props) {
  const formRef = useRef<HTMLDivElement>(null);
  const finixRef = useRef<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [sdkOk, setSdkOk] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (document.getElementById("finix-js-sdk")) { setSdkOk(true); return; }
    const s = document.createElement("script");
    s.id = "finix-js-sdk"; s.src = "https://js.finixpymnts.com/finix.js"; s.async = true;
    s.onload = () => setSdkOk(true); s.onerror = () => onError("Failed to load Finix.js SDK");
    document.head.appendChild(s);
  }, [onError]);

  useEffect(() => {
    if (!sdkOk || !formRef.current) return;
    try {
      const F = (window as unknown as Record<string, unknown>).Finix as { CardTokenForm: (id: string, o: unknown) => unknown };
      if (!F?.CardTokenForm) { onError("Finix SDK not available"); return; }
      finixRef.current = F.CardTokenForm("finix-form", {
        applicationId, environment, onLoad: () => setLoading(false), onError: (e: unknown) => onError(String(e)),
        styles: { default: { color: "#0f172a", fontSize: "16px", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }, focus: { borderColor: "#2DBE60" }, error: { borderColor: "#DC2626" } },
      });
    } catch (e) { onError("Init failed: " + e); }
  }, [sdkOk, applicationId, environment, onError]);

  const submit = useCallback(async () => {
    if (!finixRef.current || disabled) return;
    const f = finixRef.current as { submit: (e: string, a: string, cb: (err: unknown, res: unknown) => void) => void };
    f.submit(environment, applicationId, (err, res) => {
      if (err) { onError(String(err)); return; }
      const r = res as { data?: { id?: string; brand?: string; last_four?: string } };
      if (r?.data?.id) onTokenize({ id: r.data.id, brand: r.data.brand || "unknown", last4: r.data.last_four || "****" });
      else onError("No token returned");
    });
  }, [disabled, environment, applicationId, onTokenize, onError]);

  return (
    <div style={{ width: "100%" }}>
      <div ref={formRef} id="finix-form" style={{ minHeight: 200, opacity: loading ? 0.5 : 1 }} />
      {loading && <div style={{ textAlign: "center", padding: 20, color: "#64748b", fontSize: 14 }}>Loading secure payment form...</div>}
      <button onClick={submit} disabled={disabled || loading} style={{ marginTop: 16, width: "100%", padding: "14px 24px", background: disabled ? "#94a3b8" : "linear-gradient(135deg, #2DBE60 0%, #15B8C9 100%)", color: "#fff", border: "none", borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer" }}>{disabled ? "Processing..." : "Tokenize Card"}</button>
    </div>
  );
}