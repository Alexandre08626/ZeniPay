"use client";
import { useState, useEffect } from "react";
import FinixTokenForm from "./FinixTokenForm";

interface Props { amount: number; currency?: string; description?: string; onSuccess?: (r: Record<string, unknown>) => void; onError?: (e: string) => void; }

export default function PaymentForm({ amount, currency = "USD", description, onSuccess, onError }: Props) {
  const [cfg, setCfg] = useState<{ applicationId: string; environment: "sandbox" | "live" } | null>(null);
  const [status, setStatus] = useState<"idle" | "charging" | "success" | "error">("idle");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => { fetch("/api/finix/tokenize").then(r => r.json()).then(setCfg).catch(() => setErr("Failed to load config")); }, []);
  const onToken = async (t: { id: string }) => {
    setStatus("charging");
    try {
      const r = await fetch("/api/finix/charge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ instrumentId: t.id, amountCents: Math.round(amount * 100), currency, description }) });
      const d = await r.json();
      if (d.success) { setStatus("success"); setResult(d); onSuccess?.(d); }
      else { setStatus("error"); setErr(d.error || "Payment failed"); onError?.(d.error || "Failed"); }
    } catch (e) { setStatus("error"); setErr(String(e)); onError?.(String(e)); }
  };
  if (!cfg) return <div style={{ padding: 20, textAlign: "center", color: "#64748b" }}>Loading...</div>;
  if (status === "success" && result) return <div style={{ padding: 24, textAlign: "center" }}><div style={{ fontSize: 48 }}>&#10003;</div><h3 style={{ color: "#16A34A" }}>Payment Successful</h3><p style={{ color: "#64748b", fontSize: 14 }}>Transfer: {String(result.transfer_id)}</p></div>;
  return (
    <div style={{ maxWidth: 400, margin: "0 auto" }}>
      <div style={{ marginBottom: 16, padding: 16, background: "#f8fafc", borderRadius: 10, textAlign: "center" }}><div style={{ fontSize: 14, color: "#64748b" }}>Amount</div><div style={{ fontSize: 28, fontWeight: 700, color: "#0f172a" }}>{new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount)}</div></div>
      {err && <div style={{ padding: 12, background: "rgba(220,38,38,0.08)", borderRadius: 8, color: "#DC2626", fontSize: 14, marginBottom: 16 }}>{err}</div>}
      <FinixTokenForm applicationId={cfg.applicationId} environment={cfg.environment} onTokenize={onToken} onError={(e) => { setStatus("error"); setErr(e); onError?.(e); }} disabled={status === "charging"} />
    </div>
  );
}