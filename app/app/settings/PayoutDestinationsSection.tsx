// PR 15 — Payout destinations section for /app/settings.
// Lists saved destinations, lets the merchant add / toggle default / delete.

"use client";

import React, { useEffect, useState } from "react";
import { Trash2, Star, X } from "lucide-react";
import { BankingCard } from "@/components/dashboard/BankingCard";
import { GradientButton } from "@/components/dashboard/GradientButton";
import zp from "@/lib/design-system/zenipay-brand";

interface Destination {
  id: string;
  nickname: string;
  destination_type: "ach" | "wire" | "interac" | "internal";
  bank_name: string | null;
  account_holder: string | null;
  routing_number: string | null;
  account_number: string | null;
  swift_code: string | null;
  interac_email: string | null;
  currency: string;
  is_default: boolean;
  is_verified: boolean;
}

export function PayoutDestinationsSection({ merchantId }: { merchantId: string }) {
  const [list, setList] = useState<Destination[]>([]);
  const [finixReady, setFinixReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    if (!merchantId) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/v1/merchant/payout-destinations?merchant_id=${encodeURIComponent(merchantId)}`).then((r) => r.json());
      setList((r.destinations ?? []) as Destination[]);
      setFinixReady(!!r.finix_payouts_ready);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, [merchantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const setDefault = async (d: Destination) => {
    if (d.is_default) return;
    await fetch(`/api/v1/merchant/payout-destinations/${d.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchant_id: merchantId, is_default: true }),
    });
    await load();
  };

  const remove = async (d: Destination) => {
    setErr(null);
    if (!window.confirm(`Delete destination "${d.nickname}"?`)) return;
    const r = await fetch(`/api/v1/merchant/payout-destinations/${d.id}?merchant_id=${encodeURIComponent(merchantId)}`, {
      method: "DELETE",
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || data?.error) {
      setErr(data?.error?.message || data?.error || "Delete failed.");
      return;
    }
    await load();
  };

  return (
    <BankingCard>
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div>
            <h2 style={{ margin: 0, fontFamily: zp.font.display, fontSize: 20, fontWeight: zp.weight.semibold, color: zp.text.primary, letterSpacing: "-0.02em" }}>
              Payout destinations
            </h2>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: zp.text.muted }}>
              External bank accounts, Interac e-Transfer emails, or other ZeniPay accounts where you can withdraw funds.
            </p>
          </div>
          <GradientButton variant="primary" size="sm" onClick={() => setShowAdd(true)}>
            + Add destination
          </GradientButton>
        </div>
        <div style={{
          marginTop: 10, padding: "10px 12px", borderRadius: zp.radius.sm,
          background: finixReady ? "rgba(45,190,96,0.06)" : "rgba(245,166,35,0.08)",
          border: `1px solid ${finixReady ? "rgba(45,190,96,0.25)" : "rgba(245,166,35,0.25)"}`,
          fontSize: 12, color: zp.text.muted,
        }}>
          {finixReady
            ? <>ACH and wire payouts are live. Interac e-Transfers settle in minutes.</>
            : <>ACH and wire payouts are <strong style={{ color: "#D97706" }}>pending Finix activation</strong>. Interac coming soon.</>
          }
        </div>
      </div>

      {err && (
        <div style={{
          marginBottom: 10, padding: "10px 12px", borderRadius: zp.radius.sm,
          background: zp.semantic.dangerBg, color: zp.semantic.danger,
          fontSize: 12, fontWeight: zp.weight.semibold,
        }}>{err}</div>
      )}

      {loading && list.length === 0 ? (
        <p style={{ fontSize: 13, color: zp.text.muted, margin: "14px 0" }}>Loading…</p>
      ) : list.length === 0 ? (
        <p style={{ fontSize: 13, color: zp.text.muted, margin: "14px 0" }}>
          No saved destinations yet. Add one to enable withdrawals.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {list.map((d) => <DestinationRow key={d.id} d={d} onDefault={() => setDefault(d)} onDelete={() => remove(d)} />)}
        </div>
      )}

      {showAdd && (
        <AddDestinationModal
          merchantId={merchantId}
          onClose={() => setShowAdd(false)}
          onAdded={async () => { setShowAdd(false); await load(); }}
        />
      )}
    </BankingCard>
  );
}

