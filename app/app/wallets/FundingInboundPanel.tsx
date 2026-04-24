// PR 9 — ACH + Interac inbound funding, mounted on /app/wallets.
// Tabs flip between the two rails; both submit to
// /api/v1/merchant/funding/* and show the resulting transfer id
// (ACH) or Interac checkout URL (with copy button).

"use client";

import React, { useState } from "react";
import { BankingCard } from "@/components/dashboard/BankingCard";
import { GradientButton } from "@/components/dashboard/GradientButton";
import zp from "@/lib/design-system/zenipay-brand";

type Tab = "ach" | "interac";

function mid(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("zp_client") ?? "";
}

export function FundingInboundPanel() {
  const [tab, setTab] = useState<Tab>("ach");

  return (
    <BankingCard padding={0}>
      <div style={{ padding: "18px 22px 0" }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: zp.weight.semibold, color: zp.text.primary }}>
          Accept a transfer
        </h2>
        <p style={{ margin: "4px 0 14px", fontSize: 12, color: zp.text.muted }}>
          Pull funds from a bank account (ACH) or request a Canadian Interac e-Transfer.
        </p>

        <div style={{ display: "inline-flex", gap: 2, padding: 3, background: zp.surface.bg2, border: `1px solid ${zp.surface.border}`, borderRadius: zp.radius.sm }}>
          {(["ach", "interac"] as Tab[]).map((t) => {
            const active = t === tab;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: "6px 14px", borderRadius: zp.radius.xs, border: "none",
                  background: active ? zp.surface.bg1 : "transparent",
                  color: active ? zp.text.primary : zp.text.muted,
                  fontSize: 12, fontWeight: active ? zp.weight.semibold : zp.weight.medium,
                  boxShadow: active ? zp.elevation.sm : undefined, cursor: "pointer",
                  textTransform: "uppercase" as const, letterSpacing: 0.4,
                }}
              >
                {t === "ach" ? "ACH" : "Interac (CAD)"}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding: 22, borderTop: `1px solid ${zp.surface.border}`, marginTop: 16 }}>
        {tab === "ach" ? <AchForm /> : <InteracForm />}
      </div>
    </BankingCard>
  );
}

