// /personal/accounts — list + create personal accounts.

"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BankingCard } from "@/components/dashboard/BankingCard";
import { GradientButton } from "@/components/dashboard/GradientButton";
import { LiveIndicator } from "@/components/dashboard/LiveIndicator";
import zp from "@/lib/design-system/zenipay-brand";
import { CompactZpNumber } from "@/app/components/shared/ZeniPayAccountCard";

interface PersonalAccount {
  id: string;
  name: string;
  account_type: string;
  account_number: string;
  balance: number;
  currency: string;
  status: string;
  is_primary: boolean;
  zp_account_number?: string | null;
  zp_routing_code?: string | null;
}

function mid(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("zp_client") ?? "";
}

export default function PersonalAccountsPage() {
  const [accounts, setAccounts] = useState<PersonalAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const m = mid();
    if (!m) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/v1/personal/accounts?merchant_id=${encodeURIComponent(m)}`).then((x) => x.json());
      setAccounts(r.accounts ?? []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <DashboardShell mode="personal">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: zp.font.display, fontSize: 32, letterSpacing: "-0.03em", fontWeight: zp.weight.semibold, color: zp.text.primary }}>Accounts</h1>
          <p style={{ margin: "4px 0 0", color: zp.text.muted, fontSize: 13 }}>
            Personal checking, savings, investment & crypto.
          </p>
        </div>
        <GradientButton variant="primary" size="md" onClick={() => setOpen(true)} icon={<Plus size={14} />} style={{ background: zp.gradient.personal }}>
          Add personal account
        </GradientButton>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        {loading && accounts.length === 0
          ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} />)
          : accounts.length === 0
            ? <BankingCard style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px 20px" }}>
                <div style={{ fontSize: 30 }}>💼</div>
                <div style={{ fontSize: 16, fontWeight: zp.weight.semibold, color: zp.text.primary, marginTop: 8 }}>No accounts yet</div>
                <div style={{ fontSize: 12, color: zp.text.muted, marginTop: 4 }}>Open a personal account to start managing your money.</div>
              </BankingCard>
            : accounts.map((a) => <Card key={a.id} a={a} />)}
      </div>

      {open && <AddAccountModal onClose={() => setOpen(false)} onCreated={async () => { setOpen(false); await load(); }} />}
    </DashboardShell>
  );
}

function Card({ a }: { a: PersonalAccount }) {
  const accent = a.account_type === "savings" ? "violet" : "pink";
  return (
    <Link href={`/personal/accounts/${a.id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <BankingCard accent={accent} interactive>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              {a.is_primary ? "Primary · " : ""}{a.account_type}
            </div>
            <div style={{ fontSize: 16, fontWeight: zp.weight.semibold, color: zp.text.primary, marginTop: 3 }}>{a.name}</div>
          </div>
          <LiveIndicator label={a.status} color={a.status === "active" ? zp.semantic.success : zp.semantic.warning} pulse={a.status === "active"} size="sm" />
        </div>
        <div style={{ ...zp.amountStyle.large, fontSize: 26, marginTop: 14, color: zp.text.primary }}>
          {zp.fmtCurrency(Number(a.balance ?? 0), a.currency || "CAD")}
        </div>
        <CompactZpNumber accountNumber={a.zp_account_number} routingCode={a.zp_routing_code} />
      </BankingCard>
    </Link>
  );
}

function Skeleton() {
  return (
    <BankingCard>
      <div style={{ height: 12, width: 80, background: zp.surface.bg3, borderRadius: 4 }} />
      <div style={{ height: 26, width: "60%", background: zp.surface.bg3, borderRadius: 4, marginTop: 14 }} />
      <div style={{ height: 10, width: 100, background: zp.surface.bg3, borderRadius: 4, marginTop: 14 }} />
    </BankingCard>
  );
}

function AddAccountModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"checking" | "savings" | "investment" | "crypto">("checking");
  const [currency, setCurrency] = useState("CAD");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (name.trim().length < 2) { setErr("Name required"); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/v1/personal/accounts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchant_id: mid(), name: name.trim(), account_type: type, currency }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(data?.error?.message ?? "Failed"); return; }
      await onCreated();
    } finally { setBusy(false); }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: zp.surface.overlay, backdropFilter: "blur(6px)", zIndex: zp.zIndex.modal, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: zp.surface.bg1, borderRadius: zp.radius.lg, width: "100%", maxWidth: 460, padding: 22, boxShadow: zp.elevation.lg }}>
        <h2 style={{ margin: 0, fontFamily: zp.font.display, fontSize: 20, fontWeight: zp.weight.semibold, color: zp.text.primary }}>Add personal account</h2>
        <div style={{ marginTop: 18 }}>
          <Label>Account name</Label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Vacation savings" style={inputStyle} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
          <div>
            <Label>Type</Label>
            <select value={type} onChange={(e) => setType(e.target.value as typeof type)} style={inputStyle}>
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
              <option value="investment">Investment</option>
              <option value="crypto">Crypto</option>
            </select>
          </div>
          <div>
            <Label>Currency</Label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={inputStyle}>
              <option value="CAD">CAD</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>
        {err && (
          <div style={{ marginTop: 12, padding: "8px 10px", borderRadius: zp.radius.sm, background: zp.semantic.dangerBg, color: zp.semantic.danger, fontSize: 12, fontWeight: zp.weight.semibold }}>{err}</div>
        )}
        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <GradientButton variant="secondary" size="md" onClick={onClose} style={{ flex: 1 }}>Cancel</GradientButton>
          <GradientButton variant="primary" size="md" onClick={submit} disabled={busy} style={{ flex: 1, background: zp.gradient.personal }}>
            {busy ? "Creating…" : "Create"}
          </GradientButton>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label style={{ display: "block", fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6 }}>{children}</label>;
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: zp.radius.sm,
  border: `1px solid ${zp.surface.border}`, background: zp.surface.bg2,
  color: zp.text.primary, fontSize: 14, boxSizing: "border-box", outline: "none",
};