function DestinationRow({
  d, onDefault, onDelete,
}: {
  d: Destination;
  onDefault: () => void | Promise<void>;
  onDelete: () => void | Promise<void>;
}) {
  const detail =
    d.destination_type === "interac" ? d.interac_email ?? ""
    : d.account_number ? `•••• ${d.account_number.slice(-4)}`
    : "—";

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12,
      alignItems: "center", padding: "12px 14px",
      border: `1px solid ${zp.surface.border}`, borderRadius: zp.radius.sm,
      background: zp.surface.bg2,
    }}>
      <span style={{
        fontSize: 10, fontWeight: zp.weight.semibold,
        padding: "3px 10px", borderRadius: zp.radius.pill,
        background: d.destination_type === "interac" ? "rgba(45,190,96,0.12)" : "rgba(15,184,201,0.12)",
        color: d.destination_type === "interac" ? "#16A34A" : zp.brand.cyan,
        letterSpacing: "0.04em", textTransform: "uppercase" as const,
      }}>
        {d.destination_type}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: zp.weight.semibold, color: zp.text.primary }}>{d.nickname}</span>
          {d.is_default && (
            <span style={{
              fontSize: 9, fontWeight: zp.weight.semibold, padding: "2px 8px", borderRadius: zp.radius.pill,
              background: "rgba(255,180,0,0.14)", color: "#B45309",
              letterSpacing: "0.08em", textTransform: "uppercase" as const,
            }}>DEFAULT</span>
          )}
          {!d.is_verified && (
            <span style={{
              fontSize: 9, fontWeight: zp.weight.semibold, padding: "2px 8px", borderRadius: zp.radius.pill,
              background: zp.surface.bg3, color: zp.text.muted,
              letterSpacing: "0.08em", textTransform: "uppercase" as const,
            }}>UNVERIFIED</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: zp.text.muted, fontFamily: zp.font.mono, marginTop: 3 }}>
          {d.bank_name ? `${d.bank_name} · ` : ""}{detail}{" · "}{d.currency}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button
          onClick={onDefault}
          disabled={d.is_default}
          aria-label={d.is_default ? "Already default" : "Make default"}
          title={d.is_default ? "Already default" : "Make default"}
          style={{
            background: d.is_default ? "rgba(255,180,0,0.12)" : zp.surface.bg1,
            color: d.is_default ? "#B45309" : zp.text.muted,
            border: `1px solid ${zp.surface.border}`, padding: "6px 8px", borderRadius: 8,
            cursor: d.is_default ? "default" : "pointer",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}
        ><Star size={12} /></button>
        <button
          onClick={onDelete}
          aria-label="Delete"
          title="Delete"
          style={{
            background: zp.surface.bg1, color: zp.semantic.danger,
            border: "1px solid rgba(220,38,38,0.25)", padding: "6px 8px", borderRadius: 8,
            cursor: "pointer",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}
        ><Trash2 size={12} /></button>
      </div>
    </div>
  );
}

