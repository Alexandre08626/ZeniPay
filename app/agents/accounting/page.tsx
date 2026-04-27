// /agents/accounting — Leo's desk.
//
// Full company-accounting view for the merchant: revenue, outstanding,
// expenses, net cashflow (MTD + YTD), account balances, every invoice
// (paid + outstanding), recent ledger entries, and Leo's chat embedded
// at the bottom so the merchant can ask their accountant about the
// numbers without leaving the page.
//
// Data: /api/v1/agents/accounting/company-overview (org → merchant
// resolved via zenipay_merchant_agent_org_map, scoped server-side).
// Chat: shared AgentChatPanel pointed at the agent named "Leo" in the
// caller's org.

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Shell, Card, Metric } from "@/components/agents/Shell";
import { AgentChatPanel } from "@/components/agents/AgentChatPanel";
import { apiFetch } from "../_lib/session";
import {
  BORDER, ROW_SEP, TEXT, MUTED, LIGHT,
  ZP_GREEN, ZP_CYAN, ZP_PURPLE, ZP_BLUE,
  fmtDate,
} from "@/components/agents/theme";

interface AccountRow {
  id: string;
  account_name: string | null;
  account_type: string | null;
  balance: number | string | null;
  currency: string | null;
  is_primary: boolean | null;
  status: string | null;
}

interface InvoiceRow {
  id: string;
  invoice_number: string | null;
  customer_name: string | null;
  customer_email: string | null;
  total: number | string | null;
  currency: string | null;
  status: string | null;
  paid_at: string | null;
  created_at: string;
}

interface LedgerRow {
  id: string;
  event_type: string | null;
  direction: "debit" | "credit" | null;
  amount: number | string | null;
  currency: string | null;
  note: string | null;
  created_at: string;
}

interface OverviewSummary {
  revenue:     { total: number; mtd: number; ytd: number; currency: string };
  outstanding: { total: number; count: number; currency: string };
  expenses:    { total: number; mtd: number; ytd: number; by_category: Record<string, number>; currency: string };
  cashflow:    { net_total: number; net_mtd: number; net_ytd: number; currency: string };
  counts:      { invoices_total: number; invoices_paid: number; invoices_open: number; ledger_entries: number; accounts: number };
  balances:    { total_across_accounts: number; currency: string };
}

interface OverviewResponse {
  merchant_id: string;
  summary:  OverviewSummary;
  accounts: AccountRow[];
  invoices: InvoiceRow[];
  ledger:   LedgerRow[];
}

interface AgentRow { id: string; name: string; agent_type: string }

const ACCOUNTING_AGENT_NAME = "Leo";

function fmtMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: (currency || "CAD").toUpperCase(),
      minimumFractionDigits: 2,
    }).format(Number.isFinite(amount) ? amount : 0);
  } catch {
    return `${(currency || "").toUpperCase()} ${amount.toFixed(2)}`;
  }
}