function AchForm() {
  const [accountHolder, setAccountHolder] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountType,   setAccountType]   = useState<"checking" | "savings">("checking");
  const [amount,        setAmount]        = useState("");
  const [currency,      setCurrency]      = useState<"USD" | "CAD">("USD");
  const [memo,          setMemo]          = useState("");
  const [sending,       setSending]       = useState(false);
  const [err,           setErr]           = useState<string | null>(null);
  const [result,        setResult]        = useState<{ transfer_id: string; estimated_arrival: string | null } | null>(null);

  const submit = async () => {
    setErr(null); setResult(null);
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) { setErr("Enter an amount greater than 0."); return; }
    setSending(true);
    try {
      const r = await fetch("/api/v1/merchant/funding/ach", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id:       mid(),
          account_holder:    accountHolder.trim(),
          routing_number:    routingNumber.replace(/\s/g, ""),
          account_number:    accountNumber.replace(/\s/g, ""),
          account_type:      accountType,
          amount_units:      amt,
          currency,
          idempotency_key:   `ach-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          memo,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || data?.error) {
        setErr(data?.error?.message ?? data?.error ?? "ACH request failed.");
        return;
      }
      setResult({ transfer_id: data.transfer_id, estimated_arrival: data.estimated_arrival });
      setAccountHolder(""); setRoutingNumber(""); setAccountNumber(""); setAmount(""); setMemo("");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Label>Account holder</Label>
      <Input value={accountHolder} onChange={setAccountHolder} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
        <div>
          <Label>Routing number</Label>
          <Input value={routingNumber} onChange={(v) => setRoutingNumber(v.replace(/[^\d]/g, ""))} placeholder="021000021" />
        </div>
        <div>
          <Label>Account type</Label>
          <select value={accountType} onChange={(e) => setAccountType(e.target.value as "checking" | "savings")} style={inputStyle}>
            <option value="checking">Checking</option>
            <option value="savings">Savings</option>
          </select>
        </div>
      </div>

      <Label style={{ marginTop: 12 }}>Account number</Label>
      <Input value={accountNumber} onChange={(v) => setAccountNumber(v.replace(/[^\d]/g, ""))} />

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10, marginTop: 12 }}>
        <div>
          <Label>Amount</Label>
          <Input value={amount} onChange={setAmount} placeholder="0.00" type="number" step="0.01" />
        </div>
        <div>
          <Label>Currency</Label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value as "USD" | "CAD")} style={inputStyle}>
            <option value="USD">USD</option>
            <option value="CAD">CAD</option>
          </select>
        </div>
      </div>

      <Label style={{ marginTop: 12 }}>Memo (optional)</Label>
      <Input value={memo} onChange={setMemo} placeholder="Invoice #4872" />

      <Note>Funds arrive in 2-3 business days. Account data is handled exclusively by Finix; ZeniPay stores only the masked last digits.</Note>

      {err && <ErrorBox>{err}</ErrorBox>}
      {result && (
        <SuccessBox>
          ACH debit initiated · transfer <code style={{ fontFamily: zp.font.mono }}>{result.transfer_id}</code>
          {result.estimated_arrival ? ` · est. ${new Date(result.estimated_arrival).toLocaleDateString("en-CA")}` : ""}
        </SuccessBox>
      )}

      <div style={{ marginTop: 16 }}>
        <GradientButton variant="primary" size="md" onClick={submit} disabled={sending || !accountHolder || !routingNumber || !accountNumber || !amount}>
          {sending ? "Requesting…" : "Request ACH transfer"}
        </GradientButton>
      </div>
    </>
  );
}

function InteracForm() {
  const [payerName,  setPayerName]  = useState("");
  const [payerEmail, setPayerEmail] = useState("");
  const [amount,     setAmount]     = useState("");
  const [memo,       setMemo]       = useState("");
  const [sending,    setSending]    = useState(false);
  const [err,        setErr]        = useState<string | null>(null);
  const [result,     setResult]     = useState<{ transfer_id: string; payment_url: string | null } | null>(null);
  const [copied,     setCopied]     = useState(false);

  const submit = async () => {
    setErr(null); setResult(null);
    const amt = Number(amount);
    if (!payerName.trim())  { setErr("Payer name required."); return; }
    if (!payerEmail.trim()) { setErr("Payer email required."); return; }
    if (!Number.isFinite(amt) || amt <= 0) { setErr("Enter an amount > 0."); return; }
    setSending(true);
    try {
      const r = await fetch("/api/v1/merchant/funding/interac", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id:     mid(),
          payer_name:      payerName.trim(),
          payer_email:     payerEmail.trim().toLowerCase(),
          amount_units:    amt,
          currency:        "CAD",
          idempotency_key: `interac-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          memo,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || data?.error) {
        setErr(data?.error?.message ?? data?.error ?? "Interac request failed.");
        return;
      }
      setResult({ transfer_id: data.transfer_id, payment_url: data.payment_url ?? null });
      setPayerName(""); setPayerEmail(""); setAmount(""); setMemo("");
    } finally {
      setSending(false);
    }
  };

  const copy = async () => {
    if (!result?.payment_url) return;
    try {
      await navigator.clipboard.writeText(result.payment_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <>
      <Label>Payer full name</Label>
      <Input value={payerName} onChange={setPayerName} />
      <Label style={{ marginTop: 12 }}>Payer email</Label>
      <Input value={payerEmail} onChange={setPayerEmail} type="email" />
      <Label style={{ marginTop: 12 }}>Amount (CAD)</Label>
      <Input value={amount} onChange={setAmount} placeholder="0.00" type="number" step="0.01" />
      <Label style={{ marginTop: 12 }}>Memo (optional)</Label>
      <Input value={memo} onChange={setMemo} />

      <Note>Generates a Finix-hosted Interac link. Share it with the payer by email or SMS; funds settle as soon as they complete the transfer.</Note>

      {err && <ErrorBox>{err}</ErrorBox>}
      {result?.payment_url && (
        <SuccessBox>
          Interac link ready ·{" "}
          <code style={{ fontFamily: zp.font.mono, fontSize: 11 }}>{result.payment_url}</code>
          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            <GradientButton size="sm" variant="secondary" onClick={copy}>
              {copied ? "Copied ✓" : "Copy link"}
            </GradientButton>
            <a href={result.payment_url} target="_blank" rel="noreferrer" style={{
              display: "inline-flex", alignItems: "center",
              padding: "7px 14px", borderRadius: zp.radius.sm,
              background: zp.surface.bg2, color: zp.brand.cyan,
              fontSize: 12, fontWeight: zp.weight.semibold, textDecoration: "none",
              border: `1px solid ${zp.surface.border}`,
            }}>Open link →</a>
          </div>
        </SuccessBox>
      )}

      <div style={{ marginTop: 16 }}>
        <GradientButton variant="primary" size="md" onClick={submit} disabled={sending || !payerName || !payerEmail || !amount}>
          {sending ? "Generating…" : "Generate Interac link"}
        </GradientButton>
      </div>
    </>
  );
}

function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <label style={{
      display: "block",
      fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted,
      letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6, ...style,
    }}>{children}</label>
  );
}

function Input({ value, onChange, placeholder, type, step }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  step?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      type={type ?? "text"}
      step={step}
      style={inputStyle}
    />
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      marginTop: 14, padding: "10px 12px", borderRadius: zp.radius.sm,
      background: zp.surface.bg2, border: `1px solid ${zp.surface.border}`,
      fontSize: 11, color: zp.text.muted, lineHeight: 1.45,
    }}>{children}</div>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      marginTop: 14, padding: "10px 12px", borderRadius: zp.radius.sm,
      background: zp.semantic.dangerBg, color: zp.semantic.danger,
      fontSize: 12, fontWeight: zp.weight.semibold,
    }}>{children}</div>
  );
}

function SuccessBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      marginTop: 14, padding: "12px 14px", borderRadius: zp.radius.sm,
      background: zp.semantic.successBg, color: zp.semantic.success,
      border: "1px solid rgba(16,185,129,0.25)",
      fontSize: 12, fontWeight: zp.weight.semibold, lineHeight: 1.55,
    }}>{children}</div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: zp.radius.sm,
  border: `1px solid ${zp.surface.border}`, background: zp.surface.bg2,
  color: zp.text.primary, fontSize: 14, boxSizing: "border-box", outline: "none", fontFamily: zp.font.sans,
};
