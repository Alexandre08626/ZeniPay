// /admin/wallet/transactions — every transaction for the ZeniPay
// corporate merchant (acc_1774740862294). NOT a client feed.

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BankingCard } from "@/components/dashboard/BankingCard";
import { DataTable } from "@/components/dashboard/DataTable";
import zp from "@/lib/design-system/zenipay-brand";
import { useAutoRefresh } from "@/lib/hooks/useAutoRefresh";
import { AdminGate } from "../../AdminGate";
import { ZENIPAY_CORPORATE_MERCHANT_ID } from "../../_lib/corporate";

interface Activity {
  id: string;
  kind: string;
  direction: "in" | "out";
  date: string;
  amount: number;
  currency: string;
  description: string;
  counterparty: string;
  status: string;
}

export default function AdminWalletTxPage() {
  return (
    <DashboardShell mode="admin">
      <AdminGate>
        <Inner />
      </AdminGate>
    </DashboardShell>
  );
}

function Inner() {
  const [rows, setRows] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const ts = Date.now();
      // x-admin-email lifts the cross-tenant guard so an operator
      // signed in as a different merchant can read ZeniPay corporate's
      // activity. See lib/auth/zp-session.ts.
      const adminEmail =
        typeof window === "undefined"
          ? ""
          : (sessionStorage.getItem("zp_client_email") || "").trim().toLowerCase();
      const headers: Record<string, string> = {};
      if (adminEmail) headers["x-admin-email"] = adminEmail;
      const r = await fetch(
        `/api/zenipay/merchant-activity?merchant_id=${encodeURIComponent(ZENIPAY_CORPORATE_MERCHANT_ID)}&limit=500&_=${ts}`,
        { cache: "no-store", headers },
      ).then((x) => x.json());
      setRows(r.activity ?? []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  // Tight 5s polling on admin pages — real-time view of fees / yield
  // hitting the corporate wallet without WebSockets.
  useAutoRefresh(load, { intervalMs: 5_000 });

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontFamily: zp.font.display, fontSize: 32, letterSpacing: "-0.03em", fontWeight: zp.weight.semibold, color: zp.text.primary }}>
          My Transactions
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: zp.text.muted }}>
          Every move on the ZeniPay Corporate wallet — fees collected, yield earned, withdrawals, internal transfers.
        </p>
      </div>

      <BankingCard padding="none" accent="green">
        <DataTable
          rows={rows}
          loading={loading && rows.length === 0}
          rowKey={(r) => r.id}
          columns={[
            { key: "date",     header: "Date",         cell: (r) => zp.fmtDate(r.date), width: 140 },
            { key: "desc",     header: "Description",  cell: (r) => r.description },
            { key: "counter",  header: "Counterparty", cell: (r) => r.counterparty ?? "—", width: 160 },
            { key: "status",   header: "Status",       cell: (r) => r.status, width: 120 },
            {
              key: "amount", header: "Amount", mono: true, align: "right", width: 160,
              cell: (r) => (
                <span style={{ color: r.direction === "in" ? zp.semantic.success : zp.text.primary, fontWeight: zp.weight.semibold }}>
                  {r.direction === "in" ? "+" : "−"}{zp.fmtCurrency(r.amount, r.currency)}
                </span>
              ),
            },
          ]}
          empty="No activity yet on the ZeniPay Corporate wallet."
        />
      </BankingCard>
    </>
  );
}