function num(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatLedgerLabel(eventType: string | null, note: string | null): string {
  if (!eventType) return note || "—";
  const map: Record<string, string> = {
    customer_payment: "Customer payment",
    fund_agent_treasury: "Fund agent treasury",
    transfer_to_agent: "Transfer to agent",
    manual_adjustment: note || "Manual adjustment",
    refund: "Refund",
    fee: "Fee",
    payout: "Payout",
  };
  return map[eventType] ?? eventType.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export default function AccountingOverview() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [leo, setLeo] = useState<AgentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [overview, agents] = await Promise.all([
          apiFetch<OverviewResponse | { error: string; message?: string }>(
            "/api/v1/agents/accounting/company-overview"
          ).catch((e) => ({ error: "fetch_failed", message: e instanceof Error ? e.message : String(e) })),
          apiFetch<{ agents: AgentRow[] }>("/api/v1/agents/agents").catch(() => ({ agents: [] as AgentRow[] })),
        ]);
        if (cancelled) return;
        if ("error" in overview) {
          setErr(("message" in overview && overview.message) || overview.error);
        } else {
          setData(overview);
        }
        // Pick the dedicated accounting agent. Fall back to agent_type
        // match in case the name was customised by the merchant.
        const found = (agents.agents ?? []).find((a) => a.name === ACCOUNTING_AGENT_NAME)
          || (agents.agents ?? []).find((a) => a.agent_type === "accounting");
        setLeo(found ?? null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const summary = data?.summary;
  const accounts = data?.accounts ?? [];
  const invoices = data?.invoices ?? [];
  const ledger = data?.ledger ?? [];
  const ccy = summary?.cashflow.currency ?? "CAD";

  return (
    <Shell title="Accounting">
      <p style={{ marginTop: -6, marginBottom: 18, fontSize: 13, color: MUTED, lineHeight: 1.5 }}>
        {leo ? `Leo's desk — your dedicated accountant.` : "Your dedicated accountant. (Agent not provisioned yet.)"}
        {" "}Numbers below come straight from your merchant data, server-scoped to this organization.
      </p>

      {err && (
        <Card style={{ marginBottom: 18, borderLeft: `3px solid #DC2626` }}>
          <strong style={{ fontSize: 13, color: "#B91C1C" }}>Couldn&apos;t load accounting data.</strong>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: MUTED }}>{err}</p>
        </Card>
      )}

      {loading && !data && (
        <p style={{ color: MUTED, fontSize: 12 }}>Loading…</p>
      )}

      {summary && (
        <>
          {/* ─── Top-line KPIs ─────────────────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 14 }}>
            <Metric
              label="Net cashflow · YTD"
              value={fmtMoney(summary.cashflow.net_ytd, ccy)}
              sub={`MTD ${fmtMoney(summary.cashflow.net_mtd, ccy)}`}
              color={summary.cashflow.net_ytd >= 0 ? ZP_GREEN : "#DC2626"}
            />
            <Metric
              label="Revenue · YTD"
              value={fmtMoney(summary.revenue.ytd, ccy)}
              sub={`${summary.counts.invoices_paid} invoices paid`}
              color={ZP_CYAN}
            />
            <Metric
              label="Outstanding"
              value={fmtMoney(summary.outstanding.total, ccy)}
              sub={`${summary.outstanding.count} ${summary.outstanding.count === 1 ? "invoice" : "invoices"} open`}
              color={ZP_PURPLE}
            />
            <Metric
              label="Expenses · YTD"
              value={fmtMoney(summary.expenses.ytd, ccy)}
              sub={`MTD ${fmtMoney(summary.expenses.mtd, ccy)}`}
              color={ZP_BLUE}
            />
          </div>

          {/* ─── Expense breakdown ─────────────────────────────── */}
          {Object.keys(summary.expenses.by_category).length > 0 && (
            <Card style={{ marginBottom: 18 }}>
              <h3 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 800, letterSpacing: "-0.2px" }}>
                Expenses by category · all-time
              </h3>
              <div style={{ display: "grid", gap: 0 }}>
                {Object.entries(summary.expenses.by_category)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, amt], i) => (
                    <div key={cat} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "8px 4px",
                      borderTop: i === 0 ? "none" : `1px solid ${ROW_SEP}`,
                      fontSize: 13,
                    }}>
                      <span style={{ color: TEXT }}>{formatLedgerLabel(cat, null)}</span>
                      <span style={{ fontFamily: "ui-monospace", fontWeight: 700, color: TEXT }}>
                        {fmtMoney(amt, ccy)}
                      </span>
                    </div>
                  ))}
              </div>
            </Card>
          )}

          {/* ─── Account balances ──────────────────────────────── */}
          {accounts.length > 0 && (
            <Card style={{ marginBottom: 18 }}>
              <h3 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 800, letterSpacing: "-0.2px" }}>
                Account balances
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
                {accounts.map((a) => (
                  <div key={a.id} style={{
                    padding: "12px 14px", borderRadius: 10, border: `1px solid ${BORDER}`,
                    background: a.is_primary ? "rgba(45,190,96,0.04)" : "#FFFFFF",
                  }}>
                    <div style={{ fontSize: 11, color: MUTED, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>
                      {(a.account_type || "account").replace(/_/g, " ")}
                      {a.is_primary && <span style={{ marginLeft: 6, color: ZP_GREEN }}>· primary</span>}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 6 }}>
                      {a.account_name || "—"}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "ui-monospace", color: TEXT }}>
                      {fmtMoney(num(a.balance), a.currency || ccy)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ─── Invoices ──────────────────────────────────────── */}
          <Card style={{ marginBottom: 18, padding: 0 }}>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, letterSpacing: "-0.2px" }}>
                Invoices · {invoices.length}
              </h3>
              <Link href="/app/invoices" style={{ fontSize: 11, color: ZP_GREEN, fontWeight: 700, textDecoration: "none" }}>
                Manage in app →
              </Link>
            </div>
            {invoices.length === 0 ? (
              <div style={{ padding: 28, textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>🧾</div>
                <p style={{ fontSize: 13, fontWeight: 700, color: TEXT, margin: "0 0 4px" }}>No invoices yet</p>
                <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>
                  Issued invoices show up here automatically.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#fafbfc", color: MUTED, textAlign: "left" as const }}>
                      <th style={cellHeader}>Invoice</th>
                      <th style={cellHeader}>Customer</th>
                      <th style={{ ...cellHeader, textAlign: "right" as const }}>Amount</th>
                      <th style={cellHeader}>Status</th>
                      <th style={cellHeader}>Issued</th>
                      <th style={cellHeader}>Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} style={{ borderTop: `1px solid ${ROW_SEP}` }}>
                        <td style={{ ...cell, fontFamily: "ui-monospace", fontSize: 12 }}>
                          {inv.invoice_number || inv.id.slice(0, 16)}
                        </td>
                        <td style={cell}>
                          <div style={{ fontWeight: 600, color: TEXT }}>{inv.customer_name || "—"}</div>
                          {inv.customer_email && (
                            <div style={{ fontSize: 11, color: LIGHT }}>{inv.customer_email}</div>
                          )}
                        </td>
                        <td style={{ ...cell, textAlign: "right" as const, fontFamily: "ui-monospace", fontWeight: 700 }}>
                          {fmtMoney(num(inv.total), inv.currency || ccy)}
                        </td>
                        <td style={cell}><InvoiceStatusPill status={inv.status} paidAt={inv.paid_at} /></td>
                        <td style={{ ...cell, color: MUTED, fontSize: 12 }}>{fmtDate(inv.created_at)}</td>
                        <td style={{ ...cell, color: MUTED, fontSize: 12 }}>{inv.paid_at ? fmtDate(inv.paid_at) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* ─── Recent ledger ─────────────────────────────────── */}
          <Card style={{ marginBottom: 18, padding: 0 }}>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, letterSpacing: "-0.2px" }}>
                Recent ledger entries
              </h3>
              <Link href="/app/transactions" style={{ fontSize: 11, color: ZP_GREEN, fontWeight: 700, textDecoration: "none" }}>
                Full activity →
              </Link>
            </div>
            {ledger.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: MUTED }}>
                No ledger entries yet.
              </div>
            ) : (
              <div>
                {ledger.slice(0, 12).map((l, i) => {
                  const isCredit = l.direction === "credit";
                  return (
                    <div key={l.id} style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      padding: "10px 18px",
                      borderTop: i === 0 ? "none" : `1px solid ${ROW_SEP}`,
                      alignItems: "center",
                      gap: 12,
                    }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>
                          {formatLedgerLabel(l.event_type, l.note)}
                        </div>
                        <div style={{ fontSize: 11, color: LIGHT }}>{fmtDate(l.created_at)}</div>
                      </div>
                      <div style={{
                        fontFamily: "ui-monospace", fontWeight: 800, fontSize: 13,
                        color: isCredit ? ZP_GREEN : "#DC2626",
                      }}>
                        {isCredit ? "+" : "−"}{fmtMoney(num(l.amount), l.currency || ccy)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* ─── Leo's chat ─────────────────────────────────────── */}
          {leo ? (
            <AgentChatPanel agent={{ id: leo.id, name: leo.name }} />
          ) : (
            <Card style={{ marginBottom: 18 }}>
              <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>
                Your accounting agent isn&rsquo;t provisioned in this organization yet.
              </p>
            </Card>
          )}

          {/* ─── Secondary tools ────────────────────────────────── */}
          <Card>
            <h3 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 800, letterSpacing: "-0.2px" }}>
              Bookkeeping tools
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              <SecondaryLink href="/agents/accounting/chart-of-accounts" title="Chart of accounts" desc="Create, rename, or archive GL accounts." />
              <SecondaryLink href="/agents/accounting/mcc-mappings"     title="MCC mappings"      desc="Override the default MCC → GL rules." />
              <SecondaryLink href="/agents/accounting/reports"          title="Expense reports"   desc="Period roll-ups · QuickBooks, Xero, NetSuite, CSV export." />
            </div>
          </Card>
        </>
      )}
    </Shell>
  );
}

