// /admin/wallet/revenue — ZeniPay's revenue dashboard.
//
// Two revenue streams:
//   - Platform fees from card payments (2.9% + $0.30, skimmed by
//     process-payment and credited to acc_1774740862294 corporate).
//   - Yield platform share (zenipay_yield_accruals, daily cron).

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { TrendingUp, Coins } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BankingCard } from "@/components/dashboard/BankingCard";
import { DataTable } from "@/components/dashboard/DataTable";
import zp from "@/lib/design-system/zenipay-brand";
import { useAutoRefresh } from "@/lib/hooks/useAutoRefresh";
import { AdminGate } from "../../AdminGate";
import { adminFetch } from "../../_lib/admin-fetch";

interface AccrualRow {
  id: string;
  merchant_id: string;
  accrual_date: string;
  gross_amount: number;
  platform_amount: number;
  client_amount: number;
  currency: string;
}

interface FeeRow {
  id: string;
  payment_id: string | null;
  amount: number;
  currency: string;
  note: string | null;
  reference: string | null;
  created_at: string;
}

interface RevenueResp {
  accruals: AccrualRow[];
  fees: FeeRow[];
  summary: {
    fees_this_month: number;
    fees_all_time: number;
    yield_this_month: number;
    yield_all_time: number;
    total_revenue_all_time: number;
    currency: string;
  };
}

const EMPTY_SUMMARY: RevenueResp["summary"] = {
  fees_this_month: 0, fees_all_time: 0,
  yield_this_month: 0, yield_all_time: 0,
  total_revenue_all_time: 0, currency: "CAD",
};

export default function AdminWalletRevenuePage() {
  return (
    <DashboardShell mode="admin">
      <AdminGate>
        <Inner />
      </AdminGate>
    </DashboardShell>
  );
}

function Inner() {
  const [accruals, setAccruals] = useState<AccrualRow[]>([]);
  const [fees, setFees] = useState<FeeRow[]>([]);
  const [summary, setSummary] = useState<RevenueResp["summary"]>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminFetch<RevenueResp>("/api/v1/admin/revenue");
      setAccruals(r.accruals ?? []);
      setFees(r.fees ?? []);
      setSummary(r.summary ?? EMPTY_SUMMARY);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useAutoRefresh(load, { intervalMs: 60_000 });

  const totalThisMonth = (summary.fees_this_month ?? 0) + (summary.yield_this_month ?? 0);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontFamily: zp.font.display, fontSize: 32, letterSpacing: "-0.03em", fontWeight: zp.weight.semibold, color: zp.text.primary }}>
          Revenue
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: zp.text.muted }}>
          ZeniPay&apos;s passive income — platform fees on card payments + yield platform share. Updates automatically.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 18 }}>
        <Stat
          label="Total · all time"
          value={zp.fmtCurrency(summary.total_revenue_all_time, summary.currency)}
          accent="green"
          icon={<TrendingUp size={14} />}
        />
        <Stat
          label="Total · this month"
          value={zp.fmtCurrency(totalThisMonth, summary.currency)}
          sub="fees + yield"
        />
        <Stat
          label="Platform fees · all time"
          value={zp.fmtCurrency(summary.fees_all_time, summary.currency)}
          accent="cyan"
          sub="2.9% + $0.30 / card"
          icon={<Coins size={14} />}
        />
        <Stat
          label="Yield share · all time"
          value={zp.fmtCurrency(summary.yield_all_time, summary.currency)}
          accent="violet"
          sub="50/50 client split"
        />
      </div>

      {/* Platform fees */}
      <BankingCard padding="none" accent="cyan" style={{ marginBottom: 18 }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${zp.surface.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: 13, fontWeight: zp.weight.semibold, color: zp.text.primary }}>Platform fees</span>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: zp.text.muted }}>
              Each card payment skims 2.9% + $0.30 to ZeniPay corporate (acc_1774740862294).
            </p>
          </div>
          <span style={{ fontSize: 11, color: zp.text.muted, fontWeight: zp.weight.semibold }}>
            {fees.length} {fees.length === 1 ? "fee" : "fees"} · this month {zp.fmtCurrency(summary.fees_this_month, summary.currency)}
          </span>
        </div>
        <DataTable
          rows={fees}
          loading={loading && fees.length === 0}
          rowKey={(r) => r.id}
          columns={[
            { key: "date", header: "Date", cell: (r) => zp.fmtDate(r.created_at), width: 160 },
            { key: "payment", header: "Payment", cell: (r) => r.payment_id ?? r.reference ?? "—", width: 180 },
            { key: "note", header: "Source", cell: (r) => r.note ?? "—" },
            { key: "amount", header: "Fee", mono: true, align: "right", width: 130,
              cell: (r) => <span style={{ color: zp.brand.green, fontWeight: zp.weight.semibold }}>+{zp.fmtCurrency(Number(r.amount), r.currency)}</span> },
          ]}
          empty="No platform fees collected yet."
        />
      </BankingCard>

      {/* Yield accruals */}
      <BankingCard padding="none" accent="violet">
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${zp.surface.border}` }}>
          <span style={{ fontSize: 13, fontWeight: zp.weight.semibold, color: zp.text.primary }}>Yield accruals</span>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: zp.text.muted }}>
            Daily yield-accrual cron (02:00 UTC). 50/50 split with the client.
          </p>
        </div>
        <DataTable
          rows={accruals}
          loading={loading && accruals.length === 0}
          rowKey={(r) => r.id}
          columns={[
            { key: "date",     header: "Date",       cell: (r) => r.accrual_date, width: 140 },
            { key: "merchant", header: "Merchant",   cell: (r) => r.merchant_id, width: 180 },
            { key: "gross",    header: "Gross",      mono: true, align: "right", width: 120,
              cell: (r) => zp.fmtCurrency(Number(r.gross_amount), r.currency) },
            { key: "platform", header: "ZeniPay share", mono: true, align: "right", width: 140,
              cell: (r) => <span style={{ color: zp.brand.green, fontWeight: zp.weight.semibold }}>+{zp.fmtCurrency(Number(r.platform_amount), r.currency)}</span> },
            { key: "client",   header: "Client share",  mono: true, align: "right", width: 140,
              cell: (r) => zp.fmtCurrency(Number(r.client_amount), r.currency) },
          ]}
          empty="No yield accruals yet — populated by the daily cron once merchants enroll in yield."
        />
      </BankingCard>
    </>
  );
}

function Stat({ label, value, sub, accent, icon }: { label: string; value: string; sub?: string; accent?: "green" | "cyan" | "violet"; icon?: React.ReactNode }) {
  return (
    <BankingCard accent={accent ?? "neutral"}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 10, color: zp.text.muted, fontWeight: zp.weight.semibold, letterSpacing: "0.12em", textTransform: "uppercase" as const }}>{label}</div>
        {icon && <span style={{ color: zp.brand.green }}>{icon}</span>}
      </div>
      <div style={{ ...zp.amountStyle.large, fontSize: 22, color: zp.text.primary, marginTop: 6 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: zp.text.muted, marginTop: 4 }}>{sub}</div>}
    </BankingCard>
  );
}
