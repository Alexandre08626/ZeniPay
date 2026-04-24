// /app/overview — PR 20 demo page (Part 4 preview).
//
// Wires the new DashboardShell + BalanceHero + DataTable onto the
// existing banking-ops + stats endpoints. Other /app/* pages fall
// back to the [tab] catch-all → ZenivaComplete until they are
// reskinned in a follow-up session.

"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { SendHorizontal, Wallet, UserPlus, CreditCard, ArrowRight } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BalanceHero } from "@/components/dashboard/BalanceHero";
import { BankingCard } from "@/components/dashboard/BankingCard";
import { DataTable } from "@/components/dashboard/DataTable";
import { LiveIndicator } from "@/components/dashboard/LiveIndicator";
import zp from "@/lib/design-system/zenipay-brand";
import { KybBanner } from "./KybBanner";
import { FinixBalanceTile } from "./FinixBalanceTile";
import { YourCardsStrip } from "./YourCardsStrip";

interface Account {
  id: string;
  account_type: string;
  account_name: string;
  account_number: string;
  balance: number;
  status: string;
  is_primary: boolean;
  currency?: string;
}
interface Transfer {
  id: string;
  transfer_type: string;
  recipient_name: string;
  amount: number;
  fee: number;
  created_at: string;
  status: string;
  memo: string;
}
interface Payment {
  id: string;
  customer: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  date: string;
}
interface Payout { id: string; status?: string }
interface Invoice { id: string; total?: number; status?: string }
interface CardRow { id: string; status?: string }
interface MerchantCardRow { id: string; status: "active" | "frozen" | "cancelled" }

function readMerchantId(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("zp_client") || "";
}
function readFirstName(email?: string): string {
  if (typeof window !== "undefined") {
    const cached = sessionStorage.getItem("zp_client_first_name");
    if (cached) return cached;
  }
  if (!email) return "";
  const base = email.split("@")[0] ?? "";
  const first = base.split(".")[0] ?? base;
  return first.replace(/[^a-zA-Z-]/g, "").replace(/^\w/, (c) => c.toUpperCase());
}

type UnifiedRow = {
  id: string;
  date: string;
  desc: string;
  kind: "income" | "transfer";
  amount: number;
  currency: string;
};

interface ActivityRow {
  id: string;
  source: "payment" | "transfer" | "ledger" | "payout";
  kind: string;
  direction: "in" | "out";
  date: string;
  amount: number;
  currency: string;
  description: string;
  counterparty: string;
  status: string;
  account_id: string | null;
  metadata: Record<string, unknown>;
}

