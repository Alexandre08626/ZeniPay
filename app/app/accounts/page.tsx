// /app/accounts — PR 20 routed page on the new DashboardShell.

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, SendHorizontal, Wallet, Plus, Trash2, X } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BankingCard } from "@/components/dashboard/BankingCard";
import { GradientButton } from "@/components/dashboard/GradientButton";
import { LiveIndicator } from "@/components/dashboard/LiveIndicator";
import zp from "@/lib/design-system/zenipay-brand";
import { formatZPAccount } from "@/lib/zenipay/account-format";

interface Account {
  id: string;
  merchant_id: string;
  account_type: string;
  account_name: string;
  account_number: string;
  routing_number: string;
  balance: number;
  status: string;
  is_primary: boolean;
  currency?: string;
  created_at?: string;
  zp_account_number?: string | null;
  zp_routing_code?: string | null;
}

function mid() {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("zp_client") || "";
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!mid()) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/zenipay/banking-ops?merchant_id=${encodeURIComponent(mid())}`).then((x) => x.json());
      setAccounts((r.accounts ?? []).filter((a: Account) => a.status !== "closed"));
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const total = useMemo(() => accounts.reduce((s, a) => s + Number(a.balance || 0), 0), [accounts]);
  const cur = accounts[0]?.currency || "CAD";

  const closeAccount = async (a: Account) => {
    setErr(null);
    if (a.balance > 0) {
      setErr(`${a.account_name}: move the ${zp.fmtCurrency(a.balance, a.currency || "CAD")} balance out before deleting.`);
      return;
    }
    if (a.is_primary && accounts.length > 1) {
      setErr("Promote another account to primary before deleting this one.");
      return;
    }
    if (!window.confirm(`Delete account "${a.account_name}"? This cannot be undone.`)) return;
    setDeletingId(a.id);
    try {
      const r = await fetch("/api/zenipay/banking-ops", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close_account", merchant_id: mid(), account_id: a.id }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || data?.error) {
        setErr(data?.error || "Delete failed.");
        return;
      }
      await load();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <DashboardShell mode="merchant">
      <PageHeader
        title="Accounts"
        subtitle={`${accounts.length} account${accounts.length === 1 ? "" : "s"} · total ${zp.fmtCurrency(total, cur)}`}
        actions={
          <GradientButton variant="primary" size="md" onClick={() => setShowCreate(true)} icon={<Plus size={14} />}>
            New account
          </GradientButton>
        }
      />

      {err && (
        <BankingCard style={{ marginBottom: 12, borderColor: zp.semantic.danger }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            fontSize: 13, color: zp.semantic.danger, fontWeight: zp.weight.semibold,
          }}>
            {err}
            <button onClick={() => setErr(null)} style={{
              background: "transparent", border: "none", cursor: "pointer", color: zp.semantic.danger,
            }}><X size={14} /></button>
          </div>
        </BankingCard>
      )}

      {loading && accounts.length === 0 ? (
        <AccountsSkeleton />
      ) : accounts.length === 0 ? (
        <EmptyAccounts onCreate={() => setShowCreate(true)} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {accounts.map((a) => (
            <AccountRow
              key={a.id}
              a={a}
              show={!!reveal[a.id]}
              onToggle={() => setReveal((r) => ({ ...r, [a.id]: !r[a.id] }))}
              onDelete={() => closeAccount(a)}
              deleting={deletingId === a.id}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateAccountModal
          onClose={() => setShowCreate(false)}
          onCreated={async () => { setShowCreate(false); await load(); }}
        />
      )}
    </DashboardShell>
  );
}

function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
      <div>
        <h1 style={{
          margin: 0, fontFamily: zp.font.display, fontSize: 32,
          fontWeight: zp.weight.semibold, color: zp.text.primary, letterSpacing: "-0.03em",
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ margin: "4px 0 0", color: zp.text.muted, fontSize: 13 }}>{subtitle}</p>
        )}
      </div>
      {actions && <div style={{ display: "flex", gap: 8 }}>{actions}</div>}
    </div>
  );
}

function AccountRow({
  a, show, onToggle, onDelete, deleting,
}: {
  a: Account;
  show: boolean;
  onToggle: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const router = useRouter();
  const isSavings = a.account_type?.includes("savings");
  const accent = isSavings ? "violet" : "cyan" as const;
  const maskedAcct = show ? a.account_number : `•••• •••• ${(a.account_number || "").slice(-4) || "————"}`;
  const maskedRouting = show ? a.routing_number : (a.routing_number ? `••• ${a.routing_number.slice(-3)}` : "—");

  return (
    <BankingCard
      accent={accent}
      interactive
      padding={22}
      style={{}}
    >
      <div
        onClick={(e) => {
          const t = e.target as HTMLElement;
          if (t.closest("button") || t.closest("a")) return;
          router.push(`/app/accounts/${a.id}`);
        }}
        style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr) auto", gap: 24, alignItems: "center", cursor: "pointer" }}
        className="pr20-acct-row"
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
            {a.is_primary && <Pill label="Primary" tone="brand" />}
            <Pill label={isSavings ? "Savings" : "Checking"} tone="neutral" />
            <LiveIndicator
              label={a.status === "active" ? "Active" : a.status}
              color={a.status === "active" ? zp.semantic.success : zp.semantic.warning}
              pulse={a.status === "active"}
              size="sm"
            />
          </div>
          <div style={{ fontSize: 16, fontWeight: zp.weight.semibold, color: zp.text.primary, letterSpacing: "-0.2px" }}>
            <Link href={`/app/accounts/${a.id}`} style={{ color: "inherit", textDecoration: "none" }}>{a.account_name}</Link>
          </div>
          <div style={{ fontSize: 11, color: zp.text.dim, marginTop: 4 }}>
            Opened {a.created_at ? new Date(a.created_at).toLocaleDateString("en-CA") : "—"}
          </div>
        </div>
        <div>
          <Label>ZeniPay account</Label>
          <div style={{ ...zp.amountStyle.mono, fontSize: 13, color: zp.text.primary, display: "flex", alignItems: "center", gap: 6 }}>
            <span>{a.zp_account_number ? formatZPAccount(a.zp_account_number) : maskedAcct}</span>
            {!a.zp_account_number && (
              <button onClick={onToggle} aria-label={show ? "Hide" : "Show"} style={eyeBtn}>
                {show ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            )}
          </div>
          <Label style={{ marginTop: 8 }}>Routing</Label>
          <div style={{ ...zp.amountStyle.mono, fontSize: 12, color: zp.text.muted }}>
            {a.zp_routing_code || maskedRouting}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <Label>Available</Label>
          <div style={{ ...zp.amountStyle.large, fontSize: 26, color: zp.text.primary, marginTop: 4 }}>
            {zp.fmtCurrency(Number(a.balance || 0), a.currency || "CAD")}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <GradientButton href={`/app/wallets?from=${encodeURIComponent(a.id)}`} variant="primary" size="sm" icon={<SendHorizontal size={12} />}>Send</GradientButton>
          <GradientButton href={`/app/accounts/${a.id}#details`} variant="secondary" size="sm" icon={<Wallet size={12} />}>Receive</GradientButton>
          <button
            onClick={onDelete}
            disabled={deleting}
            aria-label="Delete account"
            title={a.balance > 0 ? "Move the balance out before deleting" : "Delete this account"}
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 30, height: 30, borderRadius: zp.radius.sm,
              background: zp.surface.bg2,
              border: `1px solid ${a.balance > 0 ? zp.surface.border : "rgba(220,38,38,0.25)"}`,
              color: a.balance > 0 ? zp.text.dim : zp.semantic.danger,
              cursor: deleting ? "wait" : "pointer",
            }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .pr20-acct-row { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 540px) {
          .pr20-acct-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </BankingCard>
  );
}

function AccountsSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {Array.from({ length: 2 }).map((_, i) => (
        <BankingCard key={i}>
          <div style={{ display: "flex", gap: 24 }}>
            <div style={{ flex: 1 }}>
              <div style={{ height: 12, width: 90, background: zp.surface.bg3, borderRadius: 4 }} />
              <div style={{ height: 22, width: "60%", background: zp.surface.bg3, borderRadius: 4, marginTop: 10 }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ height: 10, width: 80, background: zp.surface.bg3, borderRadius: 4 }} />
              <div style={{ height: 14, width: 140, background: zp.surface.bg3, borderRadius: 4, marginTop: 8 }} />
            </div>
            <div style={{ width: 180, textAlign: "right" }}>
              <div style={{ height: 10, width: 80, background: zp.surface.bg3, borderRadius: 4, marginLeft: "auto" }} />
              <div style={{ height: 30, width: 140, background: zp.surface.bg3, borderRadius: 4, marginLeft: "auto", marginTop: 8 }} />
            </div>
          </div>
        </BankingCard>
      ))}
    </div>
  );
}

function EmptyAccounts({ onCreate }: { onCreate: () => void | Promise<void> }) {
  return (
    <BankingCard style={{ textAlign: "center", padding: "48px 24px" }}>
      <div style={{ fontSize: 36 }}>🏦</div>
      <h3 style={{ margin: "10px 0 4px", fontSize: 18, fontWeight: zp.weight.semibold, color: zp.text.primary }}>
        No accounts yet
      </h3>
      <p style={{ margin: "0 0 18px", color: zp.text.muted, fontSize: 13 }}>
        Open your first ZeniPay business account to start receiving payments and sending transfers.
      </p>
      <GradientButton variant="primary" onClick={() => { void onCreate(); }}>
        Open my first account
      </GradientButton>
    </BankingCard>
  );
}

