// /admin/agents — every agent, every org, real wallet balance.

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BankingCard } from "@/components/dashboard/BankingCard";
import { DataTable } from "@/components/dashboard/DataTable";
import zp from "@/lib/design-system/zenipay-brand";
import { AdminGate } from "../AdminGate";
import { adminFetch } from "../_lib/admin-fetch";
import { CompactZpNumber } from "@/app/components/shared/ZeniPayAccountCard";

interface AgentRow {
  id: string;
  name: string;
  agent_type: string;
  status: string;
  organization_id: string;
  created_at: string;
  wallet_balance: number;
  currency: string;
  zp_account_number: string | null;
  zp_routing_code: string | null;
}

export default function AdminAgentsPage() {
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
  const [statusFilter, setStatusFilter] = useState("");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminFetch<{ agents: AgentRow[] }>("/api/v1/admin/agents");
      setAgents(r.agents ?? []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => agents.filter((a) => {
    if (statusFilter && a.status !== statusFilter) return false;
    if (q) {
      const needle = q.toLowerCase();
      if (!a.name.toLowerCase().includes(needle) && !a.id.toLowerCase().includes(needle)) return false;
    }
    return true;
  }), [agents, statusFilter, q]);

  const stats = useMemo(() => {
    const totalBal = agents.reduce((s, a) => s + Number(a.wallet_balance ?? 0), 0);
    const active   = agents.filter((a) => a.status === "active").length;
    const paused   = agents.filter((a) => a.status === "paused").length;
    return { total: agents.length, active, paused, totalBal };
  }, [agents]);

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontFamily: zp.font.display, fontSize: 32, letterSpacing: "-0.03em", fontWeight: zp.weight.semibold, color: zp.text.primary }}>
          Agents
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: zp.text.muted }}>
          Every AI agent across every org. Wallet balances pulled live from ZeniCore.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 18 }}>
        <Stat label="Total agents"   value={String(stats.total)} accent="green" />
        <Stat label="Active"         value={String(stats.active)} accent="green" />
        <Stat label="Paused"         value={String(stats.paused)} />
        <Stat label="Total balances" value={zp.fmtCurrency(stats.totalBal)} accent="violet" />
      </div>

      <BankingCard padding={14} style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const, alignItems: "flex-end" }}>
          <div>
            <Label>Search</Label>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or ID" style={inputStyle} />
          </div>
          <div>
            <Label>Status</Label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle}>
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </BankingCard>

      <BankingCard padding="none" accent="green">
        <DataTable
          rows={filtered}
          loading={loading && agents.length === 0}
          rowKey={(r) => r.id}
          columns={[
            { key: "name",      header: "Agent",     cell: (r) => (
                <div>
                  <div style={{ fontWeight: zp.weight.semibold, color: zp.text.primary }}>{r.name}</div>
                  <CompactZpNumber accountNumber={r.zp_account_number} routingCode={r.zp_routing_code} />
                </div>
            ) },
            { key: "type",      header: "Type",      cell: (r) => r.agent_type, width: 160 },
            { key: "status",    header: "Status",    cell: (r) => <StatusPill status={r.status} />, width: 100 },
            { key: "org",       header: "Org",       cell: (r) => r.organization_id.slice(0, 14) + "…", width: 160 },
            { key: "balance",   header: "Wallet", mono: true, align: "right", width: 140,
              cell: (r) => <span style={{ fontWeight: zp.weight.semibold }}>{zp.fmtCurrency(Number(r.wallet_balance), r.currency)}</span> },
            { key: "created",   header: "Created",   cell: (r) => zp.fmtDate(r.created_at), width: 120 },
          ]}
          empty="No agents yet."
        />
      </BankingCard>
    </>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "green" | "violet" | "cyan" }) {
  return (
    <BankingCard accent={accent ?? "neutral"}>
      <div style={{ fontSize: 10, color: zp.text.muted, fontWeight: zp.weight.semibold, letterSpacing: "0.12em", textTransform: "uppercase" as const }}>{label}</div>
      <div style={{ ...zp.amountStyle.large, fontSize: 22, color: zp.text.primary, marginTop: 6 }}>{value}</div>
    </BankingCard>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string }> = {
    active: { bg: zp.semantic.successBg, fg: zp.semantic.success },
    paused: { bg: zp.semantic.warningBg, fg: zp.semantic.warning },
    archived: { bg: zp.surface.bg3, fg: zp.text.muted },
  };
  const m = map[status] ?? { bg: zp.surface.bg3, fg: zp.text.muted };
  return (
    <span style={{ fontSize: 10, fontWeight: zp.weight.semibold, padding: "2px 8px", borderRadius: 999, background: m.bg, color: m.fg, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
      {status}
    </span>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label style={{ display: "block", fontSize: 10, color: zp.text.muted, fontWeight: zp.weight.semibold, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 4 }}>{children}</label>;
}

const inputStyle: React.CSSProperties = {
  padding: "8px 10px", borderRadius: zp.radius.sm,
  border: `1px solid ${zp.surface.border}`, background: zp.surface.bg2,
  color: zp.text.primary, fontSize: 13, outline: "none", minWidth: 160,
};
