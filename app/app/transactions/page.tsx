// /app/transactions — unified activity feed on the new shell.

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Download, X } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BankingCard } from "@/components/dashboard/BankingCard";
import { DataTable } from "@/components/dashboard/DataTable";
import { GradientButton } from "@/components/dashboard/GradientButton";
import zp from "@/lib/design-system/zenipay-brand";

type TxKind = "income" | "transfer" | "payout" | "fee";
type TypeFilter = "all" | "income" | "spending" | "transfers" | "fees";

interface UnifiedRow {
  id: string;
  kind: TxKind;
  date: string;
  description: string;
  counterparty: string;
  amount: number;
  currency: string;
  status: string;
  accountId: string | null;
  raw: Record<string, unknown>;
}

function mid() { return typeof window === "undefined" ? "" : sessionStorage.getItem("zp_client") || ""; }

function readInitialFilters() {
  if (typeof window === "undefined") return { type: "all" as TypeFilter, account: "", range: "30d", min: "", max: "", q: "" };
  const p = new URLSearchParams(window.location.search);
  return {
    type: (p.get("type") as TypeFilter) || "all",
    account: p.get("account") || "",
    range: p.get("range") || "30d",
    min: p.get("min") || "",
    max: p.get("max") || "",
    q: p.get("q") || "",
  };
}