function CreateAccountModal({
  onClose, onCreated,
}: {
  onClose: () => void;
  onCreated: () => Promise<void> | void;
}) {
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<"business_checking" | "business_savings">("business_checking");
  const [currency, setCurrency] = useState<"CAD" | "USD">("CAD");
  const [interestRate, setInterestRate] = useState("0.5");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isSavings = accountType === "business_savings";

  const submit = async () => {
    setErr(null);
    if (!name.trim()) { setErr("Give the account a name."); return; }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        action: "create_account",
        merchant_id: mid(),
        account_type: accountType,
        account_name: name.trim(),
        currency,
      };
      if (isSavings) {
        const rate = Number(interestRate);
        if (Number.isFinite(rate) && rate >= 0) body.interest_rate = rate;
      }
      const r = await fetch("/api/zenipay/banking-ops", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || data?.error) { setErr(data?.error || "Create failed."); return; }
      await onCreated();
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
          width: "100%", maxWidth: 480, background: zp.surface.bg1,
          borderRadius: zp.radius.md, padding: 24, boxShadow: zp.elevation.lg,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: zp.weight.semibold, color: zp.text.primary }}>
            Open a new account
          </h3>
          <button onClick={onClose} aria-label="Close" style={{
            background: zp.surface.bg3, border: "none", borderRadius: zp.radius.sm,
            width: 30, height: 30, cursor: "pointer", color: zp.text.primary,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}><X size={16} /></button>
        </div>

        <FieldLabel>Account name</FieldLabel>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Operating — CAD"
          style={modalInput}
          autoFocus
        />

        <FieldLabel style={{ marginTop: 14 }}>Account type</FieldLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <TypeOption
            active={accountType === "business_checking"}
            onClick={() => setAccountType("business_checking")}
            title="Checking"
            sub="Everyday operating. No interest, no limits."
            accent={zp.brand.cyan}
          />
          <TypeOption
            active={accountType === "business_savings"}
            onClick={() => setAccountType("business_savings")}
            title="Savings"
            sub="Earn interest on idle cash."
            accent={zp.brand.violet}
          />
        </div>

        <FieldLabel style={{ marginTop: 14 }}>Currency</FieldLabel>
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

        {isSavings && (
          <>
            <FieldLabel style={{ marginTop: 14 }}>Interest rate (%)</FieldLabel>
            <input
              type="number" step="0.01" min="0"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
              style={modalInput}
            />
          </>
        )}

        {err && (
          <div style={{
            marginTop: 14, padding: "10px 12px", borderRadius: zp.radius.sm,
            background: zp.semantic.dangerBg, color: zp.semantic.danger,
            fontSize: 12, fontWeight: zp.weight.semibold,
          }}>
            {err}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
          <GradientButton variant="ghost" size="md" onClick={onClose}>Cancel</GradientButton>
          <GradientButton variant="primary" size="md" onClick={submit} disabled={saving || !name.trim()}>
            {saving ? "Opening…" : "Open account"}
          </GradientButton>
        </div>
      </div>
    </div>
  );
}

function TypeOption({
  active, onClick, title, sub, accent,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  sub: string;
  accent: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: "left", padding: "12px 14px",
        borderRadius: zp.radius.sm,
        border: `1.5px solid ${active ? accent : zp.surface.border}`,
        background: active ? `${accent}10` : zp.surface.bg2,
        cursor: "pointer",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: zp.weight.semibold, color: zp.text.primary }}>{title}</div>
      <div style={{ fontSize: 11, color: zp.text.muted, marginTop: 2 }}>{sub}</div>
    </button>
  );
}

function FieldLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted,
      letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6, ...style,
    }}>{children}</div>
  );
}

const modalInput: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: zp.radius.sm,
  border: `1px solid ${zp.surface.border}`, background: zp.surface.bg2,
  color: zp.text.primary, fontSize: 14, boxSizing: "border-box", outline: "none", fontFamily: zp.font.sans,
};

function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted,
      letterSpacing: "0.1em", textTransform: "uppercase" as const, ...style,
    }}>{children}</div>
  );
}

function Pill({ label, tone }: { label: string; tone: "brand" | "neutral" }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: zp.weight.semibold, padding: "3px 10px",
      borderRadius: zp.radius.pill,
      background: tone === "brand" ? zp.semantic.infoBg : zp.surface.bg3,
      color: tone === "brand" ? zp.semantic.info : zp.text.muted,
      letterSpacing: "0.08em", textTransform: "uppercase" as const,
    }}>
      {label}
    </span>
  );
}

const eyeBtn: React.CSSProperties = {
  background: "transparent", border: "none", cursor: "pointer",
  padding: 2, color: zp.text.muted, display: "inline-flex", alignItems: "center",
};
