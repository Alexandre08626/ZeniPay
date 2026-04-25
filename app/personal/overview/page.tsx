// /personal/overview — the home of the Personal banking mode.
//
// Mirrors /app/overview but reads from zenipay_personal_* tables and
// renders with the pink accent. Includes the cross-mode "Move money"
// widget.

"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { SendHorizontal, Wallet, CreditCard, PieChart, ArrowRight } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BalanceHero } from "@/components/dashboard/BalanceHero";
import { BankingCard } from "@/components/dashboard/BankingCard";
import { DataTable } from "@/components/dashboard/DataTable";
import { LiveIndicator } from "@/components/dashboard/LiveIndicator";
import { MoveMoneyWidget } from "../MoveMoneyWidget";
import { CompactZpNumber } from "@/app/components/shared/ZeniPayAccountCard";
import zp from "@/lib/design-system/zenipay-brand";

interface PersonalAccount {
  id: string;
  merchant_id: string;
  account_name: string;
  account_type: string;
  account_number: string;
  balance: number;
  currency: string;
  status: string;
  is_primary: boolean;
  zp_account_number?: string | null;
  zp_routing_code?: string | null;
}

interface PersonalTx {
  id: string;
  merchant_id: string;
  account_id: string;
  type: string;
  amount: number;
  currency: string;
  description: string | null;
  category: string | null;
  created_at: string;
}

interface BusinessAccount {
  id: string;
  account_name: string;
  balance: number;
  currency?: string;
}

function mid(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("zp_client") ?? "";
}
function readFirstName(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("zp_client_first_name") || "";
}

export default function PersonalOverviewPage() {
  const [accounts, setAccounts] = useState<PersonalAccount[]>([]);
  const [txs, setTxs] = useState<PersonalTx[]>([]);
  const [businessAccounts, setBusinessAccounts] = useState<BusinessAccount[]>([]);
  const [firstName, setFirstName] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const m = mid();
    if (!m) return;
    setLoading(true);
    try {
      const ts = Date.now();
      const [accRes, txRes, bankRes] = await Promise.all([
        fetch(`/api/v1/personal/accounts?merchant_id=${encodeURIComponent(m)}&_=${ts}`,                    { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/v1/personal/transactions?merchant_id=${encodeURIComponent(m)}&limit=10&_=${ts}`,        { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/zenipay/banking-ops?merchant_id=${encodeURIComponent(m)}&_=${ts}`,                     { cache: "no-store" }).then((r) => r.json()).catch(() => ({ accounts: [] })),
      ]);
      setAccounts(accRes.accounts ?? []);
      setTxs(txRes.transactions ?? []);
      setBusinessAccounts(bankRes.accounts ?? []);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setFirstName(readFirstName()); }, []);
  // Auto-refresh every 30s + on focus so transfers/payments show up
  // without a manual reload.
  useEffect(() => {
    const interval = setInterval(() => { void load(); }, 30_000);
    const onFocus = () => { void load(); };
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(interval); window.removeEventListener("focus", onFocus); };
  }, [load]);

  const totalBalance = useMemo(
    () => accounts.reduce((s, a) => s + Number(a.balance ?? 0), 0),
    [accounts],
  );
  const primaryCurrency = accounts[0]?.currency ?? "CAD";

  // Sparkline placeholder — flat zero until real activity exists.
  const sparkline = useMemo(() => {
    const buckets = Array.from({ length: 30 }, () => 0);
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
    for (const t of txs) {
      const d = new Date(t.created_at);
      const idx = Math.floor((d.getTime() - start.getTime()) / 86400_000);
      if (idx >= 0 && idx < 30) {
        const sign = (t.type === "income" || t.type === "transfer_in") ? 1 : -1;
        buckets[idx] += sign * Number(t.amount ?? 0);
      }
    }
    return buckets;
  }, [txs]);

  return (
    <DashboardShell mode="personal">
      <BalanceHero
        eyebrow={zp.greeting(firstName)}
        label="Total personal balance"
        amount={loading && accounts.length === 0 ? 0 : totalBalance}
        currency={primaryCurrency}
        accent="pink"
        subtitle={
          <>
            {accounts.length} {accounts.length === 1 ? "account" : "accounts"}
            <span style={{ margin: "0 8px", opacity: 0.4 }}>·</span>
            <LiveIndicator color={zp.brand.pink} label="Personal" />
          </>
        }
        sparklineData={sparkline}
        actions={[
          { label: "Send",     href: "/personal/wallets",      icon: <SendHorizontal size={14} /> },
          { label: "Receive",  href: "/personal/wallets",      icon: <Wallet size={14} /> },
          { label: "Cards",    href: "/personal/cards",        icon: <CreditCard size={14} /> },
          { label: "Budget",   href: "/personal/budget",       icon: <PieChart size={14} /> },
        ]}
      />

      <section style={{ marginTop: 20, marginBottom: 20 }}>
        <SectionHeader title="Personal accounts" link={{ href: "/personal/accounts", label: "Manage accounts" }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
          {(loading && accounts.length === 0 ? [null, null] : accounts).map((a, i) =>
            a ? <AccountCard key={a.id} a={a} /> : <AccountSkeleton key={i} />,
          )}
          <AddAccountCard />
        </div>
      </section>

      <section style={{ marginBottom: 20 }}>
        <SectionHeader title="Move money" />
        <MoveMoneyWidget
          merchantId={mid()}
          personalAccounts={accounts}
          businessAccounts={businessAccounts}
          onComplete={load}
        />
      </section>

      <section style={{ marginBottom: 20 }}>
        <SectionHeader title="Recent activity" link={{ href: "/personal/transactions", label: "View all" }} />
        <BankingCard padding="none" accent="neutral">
          <DataTable
            rows={txs.slice(0, 5)}
            loading={loading && txs.length === 0}
            rowKey={(r) => r.id}
            columns={[
              { key: "date", header: "Date", cell: (r) => zp.fmtDate(r.created_at), width: 140 },
              { key: "desc", header: "Description", cell: (r) => r.description ?? r.type.replace(/_/g, " ") },
              { key: "type", header: "Type", cell: (r) => <TypePill type={r.type} />, width: 120 },
              {
                key: "amount", header: "Amount", mono: true, align: "right", width: 160,
                cell: (r) => {
                  const sign = (r.type === "income" || r.type === "transfer_in") ? 1 : -1;
                  return (
                    <span style={{ color: sign > 0 ? zp.semantic.success : zp.text.primary, fontWeight: zp.weight.semibold }}>
                      {sign > 0 ? "+" : "−"}{zp.fmtCurrency(Number(r.amount), r.currency)}
                    </span>
                  );
                },
              },
            ]}
            empty="No personal activity yet."
          />
        </BankingCard>
      </section>
    </DashboardShell>
  );
}

