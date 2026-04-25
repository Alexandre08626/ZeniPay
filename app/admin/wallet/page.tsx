// /admin/wallet — ZeniPay Corporate's OWN wallet.
//
// merchant_id is hardcoded to ZENIPAY_CORPORATE_MERCHANT_ID — this
// page NEVER reads sessionStorage zp_client (which would be the
// operator's own merchant row, e.g. zeniva-001).

"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { SendHorizontal, Wallet, ArrowDownToLine, CreditCard, ArrowRight } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BalanceHero } from "@/components/dashboard/BalanceHero";
import { BankingCard } from "@/components/dashboard/BankingCard";
import { DataTable } from "@/components/dashboard/DataTable";
import { LiveIndicator } from "@/components/dashboard/LiveIndicator";
import zp from "@/lib/design-system/zenipay-brand";
import { AdminGate } from "../AdminGate";
import { ZENIPAY_CORPORATE_MERCHANT_ID, ZENIPAY_CORPORATE_NAME } from "../_lib/corporate";
import { CompactZpNumber } from "@/app/components/shared/ZeniPayAccountCard";

interface Account {
  id: string;
  merchant_id: string;
  account_type: string;
  account_name: string;
  account_number: string;
  balance: number;
  currency: string;
  is_primary: boolean;
  status?: string;
  zp_account_number?: string | null;
  zp_routing_code?: string | null;
}

interface Activity {
  id: string;
  kind: string;
  direction: "in" | "out";
  date: string;
  amount: number;
  currency: string;
  description: string;
  status: string;
}

export default function AdminWalletPage() {
  return (
    <DashboardShell mode="admin">
      <AdminGate>
        <Inner />
      </AdminGate>
    </DashboardShell>
  );
}