export default function OverviewPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [merchantCards, setMerchantCards] = useState<MerchantCardRow[]>([]);
  const [activityFeed, setActivityFeed] = useState<ActivityRow[]>([]);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const em = sessionStorage.getItem("zp_client_email") || "";
      setEmail(em);
      setFirstName(readFirstName(em));
    }
  }, []);

  const load = useCallback(async () => {
    const mid = readMerchantId();
    if (!mid) return;
    setLoading(true);
    try {
      const [banking, stats, activity, merchCards] = await Promise.all([
        fetch(`/api/zenipay/banking-ops?merchant_id=${encodeURIComponent(mid)}`).then((r) => r.json()),
        fetch(`/api/zenipay/stats?merchant_id=${encodeURIComponent(mid)}`).then((r) => r.json()),
        fetch(`/api/zenipay/merchant-activity?merchant_id=${encodeURIComponent(mid)}&limit=20`).then((r) => r.json()),
        fetch(`/api/v1/merchant/cards?merchant_id=${encodeURIComponent(mid)}`).then((r) => r.json()).catch(() => ({ cards: [] })),
      ]);
      setAccounts(banking.accounts ?? []);
      setTransfers(banking.transfers ?? []);
      setCards(banking.cards ?? []);
      setMerchantCards((merchCards.cards ?? []) as MerchantCardRow[]);
      setPayments(stats.recent_transactions ?? []);
      setPayouts(stats.recent_payouts ?? []);
      setInvoices(stats.recent_invoices ?? []);
      setActivityFeed((activity.activity ?? []) as ActivityRow[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const totalBalance = useMemo(
    () => accounts.reduce((s, a) => s + Number(a.balance || 0), 0),
    [accounts],
  );
  const primaryCurrency = accounts[0]?.currency || "CAD";
  const openInvoices = useMemo(() => invoices.filter((i) => i.status !== "paid"), [invoices]);
  const openInvoicesTotal = openInvoices.reduce((s, i) => s + Number(i.total || 0), 0);
  const pendingPayouts = payouts.filter((p) => p.status !== "completed" && p.status !== "failed").length;
  const activeCards = merchantCards.length > 0
    ? merchantCards.filter((c) => c.status === "active").length
    : cards.filter((c) => (c.status ?? "active") === "active").length;

  const activity: UnifiedRow[] = useMemo(
    () => activityFeed.slice(0, 10).map<UnifiedRow>((a) => ({
      id: a.id,
      date: a.date,
      desc: a.description,
      kind: a.direction === "in" ? "income" : "transfer",
      amount: a.direction === "in" ? a.amount : -a.amount,
      currency: a.currency,
    })),
    [activityFeed],
  );

  const sparkline = useMemo(() => {
    const days = 30;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + 1);
    const buckets = Array.from({ length: days }, () => 0);
    for (const p of payments) {
      if (p.status !== "succeeded") continue;
      const d = new Date(p.date);
      const idx = Math.floor((d.getTime() - start.getTime()) / 86400_000);
      if (idx >= 0 && idx < days) buckets[idx] += Number(p.amount || 0);
    }
    return buckets;
  }, [payments]);

  return (
    <DashboardShell mode="merchant">
      <KybBanner merchantId={readMerchantId()} />
      <BalanceHero
        eyebrow={zp.greeting(firstName)}
        label="Total balance"
        amount={loading && accounts.length === 0 ? 0 : totalBalance}
        currency={primaryCurrency}
        subtitle={
          <>
            {accounts.length} {accounts.length === 1 ? "account" : "accounts"} · total cash across {primaryCurrency}
            <span style={{ margin: "0 8px", opacity: 0.4 }}>·</span>
            <LiveIndicator color={zp.semantic.success} label="Live · auto-synced" />
          </>
        }
        sparklineData={sparkline}
        accent="cyan"
        actions={[
          { label: "Send money",  href: "/app/wallets",  icon: <SendHorizontal size={14} /> },
          { label: "Receive",     href: "/app/wallets",  icon: <Wallet size={14} /> },
          { label: "Add contact", href: "/app/contacts", icon: <UserPlus size={14} /> },
          { label: "Issue card",  href: "/app/cards",    icon: <CreditCard size={14} /> },
        ]}
      />

      {/* Finix balance + Accounts strip */}
      <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        <FinixBalanceTile />
      </div>

      <section style={{ marginTop: 20, marginBottom: 20 }}>
        <SectionHeader title="Accounts" link={{ href: "/app/accounts", label: "Manage accounts" }} />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 12,
          }}
        >
          {(loading && accounts.length === 0 ? [null, null] : accounts).map((a, i) =>
            a ? <AccountCard key={a.id} a={a} /> : <AccountSkeleton key={i} />,
          )}
          <AddAccountCard />
        </div>
      </section>

      <YourCardsStrip />

      {/* Recent activity */}
      <section style={{ marginBottom: 20 }}>
        <SectionHeader title="Recent activity" link={{ href: "/app/transactions", label: "View all" }} />
        <BankingCard padding="none" accent="neutral">
          <DataTable
            rows={activity}
            loading={loading && activity.length === 0}
            rowKey={(r) => r.id}
            columns={[
              { key: "date", header: "Date", cell: (r) => zp.fmtDate(r.date), width: 140 },
              { key: "desc", header: "Description", cell: (r) => r.desc },
              {
                key: "kind",
                header: "Type",
                cell: (r) => <KindPill kind={r.kind} />,
                width: 120,
              },
              {
                key: "amount",
                header: "Amount",
                mono: true,
                align: "right",
                cell: (r) => (
                  <span style={{ color: r.amount >= 0 ? zp.semantic.success : zp.text.primary, fontWeight: zp.weight.semibold }}>
                    {r.amount >= 0 ? "+" : "−"}
                    {zp.fmtCurrency(Math.abs(r.amount), r.currency)}
                  </span>
                ),
                width: 160,
              },
            ]}
            empty="No movements yet. Your first transaction will appear here."
          />
        </BankingCard>
      </section>

      {/* Secondary stats */}
      <section>
        <SectionHeader title="At a glance" />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          <MiniTile
            label="Pending payouts"
            value={String(pendingPayouts)}
            href="/app/transactions?type=transfers"
          />
          <MiniTile
            label="Open invoices"
            value={zp.fmtCurrency(openInvoicesTotal, primaryCurrency)}
            sub={`${openInvoices.length} outstanding`}
            href="/app/invoices"
          />
          <MiniTile label="Active cards" value={String(activeCards)} href="/app/cards" />
          <MiniTile label="Team" value="1" sub="Invite teammates" href="/app/settings#team" />
        </div>
      </section>
    </DashboardShell>
  );
}

function SectionHeader({ title, link }: { title: string; link?: { href: string; label: string } }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
      <h2 style={{
        margin: 0, fontSize: 15, fontWeight: zp.weight.semibold,
        color: zp.text.primary, letterSpacing: "-0.2px",
        fontFamily: zp.font.sans,
      }}>
        {title}
      </h2>
      {link && (
        <Link
          href={link.href}
          style={{
            fontSize: 12, fontWeight: zp.weight.semibold, color: zp.brand.cyan,
            textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4,
          }}
        >
          {link.label} <ArrowRight size={12} />
        </Link>
      )}
    </div>
  );
}

