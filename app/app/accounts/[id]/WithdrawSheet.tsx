// PR 15 — Withdraw side-sheet for /app/accounts/[id].
// Posts to /api/v1/merchant/payouts/request after the operator picks
// a saved destination (or adds a new one inline).

"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { BankingCard } from "@/components/dashboard/BankingCard";
import { GradientButton } from "@/components/dashboard/GradientButton";
import zp from "@/lib/design-system/zenipay-brand";

interface Destination {
  id: string;
  nickname: string;
  destination_type: "ach" | "wire" | "interac" | "internal";
  bank_name: string | null;
  account_number: string | null;
  routing_number: string | null;
  swift_code: string | null;
  interac_email: string | null;
  currency: string;
  is_default: boolean;
}

interface Props {
  merchantId: string;
  fromAccountId: string;
  currency: string;
  balance: number;
  onClose: () => void;
  onSuccess: (msg: string) => void | Promise<void>;
  finixReady: boolean;
}

export function WithdrawSheet({
  merchantId, fromAccountId, currency, balance, onClose, onSuccess, finixReady,
}: Props) {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [destId, setDestId] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/v1/merchant/payout-destinations?merchant_id=${encodeURIComponent(merchantId)}`).then((r) => r.json());
      const list: Destination[] = (r.destinations ?? []).filter((d: Destination) => (d.currency ?? currency) === currency);
      setDestinations(list);
      const def = list.find((d) => d.is_default) ?? list[0];
      if (def) setDestId(def.id);
      else setDestId("");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    setErr(null);
    const amt = Number(amount);
    if (!destId) { setErr("Pick a destination or add one."); return; }
    if (!Number.isFinite(amt) || amt <= 0) { setErr("Enter an amount greater than 0."); return; }
    if (amt > balance) { setErr(`Max withdrawal: ${zp.fmtCurrency(balance, currency)}.`); return; }
    setSending(true);
    try {
      const r = await fetch("/api/v1/merchant/payouts/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id:     merchantId,
          destination_id:  destId,
          from_account_id: fromAccountId,
          amount_units:    amt,
          currency,
          idempotency_key: `withdraw-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          memo,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || data?.error) {
        setErr(data?.error?.message || data?.error || "Withdrawal failed.");
        return;
      }
      const pending = data.status === "pending";
      const label = pending
        ? `Withdrawal of ${zp.fmtCurrency(amt, currency)} queued · awaiting Finix activation`
        : `Withdrawal of ${zp.fmtCurrency(amt, currency)} initiated · est. ${data.estimated_arrival ? new Date(data.estimated_arrival).toLocaleDateString("en-CA") : "2-3 business days"}`;
      await onSuccess(label);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: zp.surface.overlay,
        backdropFilter: "blur(4px)", zIndex: zp.zIndex.modal,
        display: "flex", justifyContent: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(480px, 100vw)", height: "100vh", background: zp.surface.bg1,
          boxShadow: zp.elevation.lg, overflowY: "auto", padding: 28,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: zp.weight.semibold, color: zp.text.primary }}>
            Withdraw funds
          </h2>
          <button onClick={onClose} aria-label="Close" style={{
            background: zp.surface.bg3, border: "none", borderRadius: zp.radius.sm,
            width: 30, height: 30, cursor: "pointer", color: zp.text.primary,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}><X size={16} /></button>
        </div>

        <Label>Amount</Label>
        <div style={{ position: "relative" }}>
          <input
            type="number" step="0.01" min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            style={{ ...inputStyle, paddingRight: 82 }}
          />
          <button
            type="button"
            onClick={() => setAmount(String(balance))}
            style={{
              position: "absolute", right: 6, top: 6,
              background: zp.surface.bg2, border: `1px solid ${zp.surface.border}`,
              color: zp.text.muted, padding: "6px 10px", borderRadius: zp.radius.xs,
              fontSize: 11, fontWeight: zp.weight.semibold, cursor: "pointer",
            }}
          >Max</button>
        </div>
        <div style={{ fontSize: 11, color: zp.text.muted, marginTop: 4 }}>
          Available: <span style={{ fontFamily: zp.font.mono }}>{zp.fmtCurrency(balance, currency)}</span>
        </div>

        <Label style={{ marginTop: 14 }}>Destination</Label>
        {loading ? (
          <div style={{ fontSize: 12, color: zp.text.muted, padding: "8px 0" }}>Loading destinations…</div>
        ) : destinations.length === 0 ? (
          <BankingCard style={{ padding: 14, marginTop: 4 }}>
            <p style={{ margin: "0 0 10px", fontSize: 13, color: zp.text.muted }}>
              No saved destinations for {currency}. Add one to continue.
            </p>
            <GradientButton variant="primary" size="sm" onClick={() => setShowAdd(true)}>
              + Add destination
            </GradientButton>
          </BankingCard>
        ) : (
          <>
            <select
              value={destId}
              onChange={(e) => setDestId(e.target.value)}
              style={inputStyle}
            >
              {destinations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nickname} · {d.destination_type.toUpperCase()}
                  {d.account_number ? ` · ••${d.account_number.slice(-4)}` : ""}
                  {d.interac_email ? ` · ${d.interac_email}` : ""}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              style={{
                background: "transparent", border: "none", color: zp.brand.cyan,
                padding: "8px 0 0", fontSize: 12, fontWeight: zp.weight.semibold, cursor: "pointer",
              }}
            >+ Add another destination</button>
          </>
        )}

        <Label style={{ marginTop: 14 }}>Memo (optional)</Label>
        <input
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="e.g. Payroll May 2026"
          style={inputStyle}
        />

        <div style={{
          marginTop: 16, padding: "12px 14px", borderRadius: zp.radius.sm,
          background: finixReady ? "rgba(15,184,201,0.06)" : "rgba(245,166,35,0.08)",
          border: `1px solid ${finixReady ? "rgba(15,184,201,0.2)" : "rgba(245,166,35,0.25)"}`,
          fontSize: 12, color: zp.text.muted,
        }}>
          {finixReady ? (
            <>Est. arrival <strong style={{ color: zp.text.primary }}>2-3 business days</strong> via ACH / wire.
            Interac e-Transfers settle within minutes.</>
          ) : (
            <>ACH and wire payouts are <strong style={{ color: "#D97706" }}>pending Finix activation</strong>.
            Your request will be held as <code>pending</code> and auto-released when the rail goes live.</>
          )}
        </div>

        {err && (
          <div style={{
            marginTop: 12, padding: "10px 12px", borderRadius: zp.radius.sm,
            background: zp.semantic.dangerBg, color: zp.semantic.danger,
            fontSize: 12, fontWeight: zp.weight.semibold,
          }}>{err}</div>
        )}

        <div style={{ marginTop: 18, display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <GradientButton variant="ghost" onClick={onClose} size="md">Cancel</GradientButton>
          <GradientButton
            variant="primary"
            size="md"
            onClick={submit}
            disabled={sending || loading || !destId || !amount}
          >
            {sending ? "Requesting…" : "Request withdrawal"}
          </GradientButton>
        </div>

        {showAdd && (
          <AddDestinationInline
            merchantId={merchantId}
            currency={currency}
            onCancel={() => setShowAdd(false)}
            onAdded={async () => { setShowAdd(false); await load(); }}
          />
        )}
      </div>
    </div>
  );
}

function AddDestinationInline({
  merchantId, currency, onCancel, onAdded,
}: {
  merchantId: string;
  currency: string;
  onCancel: () => void;
  onAdded: () => void | Promise<void>;
}) {
  const [type, setType] = useState<"ach" | "wire" | "interac" | "internal">("ach");
  const [nickname, setNickname] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [routing, setRouting] = useState("");
  const [account, setAccount] = useState("");
  const [swift, setSwift] = useState("");
  const [interacEmail, setInteracEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (!nickname.trim()) { setErr("Give the destination a nickname."); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/v1/merchant/payout-destinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id:      merchantId,
          nickname:         nickname.trim(),
          destination_type: type,
          bank_name:        bankName.trim() || null,
          account_holder:   accountHolder.trim() || null,
          routing_number:   routing.trim() || null,
          account_number:   account.trim() || null,
          swift_code:       swift.trim() || null,
          interac_email:    interacEmail.trim() || null,
          currency,
          set_default:      false,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || data?.error) {
        setErr(data?.error?.message || data?.error || "Add failed.");
        return;
      }
      await onAdded();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      marginTop: 18, padding: 16, borderRadius: zp.radius.sm,
      background: zp.surface.bg2, border: `1px solid ${zp.surface.border}`,
    }}>
      <div style={{ fontSize: 13, fontWeight: zp.weight.semibold, color: zp.text.primary, marginBottom: 10 }}>
        Add destination
      </div>

      <Label>Type</Label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {(["ach", "wire", "interac", "internal"] as const).map((t) => {
          const active = type === t;
          return (
            <button
              key={t}
              onClick={() => setType(t)}
              style={{
                padding: "8px 10px", borderRadius: zp.radius.xs,
                border: `1.5px solid ${active ? zp.brand.cyan : zp.surface.border}`,
                background: active ? "rgba(15,184,201,0.06)" : "#fff",
                color: zp.text.primary, fontSize: 12, fontWeight: active ? zp.weight.semibold : zp.weight.medium,
                cursor: "pointer", textTransform: "uppercase" as const, letterSpacing: "0.04em",
              }}
            >{t}</button>
          );
        })}
      </div>

      <Label style={{ marginTop: 12 }}>Nickname</Label>
      <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="RBC Operating" style={inputStyle} />

      {(type === "ach" || type === "wire") && (
        <>
          <Label style={{ marginTop: 10 }}>Bank name</Label>
          <input value={bankName} onChange={(e) => setBankName(e.target.value)} style={inputStyle} />
          <Label style={{ marginTop: 10 }}>Account holder</Label>
          <input value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} style={inputStyle} />
          {type === "ach" && (
            <>
              <Label style={{ marginTop: 10 }}>Routing / transit</Label>
              <input value={routing} onChange={(e) => setRouting(e.target.value)} style={inputStyle} />
            </>
          )}
          {type === "wire" && (
            <>
              <Label style={{ marginTop: 10 }}>SWIFT / BIC (international)</Label>
              <input value={swift} onChange={(e) => setSwift(e.target.value)} style={inputStyle} />
            </>
          )}
          <Label style={{ marginTop: 10 }}>Account number / IBAN</Label>
          <input value={account} onChange={(e) => setAccount(e.target.value)} style={inputStyle} />
        </>
      )}

      {type === "interac" && (
        <>
          <Label style={{ marginTop: 10 }}>Interac e-Transfer email</Label>
          <input type="email" value={interacEmail} onChange={(e) => setInteracEmail(e.target.value)} style={inputStyle} />
        </>
      )}

      {type === "internal" && (
        <>
          <Label style={{ marginTop: 10 }}>ZeniPay account id</Label>
          <input value={account} onChange={(e) => setAccount(e.target.value)} placeholder="ACC-..." style={inputStyle} />
        </>
      )}

      {err && (
        <div style={{
          marginTop: 10, padding: "8px 10px", borderRadius: zp.radius.xs,
          background: zp.semantic.dangerBg, color: zp.semantic.danger,
          fontSize: 12, fontWeight: zp.weight.semibold,
        }}>{err}</div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 12 }}>
        <GradientButton variant="ghost" size="sm" onClick={onCancel} disabled={saving}>Cancel</GradientButton>
        <GradientButton variant="primary" size="sm" onClick={submit} disabled={saving || !nickname.trim()}>
          {saving ? "Adding…" : "Add destination"}
        </GradientButton>
      </div>
    </div>
  );
}

function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted,
      letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 5, ...style,
    }}>{children}</div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: zp.radius.sm,
  border: `1px solid ${zp.surface.border}`, background: zp.surface.bg2,
  color: zp.text.primary, fontSize: 14, boxSizing: "border-box", outline: "none", fontFamily: zp.font.sans,
};