function AddDestinationModal({
  merchantId, onClose, onAdded,
}: {
  merchantId: string;
  onClose: () => void;
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
  const [currency, setCurrency] = useState<"CAD" | "USD">("CAD");
  const [makeDefault, setMakeDefault] = useState(false);
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
          set_default:      makeDefault,
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
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: zp.surface.overlay,
        backdropFilter: "blur(4px)", zIndex: zp.zIndex.modal,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 520, background: zp.surface.bg1,
          borderRadius: zp.radius.md, padding: 24, boxShadow: zp.elevation.lg,
          maxHeight: "90vh", overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: zp.weight.semibold, color: zp.text.primary }}>
            Add payout destination
          </h3>
          <button onClick={onClose} aria-label="Close" style={{
            background: zp.surface.bg3, border: "none", borderRadius: zp.radius.sm,
            width: 30, height: 30, cursor: "pointer", color: zp.text.primary,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}><X size={16} /></button>
        </div>

        <Label>Type</Label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 14 }}>
          {(["ach", "wire", "interac", "internal"] as const).map((t) => {
            const active = type === t;
            return (
              <button
                key={t}
                onClick={() => setType(t)}
                style={{
                  padding: "10px 12px", borderRadius: zp.radius.sm,
                  border: `1.5px solid ${active ? zp.brand.cyan : zp.surface.border}`,
                  background: active ? "rgba(15,184,201,0.06)" : zp.surface.bg2,
                  color: zp.text.primary, fontSize: 12, fontWeight: active ? zp.weight.semibold : zp.weight.medium,
                  cursor: "pointer", textTransform: "uppercase" as const, letterSpacing: "0.04em",
                }}
              >{t}</button>
            );
          })}
        </div>

        <Label>Nickname</Label>
        <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="RBC Operating" style={inputStyle} />

        {(type === "ach" || type === "wire") && (
          <>
            <Label style={{ marginTop: 12 }}>Bank name</Label>
            <input value={bankName} onChange={(e) => setBankName(e.target.value)} style={inputStyle} />
            <Label style={{ marginTop: 12 }}>Account holder</Label>
            <input value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} style={inputStyle} />
            {type === "ach" && (
              <>
                <Label style={{ marginTop: 12 }}>Routing / transit</Label>
                <input value={routing} onChange={(e) => setRouting(e.target.value)} style={inputStyle} />
              </>
            )}
            {type === "wire" && (
              <>
                <Label style={{ marginTop: 12 }}>SWIFT / BIC (intl)</Label>
                <input value={swift} onChange={(e) => setSwift(e.target.value)} style={inputStyle} />
              </>
            )}
            <Label style={{ marginTop: 12 }}>Account number / IBAN</Label>
            <input value={account} onChange={(e) => setAccount(e.target.value)} style={inputStyle} />
          </>
        )}

        {type === "interac" && (
          <>
            <Label style={{ marginTop: 12 }}>Interac e-Transfer email</Label>
            <input type="email" value={interacEmail} onChange={(e) => setInteracEmail(e.target.value)} style={inputStyle} />
          </>
        )}

        {type === "internal" && (
          <>
            <Label style={{ marginTop: 12 }}>ZeniPay account id</Label>
            <input value={account} onChange={(e) => setAccount(e.target.value)} placeholder="ACC-..." style={inputStyle} />
          </>
        )}

        <Label style={{ marginTop: 14 }}>Currency</Label>
        <div style={{ display: "inline-flex", gap: 2, padding: 3, background: zp.surface.bg2, border: `1px solid ${zp.surface.border}`, borderRadius: zp.radius.sm }}>
          {(["CAD", "USD"] as const).map((c) => {
            const active = currency === c;
            return (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                style={{
                  padding: "6px 16px", borderRadius: zp.radius.xs, border: "none",
                  background: active ? zp.surface.bg1 : "transparent",
                  color: active ? zp.text.primary : zp.text.muted,
                  fontSize: 12, fontWeight: active ? zp.weight.semibold : zp.weight.medium,
                  boxShadow: active ? zp.elevation.sm : undefined, cursor: "pointer",
                }}
              >{c}</button>
            );
          })}
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, fontSize: 12, color: zp.text.muted, fontWeight: zp.weight.semibold }}>
          <input type="checkbox" checked={makeDefault} onChange={(e) => setMakeDefault(e.target.checked)} />
          Make default destination
        </label>

        {err && (
          <div style={{
            marginTop: 12, padding: "10px 12px", borderRadius: zp.radius.sm,
            background: zp.semantic.dangerBg, color: zp.semantic.danger,
            fontSize: 12, fontWeight: zp.weight.semibold,
          }}>{err}</div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <GradientButton variant="ghost" size="md" onClick={onClose} disabled={saving}>Cancel</GradientButton>
          <GradientButton variant="primary" size="md" onClick={submit} disabled={saving || !nickname.trim()}>
            {saving ? "Adding…" : "Add destination"}
          </GradientButton>
        </div>
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