function AccountCard({ a }: { a: Account }) {
  const isSavings = a.account_type?.includes("savings");
  const accent = isSavings ? "violet" : "cyan" as const;
  return (
    <Link href={`/app/accounts/${a.id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <BankingCard accent={accent} interactive>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              {a.is_primary ? "Primary · " : ""}{isSavings ? "Savings" : "Checking"}
            </div>
            <div style={{ fontSize: 15, fontWeight: zp.weight.semibold, color: zp.text.primary, marginTop: 3, letterSpacing: "-0.2px" }}>
              {a.account_name}
            </div>
          </div>
          <LiveIndicator label={a.status === "active" ? "Active" : a.status} color={a.status === "active" ? zp.semantic.success : zp.semantic.warning} pulse={a.status === "active"} size="sm" />
        </div>
        <div style={{ ...zp.amountStyle.large, fontSize: 24, marginTop: 14, color: zp.text.primary }}>
          {zp.fmtCurrency(Number(a.balance || 0), a.currency || "CAD")}
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: zp.text.dim, fontFamily: zp.font.mono, letterSpacing: "0.05em" }}>
          •••• {(a.account_number || "").slice(-4) || "—"}
        </div>
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
    <Link href="/app/accounts?new=1" style={{ textDecoration: "none", color: "inherit" }}>
      <div
        style={{
          border: `1.5px dashed ${zp.surface.borderHover}`,
          borderRadius: zp.radius.md,
          padding: "22px 20px",
          minHeight: 140,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          cursor: "pointer",
          transition: zp.motion.base,
          background: zp.surface.bg2,
        }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: zp.gradient.main, color: "#fff",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, fontWeight: zp.weight.semibold,
        }}>＋</div>
        <div style={{ fontSize: 13, fontWeight: zp.weight.semibold, color: zp.text.primary }}>Add account</div>
        <div style={{ fontSize: 11, color: zp.text.muted }}>Checking, savings, multi-currency</div>
      </div>
    </Link>
  );
}

function KindPill({ kind }: { kind: "income" | "transfer" }) {
  const map = {
    income: { bg: zp.semantic.successBg, fg: zp.semantic.success, label: "Income" },
    transfer: { bg: zp.surface.bg3, fg: zp.text.muted, label: "Transfer" },
  } as const;
  const m = map[kind];
  return (
    <span style={{
      fontSize: 10, fontWeight: zp.weight.semibold, padding: "3px 10px",
      borderRadius: zp.radius.pill, background: m.bg, color: m.fg,
      letterSpacing: "0.06em", textTransform: "uppercase",
    }}>
      {m.label}
    </span>
  );
}

function MiniTile({ label, value, sub, href }: { label: string; value: string; sub?: string; href: string }) {
  return (
    <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
      <BankingCard interactive padding={16}>
        <div style={{
          fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted,
          letterSpacing: "0.12em", textTransform: "uppercase",
        }}>
          {label}
        </div>
        <div style={{ ...zp.amountStyle.base, fontSize: 18, fontWeight: zp.weight.semibold, color: zp.text.primary, marginTop: 6 }}>
          {value}
        </div>
        {sub && (
          <div style={{ fontSize: 11, color: zp.text.muted, marginTop: 4 }}>{sub}</div>
        )}
      </BankingCard>
    </Link>
  );
}

function capitalize(s: string): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}
