// /personal/accounts/[id] — single account detail + recent transactions.

"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BankingCard } from "@/components/dashboard/BankingCard";
import { DataTable } from "@/components/dashboard/DataTable";
import { LiveIndicator } from "@/components/dashboard/LiveIndicator";
import zp from "@/lib/design-system/zenipay-brand";

interface PersonalAccount {
  id: string;
  name: string;
  account_type: string;
  account_number: string;
  balance: number;
  currency: string;
  status: string;
  is_primary: boolean;
}
interface PersonalTx {
  id: string;
  account_id: string;
  type: string;
  amount: number;
  currency: string;
  description: string | null;
  category: string | null;
  created_at: string;
}

function mid(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("zp_client") ?? "";
}

export default function PersonalAccountDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const [account, setAccount] = useState<PersonalAccount | null>(null);
  const [txs, setTxs] = useState<PersonalTx[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const m = mid();
    if (!m || !id) return;
    setLoading(true);
    try {
      const [accs, ts] = await Promise.all([
        fetch(`/api/v1/personal/accounts?merchant_id=${encodeURIComponent(m)}`).then((r) => r.json()),
        fetch(`/api/v1/personal/transactions?merchant_id=${encodeURIComponent(m)}&account_id=${encodeURIComponent(id)}&limit=50`).then((r) => r.json()),
      ]);
      const a = (accs.accounts as PersonalAccount[]).find((x) => x.id === id) ?? null;
      setAccount(a);
      setTxs(ts.transactions ?? []);
    } finally { setLoading(false); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  return (
    <DashboardShell mode="personal">
      <div style={{ marginBottom: 14 }}>
        <Link href="/personal/accounts" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: zp.text.muted, textDecoration: "none" }}>
          <ArrowLeft size={12} /> Back to accounts
        </Link>
      </div>

      {loading && !account ? (
        <BankingCard><div style={{ color: zp.text.muted, fontSize: 13 }}>Loading…</div></BankingCard>
      ) : !account ? (
        <BankingCard><div style={{ fontSize: 13, color: zp.semantic.danger }}>Account not found.</div></BankingCard>
      ) : (
        <>
          <BankingCard accent="pink" style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" as const, gap: 14 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted, letterSpacing: "0.12em", textTransform: "uppercase" as const }}>
                  {account.is_primary ? "Primary · " : ""}{account.account_type}
                </div>
                <h1 style={{ margin: "4px 0 0", fontFamily: zp.font.display, fontSize: 28, fontWeight: zp.weight.semibold, color: zp.text.primary, letterSpacing: "-0.02em" }}>
                  {account.name}
                </h1>
              </div>
              <LiveIndicator label={account.status} color={account.status === "active" ? zp.semantic.success : zp.semantic.warning} pulse={account.status === "active"} size="sm" />
            </div>
            <div style={{ ...zp.amountStyle.large, fontSize: 32, marginTop: 16, color: zp.text.primary }}>
              {zp.fmtCurrency(Number(account.balance ?? 0), account.currency)}
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: zp.text.dim, fontFamily: zp.font.mono }}>
              {account.account_number}
            </div>
          </BankingCard>

          <BankingCard padding="none">
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${zp.surface.border}` }}>
              <span style={{ fontSize: 13, fontWeight: zp.weight.semibold, color: zp.text.primary }}>Transactions</span>
            </div>
            <DataTable
              rows={txs}
              loading={loading && txs.length === 0}
              rowKey={(r) => r.id}
              columns={[
                { key: "date", header: "Date", cell: (r) => zp.fmtDate(r.created_at), width: 140 },
                { key: "desc", header: "Description", cell: (r) => r.description ?? r.type.replace(/_/g, " ") },
                { key: "category", header: "Category", cell: (r) => r.category ?? "—", width: 140 },
                {
                  key: "amount", header: "Amount", mono: true, align: "right", width: 160,
                  cell: (r) => {
                    const credit = r.type === "income" || r.type === "transfer_in";
                    return (
                      <span style={{ color: credit ? zp.semantic.success : zp.text.primary, fontWeight: zp.weight.semibold }}>
                        {credit ? "+" : "−"}{zp.fmtCurrency(Number(r.amount), r.currency)}
                      </span>
                    );
                  },
                },
              ]}
              empty="No activity on this account yet."
            />
          </BankingCard>
        </>
      )}
    </DashboardShell>
  );
}