function InvoiceStatusPill({ status, paidAt }: { status: string | null; paidAt: string | null }) {
  const k = (status || (paidAt ? "paid" : "draft")).toLowerCase();
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    paid:      { bg: "rgba(45,190,96,0.12)", fg: "#16A34A", label: "Paid" },
    sent:      { bg: "rgba(21,184,201,0.12)", fg: "#0891B2", label: "Sent" },
    draft:     { bg: "#f1f5f9", fg: "#64748b", label: "Draft" },
    overdue:   { bg: "rgba(220,38,38,0.10)", fg: "#DC2626", label: "Overdue" },
    void:      { bg: "#f1f5f9", fg: "#94a3b8", label: "Void" },
    cancelled: { bg: "#f1f5f9", fg: "#94a3b8", label: "Cancelled" },
  };
  const c = map[k] ?? { bg: "#f1f5f9", fg: "#64748b", label: k };
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 999,
      background: c.bg, color: c.fg, textTransform: "uppercase", letterSpacing: "0.06em",
    }}>
      {c.label}
    </span>
  );
}

function SecondaryLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} style={{
      display: "block", padding: "10px 12px", borderRadius: 10,
      border: `1px solid ${BORDER}`, background: "#FFFFFF",
      textDecoration: "none", color: TEXT,
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 2 }}>{title}</div>
      <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.4 }}>{desc}</div>
    </Link>
  );
}

const cellHeader: React.CSSProperties = {
  padding: "10px 18px", fontSize: 11, fontWeight: 700,
  letterSpacing: "0.04em", textTransform: "uppercase",
};
const cell: React.CSSProperties = { padding: "12px 18px", verticalAlign: "top" };
