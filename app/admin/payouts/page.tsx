// /admin/payouts — cross-merchant payouts dashboard.
//
// Lists every merchant with current balance + total paid out + open
// payout requests. Below: full payout history (zenipay_payout_requests)
// across all tenants. 5s real-time refresh.
//
// "Initiate payout" link routes to /admin/merchants/[id] where the
// existing per-merchant action surface lives — keeps the cross-merchant
// view clean and doesn't duplicate the destination/amount form.

"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import { Banknote, ArrowRight } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BankingCard } from "@/components/dashboard/BankingCard";
import { DataTable } from "@/components/dashboard/DataTable";
import zp from "@/lib/design-system/zenipay-brand";
import { useAutoRefresh } from "@/lib/hooks/useAutoRefresh";
import { AdminGate } from "../AdminGate";
import { adminFetch } from "../_lib/admin-fetch";

interface MerchantSnapshot {
  id: string;
  business_name: string | null;
  email: string | null;
  status: string | null;
  country: string | null;
  primary_balance: number;
  total_balance: number;
  currency: string;
  total_paid_out: number;
  pending_amount: number;
  processing_amount: number;
  open_requests: number;
}

interface HistoryRow {
  id: string;
  merchant_id: string;
  merchant_name: string;
  destination_id: string | null;
  amount_units: number;
  currency: string;
  status: string;
  finix_transfer_id: string | null;
  estimated_arrival: string | null;
  memo: string | null;
  created_at: string;
}

interface Summary {
  total_balance_held: number;
  total_paid_all_time: number;
  pending_count: number;
  processing_count: number;
  currency: string;
}

const EMPTY_SUMMARY: Summary = {
  total_balance_held: 0,
  total_paid_all_time: 0,
  pending_count: 0,
  processing_count: 0,
  currency: "CAD",
};

interface PayoutsResp {
  merchants: MerchantSnapshot[];
  history: HistoryRow[];
  summary: Summary;
}

export default function AdminPayoutsPage() {
  return (
    <DashboardShell mode="admin">
      <AdminGate>
        <Inner />
      </AdminGate>
    </DashboardShell>
  );
}

function Inner() {
  const [merchants, setMerchants] = useState<MerchantSnapshot[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminFetch<PayoutsResp>("/api/v1/admin/payouts");
      setMerchants(r.merchants ?? []);
      setHistory(r.history ?? []);
      setSummary(r.summary ?? EMPTY_SUMMARY);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  // Real-time admin view: refresh every 5s while tab visible.
  useAutoRefresh(load, { intervalMs: 5_000 });

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontFamily: zp.font.display, fontSize: 32, letterSpacing: "-0.03em", fontWeight: zp.weight.semibold, color: zp.text.primary }}>
          Payouts
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: zp.text.muted }}>
          Cross-merchant view of every payout request, all balances held, and what&apos;s waiting to settle.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 18 }}>
        <Stat
          label="Held across merchants"
          value={zp.fmtCurrency(summary.total_balance_held, summary.currency)}
          accent="cyan"
          sub="primary CAD accounts"
          icon={<Banknote size={14} />}
        />
        <Stat
          label="Paid all time"
          value={zp.fmtCurrency(summary.total_paid_all_time, summary.currency)}
          accent="green"
        />
        <Stat
          label="Pending"
          value={String(summary.pending_count)}
          accent="violet"
          sub={`${summary.pending_count === 1 ? "request" : "requests"} awaiting kick-off`}
        />
        <Stat
          label="Processing"
          value={String(summary.processing_count)}
          sub="in flight at Finix"
        />
      </div>

      {/* Merchants snapshot */}
      <BankingCard padding="none" accent="cyan" style={{ marginBottom: 18 }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${zp.surface.border}` }}>
          <span style={{ fontSize: 13, fontWeight: zp.weight.semibold, color: zp.text.primary }}>
            Merchants · {merchants.length}
          </span>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: zp.text.muted }}>
            Click a row to open the merchant&apos;s admin page where you can initiate a payout.
          </p>
        </div>
        <DataTable
          rows={merchants}
          loading={loading && merchants.length === 0}
          rowKey={(r) => r.id}
          columns={[
            { key: "merchant", header: "Merchant", cell: (r) => (
              <div>
                <div style={{ fontWeight: zp.weight.semibold, color: zp.text.primary }}>
                  {r.business_name || r.id}
                </div>
                <div style={{ fontSize: 11, color: zp.text.muted }}>{r.email ?? "—"}</div>
              </div>
            ) },
            { key: "country", header: "Country", cell: (r) => r.country ?? "—", width: 90 },
            { key: "balance", header: "Balance", mono: true, align: "right", width: 130,
              cell: (r) => <span style={{ fontWeight: zp.weight.semibold }}>{zp.fmtCurrency(r.primary_balance, r.currency)}</span> },
            { key: "paid",    header: "Paid out", mono: true, align: "right", width: 130,
              cell: (r) => <span style={{ color: zp.brand.green, fontWeight: zp.weight.semibold }}>{zp.fmtCurrency(r.total_paid_out, r.currency)}</span> },
            { key: "open",    header: "Open", align: "right", width: 70,
              cell: (r) => <OpenPill n={r.open_requests} /> },
            { key: "status",  header: "Status", cell: (r) => <StatusPill status={r.status ?? "—"} />, width: 130 },
            { key: "act",     header: "", width: 130, align: "right",
              cell: (r) => (
                <Link
                  href={`/admin/merchants/${encodeURIComponent(r.id)}`}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    fontSize: 12, fontWeight: zp.weight.semibold,
                    color: zp.brand.cyan, textDecoration: "none",
                  }}
                >
                  Open <ArrowRight size={11} />
                </Link>
              ) },
          ]}
          empty="No merchants yet."
        />
      </BankingCard>

      {/* Payout history */}
      <BankingCard padding="none" accent="green">
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${zp.surface.border}` }}>
          <span style={{ fontSize: 13, fontWeight: zp.weight.semibold, color: zp.text.primary }}>
            Payout history · {history.length}
          </span>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: zp.text.muted }}>
            Every payout request across the platform, newest first.
          </p>
        </div>
        <DataTable
          rows={history}
          loading={loading && history.length === 0}
          rowKey={(r) => r.id}
          columns={[
            { key: "date",     header: "Date", cell: (r) => zp.fmtDate(r.created_at), width: 160 },
            { key: "merchant", header: "Merchant", cell: (r) => r.merchant_name, width: 200 },
            { key: "memo",     header: "Memo",  cell: (r) => r.memo ?? "—" },
            { key: "amount",   header: "Amount", mono: true, align: "right", width: 130,
              cell: (r) => <span style={{ fontWeight: zp.weight.semibold }}>{zp.fmtCurrency(r.amount_units, r.currency)}</span> },
            { key: "status",   header: "Status", width: 130,
              cell: (r) => <PayoutStatusPill status={r.status} /> },
            { key: "eta",      header: "ETA",    width: 140,
              cell: (r) => r.estimated_arrival ? zp.fmtDate(r.estimated_arrival) : "—" },
          ]}
          empty="No payout requests on record yet."
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