export default function TransactionsPage() {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [accountFilter, setAccountFilter] = useState("");
  const [range, setRange] = useState("30d");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<UnifiedRow[]>([]);
  const [accounts, setAccounts] = useState<Array<{ id: string; account_name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<UnifiedRow | null>(null);

  useEffect(() => {
    const f = readInitialFilters();
    setTypeFilter(f.type); setAccountFilter(f.account); setRange(f.range);
    setMin(f.min); setMax(f.max); setQ(f.q);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams();
    if (typeFilter !== "all") p.set("type", typeFilter);
    if (accountFilter) p.set("account", accountFilter);
    if (range !== "30d") p.set("range", range);
    if (min) p.set("min", min);
    if (max) p.set("max", max);
    if (q) p.set("q", q);
    const s = p.toString();
    window.history.replaceState(null, "", `/app/transactions${s ? `?${s}` : ""}`);
  }, [typeFilter, accountFilter, range, min, max, q]);

  const load = useCallback(async () => {
    if (!mid()) return;
    setLoading(true);
    try {
      const [banking, stats] = await Promise.all([
        fetch(`/api/zenipay/banking-ops?merchant_id=${encodeURIComponent(mid())}`).then((r) => r.json()),
        fetch(`/api/zenipay/stats?merchant_id=${encodeURIComponent(mid())}`).then((r) => r.json()),
      ]);
      setAccounts(banking.accounts ?? []);
      const payments = stats.recent_transactions ?? [];
      const transfers = banking.transfers ?? [];
      const payouts = stats.recent_payouts ?? [];
      const ledger = banking.ledger ?? [];
      const merged: UnifiedRow[] = [
        ...payments.map((p: { id: string; customer: string; amount: number; currency: string; status: string; description: string; date: string }) => ({
          id: p.id, kind: "income" as TxKind, date: p.date,
          description: p.description || "Payment",
          counterparty: p.customer || "—",
          amount: Number(p.amount || 0), currency: p.currency || "CAD",
          status: p.status, accountId: null,
          raw: p as unknown as Record<string, unknown>,
        })),
        ...transfers.map((t: { id: string; transfer_type: string; recipient_name: string; amount: number; fee: number; status: string; memo: string; created_at: string; from_account_id?: string; to_account_id?: string }) => ({
          id: t.id, kind: "transfer" as TxKind, date: t.created_at,
          description: t.memo || capitalize(t.transfer_type),
          counterparty: t.recipient_name || "—",
          amount: -(Number(t.amount || 0)), currency: "CAD",
          status: t.status, accountId: t.from_account_id || t.to_account_id || null,
          raw: t as unknown as Record<string, unknown>,
        })),
        ...transfers.filter((t: { fee: number }) => Number(t.fee || 0) > 0).map((t: { id: string; transfer_type: string; recipient_name: string; fee: number; status: string; created_at: string; from_account_id?: string }) => ({
          id: `${t.id}_fee`, kind: "fee" as TxKind, date: t.created_at,
          description: `Fee · ${capitalize(t.transfer_type)}`,
          counterparty: t.recipient_name || "—",
          amount: -(Number(t.fee || 0)), currency: "CAD",
          status: t.status, accountId: t.from_account_id || null,
          raw: t as unknown as Record<string, unknown>,
        })),
        ...payouts.map((p: { id: string; amount?: number; method?: string; recipient_name?: string; status?: string; created_at?: string }) => ({
          id: p.id, kind: "payout" as TxKind, date: p.created_at || new Date().toISOString(),
          description: `Payout · ${p.method || "external"}`,
          counterparty: p.recipient_name || "—",
          amount: -(Number(p.amount || 0)), currency: "CAD",
          status: p.status || "processing", accountId: null,
          raw: p as unknown as Record<string, unknown>,
        })),
        // `zenipay_ledger` entries outside `customer_payment` — covers
        // agent-treasury funding debits and any other money movement
        // that isn't stored as a `zenipay_transfers` row.
        ...ledger.map((l: { id: string; event_type: string; direction: "debit" | "credit"; amount: number | string; currency: string; note: string | null; reference: string | null; created_at: string }) => ({
          id: l.id,
          kind: (l.direction === "credit" ? "income" : "transfer") as TxKind,
          date: l.created_at,
          description: l.note || ledgerLabel(l.event_type),
          counterparty: ledgerCounterparty(l.event_type),
          amount: (l.direction === "credit" ? 1 : -1) * Number(l.amount || 0),
          currency: l.currency || "CAD",
          status: "completed",
          accountId: null,
          raw: l as unknown as Record<string, unknown>,
        })),
      ];
      merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRows(merged);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const ranges: Record<string, number | null> = { "7d": 7e3 * 86400, "30d": 30e3 * 86400, "90d": 90e3 * 86400, all: null };
    const windowMs = ranges[range] ?? ranges["30d"];
    const minNum = min ? Number(min) : null;
    const maxNum = max ? Number(max) : null;
    const qLower = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (windowMs != null && now - new Date(r.date).getTime() > windowMs) return false;
      if (typeFilter === "income" && r.kind !== "income") return false;
      if (typeFilter === "spending" && !(r.kind === "transfer" || r.kind === "payout")) return false;
      if (typeFilter === "transfers" && r.kind !== "transfer") return false;
      if (typeFilter === "fees" && r.kind !== "fee") return false;
      if (accountFilter && r.accountId !== accountFilter) return false;
      const abs = Math.abs(r.amount);
      if (minNum != null && abs < minNum) return false;
      if (maxNum != null && abs > maxNum) return false;
      if (qLower) {
        const hay = `${r.description} ${r.counterparty}`.toLowerCase();
        if (!hay.includes(qLower)) return false;
      }
      return true;
    });
  }, [rows, typeFilter, accountFilter, range, min, max, q]);

  const totalIncome = filtered.filter((r) => r.amount > 0).reduce((s, r) => s + r.amount, 0);
  const totalSpend = filtered.filter((r) => r.amount < 0).reduce((s, r) => s + Math.abs(r.amount), 0);

  const exportCsv = () => {
    const header = "date,description,counterparty,kind,status,amount,currency\n";
    const body = filtered.map((r) => {
      const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
      return `${new Date(r.date).toISOString()},${esc(r.description)},${esc(r.counterparty)},${r.kind},${r.status},${r.amount.toFixed(2)},${r.currency}`;
    }).join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `zenipay-transactions-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardShell mode="merchant">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{
            margin: 0, fontFamily: zp.font.display, fontSize: 32, letterSpacing: "-0.03em",
            fontWeight: zp.weight.semibold, color: zp.text.primary,
          }}>Transactions</h1>
          <p style={{ margin: "4px 0 0", color: zp.text.muted, fontSize: 13 }}>
            {filtered.length} result{filtered.length === 1 ? "" : "s"} · +{zp.fmtCurrency(totalIncome)} in / −{zp.fmtCurrency(totalSpend)} out
          </p>
        </div>
        <GradientButton variant="secondary" size="md" onClick={exportCsv} icon={<Download size={14} />}>Export CSV</GradientButton>
      </div>

      <BankingCard padding={16} style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <FilterPill
            options={[
              { v: "all", l: "All" }, { v: "income", l: "Income" },
              { v: "spending", l: "Spending" }, { v: "transfers", l: "Transfers" },
              { v: "fees", l: "Fees" },
            ]}
            value={typeFilter} onChange={(v) => setTypeFilter(v as TypeFilter)}
          />
          <FilterPill
            options={[
              { v: "7d", l: "7d" }, { v: "30d", l: "30d" },
              { v: "90d", l: "90d" }, { v: "all", l: "All" },
            ]}
            value={range} onChange={setRange}
          />
          <select value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)} style={selectStyle} aria-label="Account filter">
            <option value="">All accounts</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.account_name || "Untitled"}</option>)}
          </select>
          <input placeholder="Min $" value={min} onChange={(e) => setMin(e.target.value.replace(/[^\d.]/g, ""))} style={{ ...inputStyle, width: 90 }} aria-label="Min" />
          <input placeholder="Max $" value={max} onChange={(e) => setMax(e.target.value.replace(/[^\d.]/g, ""))} style={{ ...inputStyle, width: 90 }} aria-label="Max" />
          <input placeholder="Search description or counterparty" value={q} onChange={(e) => setQ(e.target.value)} style={{ ...inputStyle, flex: "1 1 220px", minWidth: 180 }} aria-label="Search" />
          {(typeFilter !== "all" || accountFilter || range !== "30d" || min || max || q) && (
            <GradientButton variant="ghost" size="sm" onClick={() => {
              setTypeFilter("all"); setAccountFilter(""); setRange("30d"); setMin(""); setMax(""); setQ("");
            }}>Reset</GradientButton>
          )}
        </div>
      </BankingCard>

      <BankingCard padding="none">
        <DataTable
          rows={filtered.slice(0, 200)}
          loading={loading && filtered.length === 0}
          rowKey={(r) => r.id}
          onRowClick={(r) => setSelected(r)}
          columns={[
            { key: "date", header: "Date", cell: (r) => zp.fmtDateTime(r.date), width: 160 },
            { key: "desc", header: "Description", cell: (r) => r.description },
            { key: "cp", header: "Counterparty", cell: (r) => r.counterparty, width: 160 },
            { key: "kind", header: "Type", cell: (r) => <KindBadge kind={r.kind} />, width: 110 },
            { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} />, width: 120 },
            {
              key: "amount", header: "Amount", mono: true, align: "right", width: 150,
              cell: (r) => (
                <span style={{ color: r.amount > 0 ? zp.semantic.success : zp.text.primary, fontWeight: zp.weight.semibold }}>
                  {r.amount > 0 ? "+" : "−"}{zp.fmtCurrency(Math.abs(r.amount), r.currency)}
                </span>
              ),
            },
          ]}
          empty="No transactions match. Try clearing a filter or expanding the date range."
        />
      </BankingCard>

      {selected && <DetailPanel row={selected} onClose={() => setSelected(null)} />}
    </DashboardShell>
  );
}

function FilterPill({ options, value, onChange }: { options: Array<{ v: string; l: string }>; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "inline-flex", gap: 2, padding: 3, background: zp.surface.bg2, border: `1px solid ${zp.surface.border}`, borderRadius: zp.radius.sm }}>
      {options.map((o) => {
        const active = o.v === value;
        return (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            style={{
              padding: "6px 12px", borderRadius: zp.radius.xs, border: "none", cursor: "pointer",
              background: active ? zp.surface.bg1 : "transparent",
              color: active ? zp.text.primary : zp.text.muted,
              fontSize: 12, fontWeight: active ? zp.weight.semibold : zp.weight.medium,
              boxShadow: active ? zp.elevation.sm : undefined,
            }}
          >{o.l}</button>
        );
      })}
    </div>
  );
}

function KindBadge({ kind }: { kind: TxKind }) {
  const m: Record<TxKind, { bg: string; fg: string; label: string }> = {
    income:   { bg: zp.semantic.successBg, fg: zp.semantic.success, label: "Income" },
    transfer: { bg: zp.surface.bg3, fg: zp.text.muted, label: "Transfer" },
    payout:   { bg: zp.surface.bg3, fg: zp.text.muted, label: "Payout" },
    fee:      { bg: zp.semantic.warningBg, fg: zp.semantic.warning, label: "Fee" },
  };
  const s = m[kind];
  return <span style={{ fontSize: 10, fontWeight: zp.weight.semibold, padding: "3px 10px", borderRadius: zp.radius.pill, background: s.bg, color: s.fg, letterSpacing: "0.04em", textTransform: "uppercase" as const }}>{s.label}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const key = status?.toLowerCase() || "";
  const m: Record<string, { bg: string; fg: string }> = {
    succeeded: { bg: zp.semantic.successBg, fg: zp.semantic.success },
    completed: { bg: zp.semantic.successBg, fg: zp.semantic.success },
    paid: { bg: zp.semantic.successBg, fg: zp.semantic.success },
    processing: { bg: zp.semantic.warningBg, fg: zp.semantic.warning },
    pending: { bg: zp.semantic.warningBg, fg: zp.semantic.warning },
    failed: { bg: zp.semantic.dangerBg, fg: zp.semantic.danger },
    refunded: { bg: zp.surface.bg3, fg: zp.text.muted },
  };
  const s = m[key] ?? { bg: zp.surface.bg3, fg: zp.text.muted };
  return <span style={{ fontSize: 10, fontWeight: zp.weight.semibold, padding: "3px 10px", borderRadius: zp.radius.pill, background: s.bg, color: s.fg, letterSpacing: "0.04em", textTransform: "capitalize" as const }}>{status || "—"}</span>;
}

function DetailPanel({ row, onClose }: { row: UnifiedRow; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: zp.surface.overlay, backdropFilter: "blur(4px)", zIndex: zp.zIndex.modal, display: "flex", justifyContent: "flex-end" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "min(480px, 100vw)", height: "100vh", background: zp.surface.bg1, boxShadow: zp.elevation.lg, overflowY: "auto", padding: 28 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <KindBadge kind={row.kind} />
            <h3 style={{ margin: "10px 0 2px", fontSize: 18, fontWeight: zp.weight.semibold, color: zp.text.primary }}>
              {row.description}
            </h3>
            <p style={{ margin: 0, fontSize: 12, color: zp.text.muted }}>{zp.fmtDateTime(row.date)}</p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            background: zp.surface.bg3, border: "none", borderRadius: zp.radius.sm,
            width: 30, height: 30, cursor: "pointer", color: zp.text.primary,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}><X size={16} /></button>
        </div>

        <div style={{ ...zp.amountStyle.hero, fontSize: 32, marginBottom: 18, color: row.amount > 0 ? zp.semantic.success : zp.text.primary }}>
          {row.amount > 0 ? "+" : "−"}{zp.fmtCurrency(Math.abs(row.amount), row.currency)}
        </div>

        <dl style={{ margin: 0 }}>
          <DetailRow label="Counterparty" value={row.counterparty} />
          <DetailRow label="Status" value={<StatusBadge status={row.status} />} />
          <DetailRow label="Type" value={row.kind} />
          {row.accountId && <DetailRow label="Account" value={row.accountId} mono />}
          {(row.raw as { gateway_transfer_id?: string }).gateway_transfer_id && (
            <DetailRow label="Finix transfer" value={(row.raw as { gateway_transfer_id: string }).gateway_transfer_id} mono />
          )}
          <DetailRow label="Reference" value={row.id} mono />
        </dl>
      </div>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", padding: "10px 0", borderBottom: `1px solid ${zp.surface.border}`, alignItems: "center" }}>
      <dt style={{ fontSize: 11, color: zp.text.muted, fontWeight: zp.weight.semibold, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>{label}</dt>
      <dd style={{ margin: 0, fontSize: 13, color: zp.text.primary, fontFamily: mono ? zp.font.mono : undefined, wordBreak: "break-all" }}>{value}</dd>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  height: 34, padding: "0 10px", borderRadius: zp.radius.sm,
  border: `1px solid ${zp.surface.border}`, background: zp.surface.bg2,
  color: zp.text.primary, fontSize: 13, outline: "none",
  fontFamily: zp.font.sans,
};
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer", minWidth: 150 };

function capitalize(s: string): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}

function ledgerLabel(eventType: string): string {
  switch (eventType) {
    case "fund_agent_treasury": return "Fund agent treasury";
    case "transfer_to_agent":   return "Transfer to agent";
    case "refund":              return "Refund";
    case "fee":                 return "Fee";
    case "payout":              return "Payout";
    default:                    return capitalize(eventType);
  }
}

function ledgerCounterparty(eventType: string): string {
  switch (eventType) {
    case "fund_agent_treasury":
    case "transfer_to_agent":   return "Agent treasury";
    default:                    return "—";
  }
}