function Inner() {
  const mid = ZENIPAY_CORPORATE_MERCHANT_ID;
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const ts = Date.now();
      const [banking, feed] = await Promise.all([
        fetch(`/api/zenipay/banking-ops?merchant_id=${encodeURIComponent(mid)}&_=${ts}`,                { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/zenipay/merchant-activity?merchant_id=${encodeURIComponent(mid)}&limit=10&_=${ts}`, { cache: "no-store" }).then((r) => r.json()),
      ]);
      setAccounts(banking.accounts ?? []);
      setActivity(feed.activity ?? []);
    } finally { setLoading(false); }
  }, [mid]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const h = setInterval(() => { void load(); }, 30_000);
    const onFocus = () => { void load(); };
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(h); window.removeEventListener("focus", onFocus); };
  }, [load]);

  // Sum CAD-equivalent total — we don't FX, so display each currency
  // separately in the subtitle.
  const totalsByCurrency = useMemo(() => {
    const t: Record<string, number> = {};
    for (const a of accounts) t[a.currency ?? "CAD"] = (t[a.currency ?? "CAD"] ?? 0) + Number(a.balance ?? 0);
    return t;
  }, [accounts]);
  const primaryCurrency = "CAD";
  const primaryBalance = totalsByCurrency[primaryCurrency] ?? 0;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap" as const, gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: zp.brand.green, fontWeight: zp.weight.semibold, letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: 6 }}>
            ZeniPay Corporate · ZP100000001
          </div>
          <h1 style={{ margin: 0, fontFamily: zp.font.display, fontSize: 32, letterSpacing: "-0.03em", fontWeight: zp.weight.semibold, color: zp.text.primary }}>
            My Wallet
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: zp.text.muted }}>
            {ZENIPAY_CORPORATE_NAME}
          </p>
        </div>
      </div>

      <BalanceHero
        eyebrow="ZeniPay Corporate Treasury"
        label="Total balance"
        amount={primaryBalance}
        currency={primaryCurrency}
        accent="cyan"
        subtitle={
          <>
            {Object.entries(totalsByCurrency).map(([cur, bal], i) => (
              <React.Fragment key={cur}>
                {i > 0 && <span style={{ margin: "0 8px", opacity: 0.5 }}>·</span>}
                {zp.fmtCurrency(bal, cur)} {cur}
              </React.Fragment>
            ))}
            <span style={{ margin: "0 8px", opacity: 0.5 }}>·</span>
            <LiveIndicator color={zp.brand.green} label="ZeniPay HQ" />
          </>
        }
        sparklineData={[]}
        actions={[
          { label: "Send",     href: "/admin/wallet/transactions", icon: <SendHorizontal size={14} /> },
          { label: "Receive",  href: "/admin/wallet",              icon: <Wallet size={14} /> },
          { label: "Cards",    href: "/admin/wallet/cards",        icon: <CreditCard size={14} /> },
          { label: "Revenue",  href: "/admin/wallet/revenue",      icon: <ArrowDownToLine size={14} /> },
        ]}
      />

      <section style={{ marginTop: 20, marginBottom: 20 }}>
        <SectionHeader title="Accounts" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
          {(loading && accounts.length === 0 ? [null, null, null] : accounts).map((a, i) =>
            a ? <AccountCard key={a.id} a={a} /> : <Skeleton key={i} />,
          )}
        </div>
      </section>

      <section style={{ marginBottom: 20 }}>
        <SectionHeader title="Recent activity" link={{ href: "/admin/wallet/transactions", label: "View all" }} />
        <BankingCard padding="none" accent="green">
          <DataTable
            rows={activity.slice(0, 10)}
            loading={loading && activity.length === 0}
            rowKey={(r) => r.id}
            columns={[
              { key: "date",   header: "Date",        cell: (r) => zp.fmtDate(r.date), width: 140 },
              { key: "desc",   header: "Description", cell: (r) => r.description },
              { key: "status", header: "Status",      cell: (r) => r.status, width: 120 },
              {
                key: "amount", header: "Amount", mono: true, align: "right", width: 160,
                cell: (r) => (
                  <span style={{ color: r.direction === "in" ? zp.semantic.success : zp.text.primary, fontWeight: zp.weight.semibold }}>
                    {r.direction === "in" ? "+" : "−"}{zp.fmtCurrency(r.amount, r.currency)}
                  </span>
                ),
              },
            ]}
            empty="No ZeniPay Corporate activity yet."
          />
        </BankingCard>
      </section>
    </>
  );
}

function AccountCard({ a }: { a: Account }) {
  const isSavings = a.account_type?.includes("savings");
  return (
    <BankingCard accent={isSavings ? "violet" : "green"}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted, letterSpacing: "0.12em", textTransform: "uppercase" as const }}>
            {a.is_primary ? "Primary · " : ""}{isSavings ? "Savings" : "Checking"}
          </div>
          <div style={{ fontSize: 15, fontWeight: zp.weight.semibold, color: zp.text.primary, marginTop: 3 }}>
            {a.account_name}
          </div>
        </div>
        <LiveIndicator label="Active" color={zp.semantic.success} pulse size="sm" />
      </div>
      <div style={{ ...zp.amountStyle.large, fontSize: 24, marginTop: 14, color: zp.text.primary }}>
        {zp.fmtCurrency(Number(a.balance ?? 0), a.currency || "CAD")}
      </div>
      <CompactZpNumber accountNumber={a.zp_account_number} routingCode={a.zp_routing_code} />
    </BankingCard>
  );
}

function Skeleton() {
  return (
    <BankingCard>
      <div style={{ height: 12, width: 80, background: zp.surface.bg3, borderRadius: 4 }} />
      <div style={{ height: 24, width: "60%", background: zp.surface.bg3, borderRadius: 4, marginTop: 14 }} />
    </BankingCard>
  );
}

function SectionHeader({ title, link }: { title: string; link?: { href: string; label: string } }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
      <h2 style={{ margin: 0, fontSize: 15, fontWeight: zp.weight.semibold, color: zp.text.primary, letterSpacing: "-0.2px" }}>{title}</h2>
      {link && (
        <Link href={link.href} style={{ fontSize: 12, color: zp.brand.green, textDecoration: "none", fontWeight: zp.weight.semibold, display: "inline-flex", alignItems: "center", gap: 4 }}>
          {link.label} <ArrowRight size={12} />
        </Link>
      )}
    </div>
  );
}