function OpenPill({ n }: { n: number }) {
  if (!n) return <span style={{ fontSize: 11, color: zp.text.muted }}>—</span>;
  return (
    <span style={{
      fontSize: 11, fontWeight: zp.weight.semibold,
      padding: "2px 9px", borderRadius: 999,
      background: zp.semantic.warningBg, color: zp.semantic.warning,
    }}>
      {n}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const k = (status || "").toLowerCase();
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    active:        { bg: zp.semantic.successBg, fg: zp.semantic.success, label: "Active" },
    pending_kyb:   { bg: zp.surface.bg3,        fg: zp.text.muted,       label: "Under review" },
    personal_only: { bg: zp.surface.bg3,        fg: zp.text.muted,       label: "Personal" },
    closed:        { bg: zp.semantic.dangerBg,  fg: zp.semantic.danger,  label: "Closed" },
  };
  const m = map[k] ?? { bg: zp.surface.bg3, fg: zp.text.muted, label: k || "—" };
  return (
    <span style={{ fontSize: 10, fontWeight: zp.weight.semibold, padding: "3px 9px", borderRadius: 999, background: m.bg, color: m.fg, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>
      {m.label}
    </span>
  );
}

function PayoutStatusPill({ status }: { status: string }) {
  const k = (status || "pending").toLowerCase();
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    pending:    { bg: zp.semantic.warningBg, fg: zp.semantic.warning, label: "Pending" },
    processing: { bg: zp.semantic.infoBg,    fg: zp.semantic.info,    label: "Processing" },
    submitted:  { bg: zp.semantic.infoBg,    fg: zp.semantic.info,    label: "Submitted" },
    completed:  { bg: zp.semantic.successBg, fg: zp.semantic.success, label: "Completed" },
    succeeded:  { bg: zp.semantic.successBg, fg: zp.semantic.success, label: "Completed" },
    failed:     { bg: zp.semantic.dangerBg,  fg: zp.semantic.danger,  label: "Failed" },
    cancelled:  { bg: zp.surface.bg3,        fg: zp.text.muted,       label: "Cancelled" },
  };
  const m = map[k] ?? { bg: zp.surface.bg3, fg: zp.text.muted, label: k };
  return (
    <span style={{ fontSize: 10, fontWeight: zp.weight.semibold, padding: "3px 9px", borderRadius: 999, background: m.bg, color: m.fg, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>
      {m.label}
    </span>
  );
}
