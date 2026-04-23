// /app/accounts — PR 20 routed page on the new DashboardShell.

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, SendHorizontal, Wallet, Plus } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BankingCard } from "@/components/dashboard/BankingCard";
import { GradientButton } from "@/components/dashboard/GradientButton";
import { LiveIndicator } from "@/components/dashboard/LiveIndicator";
import zp from "@/lib/design-system/zenipay-brand";

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
}

function mid() {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("zp_client") || "";
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [reveal, setReveal] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!mid()) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/zenipay/banking-ops?merchant_id=${encodeURIComponent(mid())}`).then((x) => x.json());
      setAccounts(r.accounts ?? []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const total = useMemo(() => accounts.reduce((s, a) => s + Number(a.balance || 0), 0), [accounts]);
  const cur = accounts[0]?.currency || "CAD";

  const createAccount = async () => {
    if (!mid()) return;
    await fetch("/api/zenipay/banking-ops", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_account", merchant_id: mid(), account_type: "business_checking", currency: "CAD" }),
    });
    await load();
  };

  return (
    <DashboardShell mode="merchant">
      <PageHeader
        title="Accounts"
        subtitle={`${accounts.length} account${accounts.length === 1 ? "" : "s"} · total ${zp.fmtCurrency(total, cur)}`}
        actions={
          <GradientButton variant="primary" size="md" onClick={createAccount} icon={<Plus size={14} />}>
            New account
          </GradientButton>
        }
      />

      {loading && accounts.length === 0 ? (
        <AccountsSkeleton />
      ) : accounts.length === 0 ? (
        <EmptyAccounts onCreate={createAccount} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {accounts.map((a) => (
            <AccountRow
              key={a.id}
              a={a}
              show={!!reveal[a.id]}
              onToggle={() => setReveal((r) => ({ ...r, [a.id]: !r[a.id] }))}
            />
          ))}
        </div>
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

function AccountRow({ a, show, onToggle }: { a: Account; show: boolean; onToggle: () => void }) {
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
          <Label>Account number</Label>
          <div style={{ ...zp.amountStyle.mono, fontSize: 13, color: zp.text.primary, display: "flex", alignItems: "center", gap: 6 }}>
            <span>{maskedAcct}</span>
            <button onClick={onToggle} aria-label={show ? "Hide" : "Show"} style={eyeBtn}>
              {show ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <Label style={{ marginTop: 8 }}>Routing</Label>
          <div style={{ ...zp.amountStyle.mono, fontSize: 12, color: zp.text.muted }}>{maskedRouting}</div>
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
