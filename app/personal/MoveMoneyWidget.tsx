// MoveMoneyWidget — atomic Personal ↔ Business transfer.
//
// Renders inside /personal/overview and /personal/wallets. Same widget
// embeds in /app/wallets with `defaultDirection="from-personal"` for the
// reverse direction. State is fully local; the parent passes the lists
// + a refresh callback.

"use client";

import React, { useMemo, useState } from "react";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { BankingCard } from "@/components/dashboard/BankingCard";
import { GradientButton } from "@/components/dashboard/GradientButton";
import zp from "@/lib/design-system/zenipay-brand";

interface PersonalAccount {
  id: string;
  name: string;
  balance: number;
  currency: string;
  account_type?: string;
}
interface BusinessAccount {
  id: string;
  account_name: string;
  balance: number;
  currency?: string;
}

type Direction = "to-business" | "from-business";

export interface MoveMoneyWidgetProps {
  merchantId: string;
  personalAccounts: PersonalAccount[];
  businessAccounts: BusinessAccount[];
  onComplete: () => void | Promise<void>;
  defaultDirection?: Direction;
}

export function MoveMoneyWidget({
  merchantId, personalAccounts, businessAccounts, onComplete,
  defaultDirection = "to-business",
}: MoveMoneyWidgetProps) {
  const [direction, setDirection] = useState<Direction>(defaultDirection);
  const [personalId, setPersonalId] = useState<string>(personalAccounts[0]?.id ?? "");
  const [businessId, setBusinessId] = useState<string>(businessAccounts[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Keep selected ids valid as the parent's lists hydrate.
  React.useEffect(() => { if (!personalId && personalAccounts[0]) setPersonalId(personalAccounts[0].id); }, [personalAccounts, personalId]);
  React.useEffect(() => { if (!businessId && businessAccounts[0]) setBusinessId(businessAccounts[0].id); }, [businessAccounts, businessId]);

  const personal = personalAccounts.find((a) => a.id === personalId);
  const business = businessAccounts.find((a) => a.id === businessId);

  const sourceBalance = direction === "to-business"
    ? Number(personal?.balance ?? 0)
    : Number(business?.balance ?? 0);

  const sourceCurrency = direction === "to-business"
    ? (personal?.currency ?? "CAD")
    : (business?.currency ?? "CAD");

  const numericAmount = useMemo(() => {
    const n = Number(amount);
    return Number.isFinite(n) ? n : 0;
  }, [amount]);

  const submit = async () => {
    setErr(null); setSuccess(null);
    if (numericAmount <= 0) { setErr("Enter an amount"); return; }
    if (numericAmount > sourceBalance) { setErr("Insufficient funds"); return; }
    setBusy(true);
    try {
      const path = direction === "to-business"
        ? "/api/v1/personal/transfer-to-business"
        : "/api/v1/personal/transfer-from-business";
      const body = direction === "to-business"
        ? { merchant_id: merchantId, from_personal_account_id: personalId, to_business_account_id: businessId, amount: numericAmount, currency: sourceCurrency, memo }
        : { merchant_id: merchantId, from_business_account_id: businessId, to_personal_account_id: personalId, amount: numericAmount, currency: sourceCurrency, memo };
      const r = await fetch(path, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(data?.error?.message ?? "Transfer failed");
        return;
      }
      setSuccess(direction === "to-business"
        ? `Moved ${zp.fmtCurrency(numericAmount, sourceCurrency)} from Personal to Business`
        : `Moved ${zp.fmtCurrency(numericAmount, sourceCurrency)} from Business to Personal`);
      setAmount("");
      await onComplete();
    } finally {
      setBusy(false);
    }
  };

  return (
    <BankingCard accent="pink">
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <DirectionPill
          active={direction === "from-business"}
          onClick={() => setDirection("from-business")}
          icon={<ArrowLeft size={12} />}
          label="Business → Personal"
        />
        <DirectionPill
          active={direction === "to-business"}
          onClick={() => setDirection("to-business")}
          icon={<ArrowRight size={12} />}
          label="Personal → Business"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <Label>{direction === "to-business" ? "From (Personal)" : "To (Personal)"}</Label>
          <select value={personalId} onChange={(e) => setPersonalId(e.target.value)} style={inputStyle}>
            {personalAccounts.length === 0 ? <option value="">No personal account</option> : null}
            {personalAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · {zp.fmtCurrency(Number(a.balance), a.currency)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>{direction === "to-business" ? "To (Business)" : "From (Business)"}</Label>
          <select value={businessId} onChange={(e) => setBusinessId(e.target.value)} style={inputStyle}>
            {businessAccounts.length === 0 ? <option value="">No business account</option> : null}
            {businessAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.account_name} · {zp.fmtCurrency(Number(a.balance), a.currency || "CAD")}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 10, marginTop: 10, alignItems: "end" }}>
        <div>
          <Label>Amount</Label>
          <input
            type="number" min={0} step="0.01"
            value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            style={inputStyle}
          />
          <div style={{ fontSize: 10, color: zp.text.dim, marginTop: 3 }}>
            Available: {zp.fmtCurrency(sourceBalance, sourceCurrency)}
          </div>
        </div>
        <div>
          <Label>Memo (optional)</Label>
          <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="e.g. Reimburse expense" style={inputStyle} />
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <GradientButton
          variant="primary"
          size="md"
          onClick={submit}
          disabled={busy || !personalId || !businessId || numericAmount <= 0}
          style={{ background: zp.gradient.personal }}
        >
          {busy ? "Transferring…" : direction === "to-business" ? "Transfer to Business" : "Transfer to Personal"}
        </GradientButton>
      </div>

      {err && (
        <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: zp.radius.sm, background: zp.semantic.dangerBg, color: zp.semantic.danger, fontSize: 12, fontWeight: zp.weight.semibold }}>{err}</div>
      )}
      {success && (
        <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: zp.radius.sm, background: zp.semantic.successBg, color: zp.semantic.success, fontSize: 12, fontWeight: zp.weight.semibold }}>{success}</div>
      )}
    </BankingCard>
  );
}

function DirectionPill({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "6px 12px", borderRadius: zp.radius.pill,
        border: `1px solid ${active ? zp.brand.pink : zp.surface.border}`,
        background: active ? "rgba(255,107,157,0.10)" : zp.surface.bg1,
        color: active ? zp.brand.pink : zp.text.muted,
        fontSize: 11, fontWeight: zp.weight.semibold, letterSpacing: "0.04em",
        cursor: "pointer",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label style={{ display: "block", fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6 }}>{children}</label>;
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: zp.radius.sm,
  border: `1px solid ${zp.surface.border}`, background: zp.surface.bg2,
  color: zp.text.primary, fontSize: 13, boxSizing: "border-box", outline: "none", fontFamily: zp.font.sans,
};

export default MoveMoneyWidget;