function SectionHeader({ title, link }: { title: string; link?: { href: string; label: string } }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
      <h2 style={{ margin: 0, fontSize: 15, fontWeight: zp.weight.semibold, color: zp.text.primary, letterSpacing: "-0.2px" }}>{title}</h2>
      {link && (
        <Link href={link.href} style={{ fontSize: 12, fontWeight: zp.weight.semibold, color: zp.brand.pink, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
          {link.label} <ArrowRight size={12} />
        </Link>
      )}
    </div>
  );
}

function AccountCard({ a }: { a: PersonalAccount }) {
  const isSavings = a.account_type === "savings";
  const accent = isSavings ? "violet" : "pink" as const;
  return (
    <Link href={`/personal/accounts/${a.id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <BankingCard accent={accent} interactive>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              {a.is_primary ? "Primary · " : ""}{a.account_type}
            </div>
            <div style={{ fontSize: 15, fontWeight: zp.weight.semibold, color: zp.text.primary, marginTop: 3 }}>
              {a.account_name}
            </div>
          </div>
          <LiveIndicator label={a.status === "active" ? "Active" : a.status} color={a.status === "active" ? zp.semantic.success : zp.semantic.warning} pulse={a.status === "active"} size="sm" />
        </div>
        <div style={{ ...zp.amountStyle.large, fontSize: 24, marginTop: 14, color: zp.text.primary }}>
          {zp.fmtCurrency(Number(a.balance ?? 0), a.currency || "CAD")}
        </div>
        <CompactZpNumber accountNumber={a.zp_account_number} routingCode={a.zp_routing_code} />
      </BankingCard>
    </Link>
  );
}

function AccountSkeleton() {
  return (
    <BankingCard>
      <div style={{ height: 12, width: 80, background: zp.surface.bg3, borderRadius: 4 }} />
      <div style={{ height: 22, width: "60%", background: zp.surface.bg3, borderRadius: 4, marginTop: 14 }} />
      <div style={{ height: 10, width: 100, background: zp.surface.bg3, borderRadius: 4, marginTop: 14 }} />
    </BankingCard>
  );
}

function AddAccountCard() {
  return (
    <Link href="/personal/accounts?new=1" style={{ textDecoration: "none", color: "inherit" }}>
      <div style={{
        border: `1.5px dashed ${zp.surface.borderHover}`,
        borderRadius: zp.radius.md,
        padding: "22px 20px",
        minHeight: 140,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
        cursor: "pointer", background: zp.surface.bg2,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: zp.gradient.personal, color: "#fff",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, fontWeight: zp.weight.semibold,
        }}>＋</div>
        <div style={{ fontSize: 13, fontWeight: zp.weight.semibold, color: zp.text.primary }}>Add account</div>
        <div style={{ fontSize: 11, color: zp.text.muted }}>Checking, savings, investment</div>
      </div>
    </Link>
  );
}

function TypePill({ type }: { type: string }) {
  const isCredit = type === "income" || type === "transfer_in";
  const map = isCredit
    ? { bg: zp.semantic.successBg, fg: zp.semantic.success, label: type === "income" ? "Income" : "Transfer in" }
    : { bg: zp.surface.bg3,        fg: zp.text.muted,       label: type === "expense" ? "Expense" : "Transfer out" };
  return (
    <span style={{
      fontSize: 10, fontWeight: zp.weight.semibold, padding: "3px 10px",
      borderRadius: zp.radius.pill, background: map.bg, color: map.fg,
      letterSpacing: "0.06em", textTransform: "uppercase" as const,
    }}>{map.label}</span>
  );
}
