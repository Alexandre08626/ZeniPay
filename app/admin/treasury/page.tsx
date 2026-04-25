// /admin/treasury — global treasury view (cross-org).

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BankingCard } from "@/components/dashboard/BankingCard";
import { DataTable } from "@/components/dashboard/DataTable";
import zp from "@/lib/design-system/zenipay-brand";
import { AdminGate } from "../AdminGate";
import { adminFetch } from "../_lib/admin-fetch";

interface AgentRow {
  id: string; name: string; agent_type: string;
  wallet_balance: number; currency: string;
  organization_id: string; status: string;
}

export default function AdminTreasuryPage() {
  return (
    <DashboardShell mode="admin">
      <AdminGate>
        <Inner />
      </AdminGate>
    </DashboardShell>
  );
}

function Inner() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminFetch<{ agents: AgentRow[] }>("/api/v1/admin/agents");
      setAgents(r.agents ?? []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  // Group by org for a quick treasury rollup view.
  const byOrg = new Map<string, { count: number; balance: number; currency: string }>();
  for (const a of agents) {
    const v = byOrg.get(a.organization_id) ?? { count: 0, balance: 0, currency: a.currency };
    v.count += 1;
    v.balance += Number(a.wallet_balance ?? 0);
    byOrg.set(a.organization_id, v);
  }
  const orgRows = Array.from(byOrg.entries()).map(([org, v]) => ({ org, ...v })).sort((a, b) => b.balance - a.balance);
  const totalBalance = agents.reduce((s, a) => s + Number(a.wallet_balance ?? 0), 0);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontFamily: zp.font.display, fontSize: 32, letterSpacing: "-0.03em", fontWeight: zp.weight.semibold, color: zp.text.primary }}>
          Treasury
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: zp.text.muted }}>
          Cross-org rollup of every ZeniCore agent wallet.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 18 }}>
        <Tile label="Total agents"   value={String(agents.length)} accent="green" />
        <Tile label="Orgs"           value={String(byOrg.size)} accent="violet" />
        <Tile label="Total balance"  value={zp.fmtCurrency(totalBalance)} />
      </div>

      <BankingCard padding="none" accent="green">
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${zp.surface.border}`, fontSize: 13, fontWeight: zp.weight.semibold, color: zp.text.primary }}>
          Treasury by org
        </div>
        <DataTable
          rows={orgRows}
          loading={loading && agents.length === 0}
          rowKey={(r) => r.org}
          columns={[
            { key: "org",     header: "Organization", cell: (r) => r.org, width: 360 },
            { key: "count",   header: "Agents", cell: (r) => String(r.count), width: 100 },
            { key: "balance", header: "Total wallet balance", mono: true, align: "right",
              cell: (r) => <span style={{ fontWeight: zp.weight.semibold }}>{zp.fmtCurrency(r.balance, r.currency)}</span> },
          ]}
          empty="No org treasuries yet."
        />
      </BankingCard>
    </>
  );
}

function Tile({ label, value, accent }: { label: string; value: string; accent?: "green" | "violet" | "cyan" }) {
  return (
    <BankingCard accent={accent ?? "neutral"}>
      <div style={{ fontSize: 10, color: zp.text.muted, fontWeight: zp.weight.semibold, letterSpacing: "0.12em", textTransform: "uppercase" as const }}>{label}</div>
      <div style={{ ...zp.amountStyle.large, fontSize: 22, color: zp.text.primary, marginTop: 6 }}>{value}</div>
    </BankingCard>
  );
}
