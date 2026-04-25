// /admin/wallet/revenue — ZeniPay's revenue dashboard.
//
// Pulls platform_amount off zenipay_yield_accruals (the house share
// of yield) and zenipay_payments fees (placeholder — to be wired
// when we start taking fees). Read-only; the data comes from rows
// that cron jobs / webhooks write automatically.

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";
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
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminFetch<{ accruals: AccrualRow[] }>(
        "/api/v1/admin/revenue",
      );
      setAccruals(r.accruals ?? []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useAutoRefresh(load, { intervalMs: 60_000 });

  const stats = useMemo(() => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const m = monthStart.getTime();

    const thisMonth = accruals.filter((a) => new Date(a.accrual_date).getTime() >= m);
    const yieldMonth = thisMonth.reduce((s, a) => s + Number(a.platform_amount ?? 0), 0);
    const yieldAll   = accruals.reduce((s, a) => s + Number(a.platform_amount ?? 0), 0);
    const grossAll   = accruals.reduce((s, a) => s + Number(a.gross_amount ?? 0), 0);
    return { yieldMonth, yieldAll, grossAll, count: accruals.length };
  }, [accruals]);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontFamily: zp.font.display, fontSize: 32, letterSpacing: "-0.03em", fontWeight: zp.weight.semibold, color: zp.text.primary }}>
          Revenue
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: zp.text.muted }}>
          ZeniPay&apos;s passive income: yield platform share + processing fees. Updates automatically as crons run.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 18 }}>
        <Stat label="Yield · this month" value={zp.fmtCurrency(stats.yieldMonth)} accent="green" icon={<TrendingUp size={14} />} />
        <Stat label="Yield · all time"   value={zp.fmtCurrency(stats.yieldAll)} />
        <Stat label="Gross yield · all time" value={zp.fmtCurrency(stats.grossAll)} sub="50/50 client split" />
        <Stat label="Accruals recorded"  value={String(stats.count)} />
      </div>

      <BankingCard padding="none" accent="green">
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${zp.surface.border}` }}>
          <span style={{ fontSize: 13, fontWeight: zp.weight.semibold, color: zp.text.primary }}>Daily accruals</span>
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
          empty="No accruals recorded yet — the daily yield-accrual cron (02:00 UTC) will start populating this once merchants enroll."
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
