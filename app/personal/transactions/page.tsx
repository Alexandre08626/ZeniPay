// /personal/transactions — full transaction history with filters.

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BankingCard } from "@/components/dashboard/BankingCard";
import { DataTable } from "@/components/dashboard/DataTable";
import zp from "@/lib/design-system/zenipay-brand";
import { useAutoRefresh } from "@/lib/hooks/useAutoRefresh";

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
interface PersonalAccount { id: string; account_name: string }

function mid(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("zp_client") ?? "";
}

export default function PersonalTransactionsPage() {
  const [txs, setTxs] = useState<PersonalTx[]>([]);
  const [accounts, setAccounts] = useState<PersonalAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<string>("");
  const [type, setType] = useState<string>("");

  const load = useCallback(async () => {
    const m = mid();
    if (!m) return;
    setLoading(true);
    try {
      const sp = new URLSearchParams({ merchant_id: m, limit: "100" });
      if (account) sp.set("account_id", account);
      if (type)    sp.set("type", type);
      const ts = Date.now();
      sp.set("_", String(ts));
      const [txRes, accRes] = await Promise.all([
        fetch(`/api/v1/personal/transactions?${sp.toString()}`,                             { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/v1/personal/accounts?merchant_id=${encodeURIComponent(m)}&_=${ts}`,     { cache: "no-store" }).then((r) => r.json()),
      ]);
      setTxs(txRes.transactions ?? []);
      setAccounts(accRes.accounts ?? []);
    } finally { setLoading(false); }
  }, [account, type]);
  useEffect(() => { void load(); }, [load]);
  useAutoRefresh(load);

  const accountName = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of accounts) m.set(a.id, a.account_name);
    return m;
  }, [accounts]);

  return (
    <DashboardShell mode="personal">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontFamily: zp.font.display, fontSize: 32, letterSpacing: "-0.03em", fontWeight: zp.weight.semibold, color: zp.text.primary }}>Transactions</h1>
        <p style={{ margin: "4px 0 0", color: zp.text.muted, fontSize: 13 }}>
          All personal account activity in one feed.
        </p>
      </div>

      <BankingCard padding={14} style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "inline-flex", flexDirection: "column" as const, gap: 4 }}>
            <span style={{ fontSize: 10, color: zp.text.muted, fontWeight: zp.weight.semibold, textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>Account</span>
            <select value={account} onChange={(e) => setAccount(e.target.value)} style={selectStyle}>
              <option value="">All</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.account_name}</option>)}
            </select>
          </div>
          <div style={{ display: "inline-flex", flexDirection: "column" as const, gap: 4 }}>
            <span style={{ fontSize: 10, color: zp.text.muted, fontWeight: zp.weight.semibold, textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>Type</span>
            <select value={type} onChange={(e) => setType(e.target.value)} style={selectStyle}>
              <option value="">All</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="transfer_in">Transfer in</option>
              <option value="transfer_out">Transfer out</option>
            </select>
          </div>
        </div>
      </BankingCard>

      <BankingCard padding="none">
        <DataTable
          rows={txs}
          loading={loading && txs.length === 0}
          rowKey={(r) => r.id}
          columns={[
            { key: "date", header: "Date", cell: (r) => zp.fmtDate(r.created_at), width: 140 },
            { key: "desc", header: "Description", cell: (r) => r.description ?? r.type.replace(/_/g, " ") },
            { key: "category", header: "Category", cell: (r) => r.category ?? "—", width: 140 },
            { key: "account", header: "Account", cell: (r) => accountName.get(r.account_id) ?? "—", width: 160 },
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
          empty="No transactions match your filters."
        />
      </BankingCard>
    </DashboardShell>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "8px 10px", borderRadius: zp.radius.sm,
  border: `1px solid ${zp.surface.border}`, background: zp.surface.bg2,
  color: zp.text.primary, fontSize: 13, outline: "none", minWidth: 140,
};
