// /app/overview — the new neobank dashboard.
//
// Sections:
//   1. Hero — greeting + total balance across accounts + 30-day cash-flow
//      area chart + four quick-action buttons (Send, Receive, Contact, Card).
//   2. Account cards grid — one card per zenipay_accounts row plus a
//      "+ Add account" tile.
//   3. Recent activity — last 10 rows merged from payments + transfers.
//   4. Secondary tiles — pending payouts, open invoices, active cards,
//      team members.
//
// Data sources: /api/zenipay/banking-ops (accounts/transfers/cards) +
// /api/zenipay/stats (payments, payouts, invoices). No new endpoints.

"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BankingShell, BankingCard, BankingButton,
} from "../BankingShell";
import { banking, fmtCurrency, fmtDate, greeting } from "@/lib/design-system/banking-tokens";

const { color: C, gradient: G, radius: R, fontWeight: FW } = banking;

// ───────────────────────────────────────────────────────────────────────────
// Types mirroring /api/zenipay/banking-ops + /api/zenipay/stats responses.
// ───────────────────────────────────────────────────────────────────────────

interface Account {
  id: string;
  merchant_id: string;
  account_type: string;
  account_name: string;
  account_number: string;
  routing_number: string;
  balance: number;
  status: string;
  is_primary: boolean;
  currency?: string;
  created_at?: string;
}
interface Transfer {
  id: string;
  transfer_type: string;
  recipient_name: string;
  amount: number;
  fee: number;
  status: string;
  memo: string;
  created_at: string;
}
interface Payment {
  id: string; customer: string; amount: number; currency: string;
  status: string; description: string; date: string;
  card_brand?: string; card_last4?: string;
}
interface Payout { id: string; amount?: number; status?: string; created_at?: string }
interface Invoice { id: string; total?: number; status?: string; paid_at?: string | null; created_at?: string }
interface CardRow { id: string; status?: string; card_type?: string }

interface Session { email: string; businessName: string; firstName: string; clientId: string }

function readSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const email = sessionStorage.getItem("zp_client_email") || "";
    const clientId = sessionStorage.getItem("zp_client") || "";
    if (!email && !clientId) return null;
    const businessName = sessionStorage.getItem("zp_client_bname") || "";
    const firstName = sessionStorage.getItem("zp_client_first_name") ||
      (email.split("@")[0] || "").split(".")[0].replace(/[^a-zA-Z-]/g, "") || "";
    return { email, businessName, firstName, clientId };
  } catch { return null; }
}

export default function OverviewPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const s = readSession();
    setSession(s);
  }, []);

  const load = useCallback(async (merchantId: string) => {
    setLoading(true);
    try {
      const [bankingRes, statsRes] = await Promise.all([
        fetch(`/api/zenipay/banking-ops?merchant_id=${encodeURIComponent(merchantId)}`).then((r) => r.json()),
        fetch(`/api/zenipay/stats?merchant_id=${encodeURIComponent(merchantId)}`).then((r) => r.json()),
      ]);
      setAccounts(bankingRes.accounts ?? []);
      setTransfers(bankingRes.transfers ?? []);
      setCards(bankingRes.cards ?? []);
      setPayments(statsRes.recent_transactions ?? []);
      setPayouts(statsRes.recent_payouts ?? []);
      setInvoices(statsRes.recent_invoices ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.clientId) void load(session.clientId);
  }, [session, load]);

  const totalBalance = useMemo(() => accounts.reduce((s, a) => s + Number(a.balance || 0), 0), [accounts]);
  const primaryCurrency = accounts[0]?.currency || "CAD";

  const chartSeries = useMemo(() => buildCashFlowSeries(payments, transfers), [payments, transfers]);

  const openInvoices = useMemo(
    () => invoices.filter((i) => i.status !== "paid"),
    [invoices],
  );
  const openInvoicesTotal = openInvoices.reduce((s, i) => s + Number(i.total || 0), 0);
  const pendingPayouts = payouts.filter((p) => p.status !== "completed" && p.status !== "failed").length;
  const activeCards = cards.filter((c) => (c.status ?? "active") === "active").length;

  const recentActivity = useMemo(
    () => buildRecentActivity(payments, transfers),
    [payments, transfers],
  );

  const firstName = session?.firstName ? session.firstName.charAt(0).toUpperCase() + session.firstName.slice(1) : "";

  return (
    <BankingShell
      title="Overview"
      subtitle={session?.businessName || undefined}
      actions={
        <BankingButton as="link" href="/app/wallets" variant="primary" size="sm">
          + New transfer
        </BankingButton>
      }
    >
      {/* Hero */}
      <section
        style={{
          background: G.primary, color: "#fff",
          borderRadius: R.lg, padding: "28px 32px",
          marginBottom: 20, position: "relative", overflow: "hidden",
          boxShadow: "0 10px 30px rgba(15,79,63,0.18)",
        }}
      >
        <div aria-hidden style={{
          position: "absolute", right: -80, top: -80, width: 320, height: 320,
          borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.22) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(260px, 360px)", gap: 32, alignItems: "center" }} className="pr13-hero-grid">
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 12, letterSpacing: "0.12em", opacity: 0.75, fontWeight: FW.bold, textTransform: "uppercase" }}>
              {greeting(firstName)}
            </p>
            <p style={{
              ...banking.amount.hero,
              margin: "10px 0 4px", color: "#fff",
            }}>
              {loading && accounts.length === 0
                ? <span style={{ opacity: 0.6 }}>…</span>
                : fmtCurrency(totalBalance, primaryCurrency)}
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.85 }}>
              {accounts.length} {accounts.length === 1 ? "account" : "accounts"} · total cash across {primaryCurrency}
            </p>

            <div style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
              <HeroButton href="/app/wallets" label="Send money" />
              <HeroButton href="/app/wallets" label="Receive" variant="ghost" />
              <HeroButton href="/app/contacts" label="Add contact" variant="ghost" />
              <HeroButton href="/app/cards" label="Issue card" variant="ghost" />
            </div>
          </div>

          <CashflowChart series={chartSeries} loading={loading && payments.length === 0} />
        </div>

        <style>{`
          @media (max-width: 860px) {
            .pr13-hero-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </section>

      {/* Accounts row */}
      <section aria-label="Accounts" style={{ marginBottom: 22 }}>
        <div style={sectionHeaderStyle}>
          <h2 style={h2Style}>Accounts</h2>
          <Link href="/app/accounts" style={moreLinkStyle}>Manage accounts →</Link>
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 12,
        }}>
          {loading && accounts.length === 0
            ? Array.from({ length: 2 }).map((_, i) => <AccountSkeleton key={i} />)
            : accounts.map((a) => <AccountTile key={a.id} account={a} />)}
          <AddAccountTile />
        </div>
      </section>

      {/* Recent activity */}
      <section aria-label="Recent activity" style={{ marginBottom: 22 }}>
        <div style={sectionHeaderStyle}>
          <h2 style={h2Style}>Recent activity</h2>
          <Link href="/app/transactions" style={moreLinkStyle}>View all transactions →</Link>
        </div>
        <BankingCard style={{ padding: 0 }}>
          {recentActivity.length === 0 && !loading ? (
            <EmptyActivity />
          ) : (
            <ActivityTable rows={recentActivity.slice(0, 10)} loading={loading && recentActivity.length === 0} />
          )}
        </BankingCard>
      </section>

      {/* Secondary tiles */}
      <section aria-label="At a glance" style={{ marginBottom: 28 }}>
        <div style={sectionHeaderStyle}>
          <h2 style={h2Style}>At a glance</h2>
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}>
          <MiniTile icon="⏳" label="Pending payouts" value={String(pendingPayouts)} href="/app/transactions?type=transfers" />
          <MiniTile icon="📨" label="Open invoices" value={fmtCurrency(openInvoicesTotal, primaryCurrency)} sub={`${openInvoices.length} outstanding`} href="/app/invoices" />
          <MiniTile icon="💳" label="Active cards" value={String(activeCards)} href="/app/cards" />
          <MiniTile icon="👤" label="Team members" value="1" sub="Add a teammate" href="/app/settings#team" />
        </div>
      </section>
    </BankingShell>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Hero button
// ───────────────────────────────────────────────────────────────────────────

function HeroButton({ href, label, variant = "primary" }: { href: string; label: string; variant?: "primary" | "ghost" }) {
  const style: React.CSSProperties = variant === "primary"
    ? {
        background: "#fff", color: C.accountPrimary,
        padding: "10px 18px", borderRadius: R.sm,
        fontSize: 13, fontWeight: FW.bold, textDecoration: "none",
      }
    : {
        background: "rgba(255,255,255,0.12)", color: "#fff",
        border: "1px solid rgba(255,255,255,0.25)",
        padding: "10px 18px", borderRadius: R.sm,
        fontSize: 13, fontWeight: FW.bold, textDecoration: "none",
      };
  return <Link href={href} style={style}>{label}</Link>;
}

// ───────────────────────────────────────────────────────────────────────────
// Cash-flow inline SVG area chart (no new dependency).
// Each bar represents net movement that day: income (payments) − outgoing
// (transfers). We clip negatives at zero and normalize against max to scale.
// ───────────────────────────────────────────────────────────────────────────

interface SeriesPoint { label: string; income: number; spend: number; net: number; date: Date }

function buildCashFlowSeries(payments: Payment[], transfers: Transfer[]): SeriesPoint[] {
  const days = 30;
  const series: SeriesPoint[] = [];
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(dayStart);
    d.setDate(d.getDate() - i);
    series.push({
      label: d.toLocaleDateString("en-CA", { month: "short", day: "numeric" }),
      date: d,
      income: 0, spend: 0, net: 0,
    });
  }
  const indexByDate = (s: Date) => {
    const cur = new Date(s.getFullYear(), s.getMonth(), s.getDate());
    const diff = Math.round((dayStart.getTime() - cur.getTime()) / (24 * 3600 * 1000));
    return days - 1 - diff;
  };
  for (const p of payments) {
    if (p.status !== "succeeded") continue;
    const d = new Date(p.date);
    const idx = indexByDate(d);
    if (idx < 0 || idx >= days) continue;
    series[idx].income += Number(p.amount || 0);
  }
  for (const t of transfers) {
    const d = new Date(t.created_at);
    const idx = indexByDate(d);
    if (idx < 0 || idx >= days) continue;
    series[idx].spend += Number(t.amount || 0) + Number(t.fee || 0);
  }
  for (const s of series) s.net = s.income - s.spend;
  return series;
}

function CashflowChart({ series, loading }: { series: SeriesPoint[]; loading: boolean }) {
  const w = 360, h = 120, pad = 6;
  const maxIncome = Math.max(1, ...series.map((s) => s.income));
  const points = series.map((s, i) => {
    const x = pad + (i / Math.max(1, series.length - 1)) * (w - pad * 2);
    const y = h - pad - (s.income / maxIncome) * (h - pad * 2);
    return { x, y, s };
  });
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1]?.x.toFixed(1) ?? w - pad} ${h - pad} L ${points[0]?.x.toFixed(1) ?? pad} ${h - pad} Z`;
  const totalIncome = series.reduce((s, p) => s + p.income, 0);
  const totalSpend = series.reduce((s, p) => s + p.spend, 0);

  return (
    <div style={{
      background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)",
      borderRadius: R.md, padding: "14px 16px", minHeight: 168,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: 11, opacity: 0.75, fontWeight: FW.bold, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Cash flow · 30d
        </div>
        <div style={{ fontSize: 11, opacity: 0.75 }}>
          {loading ? "…" : `+${fmtCurrency(totalIncome, "CAD")} in`}
        </div>
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height: 120, marginTop: 8, display: "block" }}>
        <defs>
          <linearGradient id="pr13-income-grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity={0.55} />
            <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
          </linearGradient>
        </defs>
        {points.length > 1 && (
          <>
            <path d={areaPath} fill="url(#pr13-income-grad)" />
            <path d={linePath} fill="none" stroke="#A7F3D0" strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
          </>
        )}
      </svg>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11, opacity: 0.7 }}>
        <span>{series[0]?.label}</span>
        <span>{series[Math.floor(series.length / 2)]?.label}</span>
        <span>{series[series.length - 1]?.label}</span>
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 14, fontSize: 11, opacity: 0.88 }}>
        <span>
          <span style={{
            display: "inline-block", width: 8, height: 8, borderRadius: 2,
            background: "#10B981", marginRight: 6,
          }} />
          Income · {fmtCurrency(totalIncome, "CAD")}
        </span>
        <span>
          <span style={{
            display: "inline-block", width: 8, height: 8, borderRadius: 2,
            background: "rgba(255,255,255,0.35)", marginRight: 6,
          }} />
          Outflows · {fmtCurrency(totalSpend, "CAD")}
        </span>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Account tile
// ───────────────────────────────────────────────────────────────────────────

function AccountTile({ account }: { account: Account }) {
  const isPrimary = account.account_type?.includes("checking") || account.is_primary;
  const accent = isPrimary ? C.accountPrimary : C.accountSecondary;
  const label = account.account_name || account.account_type.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
  return (
    <Link href={`/app/accounts/${account.id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <BankingCard interactive style={{ borderLeft: `4px solid ${accent}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 10, color: C.textMuted, fontWeight: FW.bold,
              letterSpacing: "0.1em", textTransform: "uppercase",
            }}>
              {isPrimary ? "Primary · " : ""}{account.account_type?.includes("savings") ? "Savings" : "Checking"}
            </div>
            <div style={{ fontSize: 15, fontWeight: FW.bold, color: C.textPrimary, marginTop: 4 }}>
              {label}
            </div>
          </div>
          {account.status === "active" ? (
            <span style={pillOk}>Active</span>
          ) : (
            <span style={pillPending}>{account.status}</span>
          )}
        </div>
        <div style={{ ...banking.amount.large, fontSize: 26, color: C.textPrimary, marginTop: 12 }}>
          {fmtCurrency(Number(account.balance || 0), account.currency || "CAD")}
        </div>
        <div style={{
          marginTop: 10, fontSize: 11, color: C.textMuted,
          fontFamily: banking.font.mono, letterSpacing: "0.04em",
        }}>
          •••• {String(account.account_number || "").slice(-4) || "—"}
        </div>
      </BankingCard>
    </Link>
  );
}

function AccountSkeleton() {
  return (
    <BankingCard>
      <div style={{ height: 14, width: 90, background: C.surfaceInset, borderRadius: 4 }} />
      <div style={{ height: 28, width: "70%", background: C.surfaceInset, borderRadius: 4, marginTop: 14 }} />
      <div style={{ height: 12, width: 120, background: C.surfaceInset, borderRadius: 4, marginTop: 14 }} />
    </BankingCard>
  );
}

function AddAccountTile() {
  return (
    <Link href="/app/accounts?new=1" style={{ textDecoration: "none", color: "inherit" }}>
      <div style={{
        border: `1.5px dashed ${C.borderMedium}`, borderRadius: R.md,
        padding: "20px 22px", minHeight: 148,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 6, color: C.textMuted, cursor: "pointer",
        transition: banking.transition.base,
      }}>
        <div style={{ fontSize: 28, color: C.accountPrimary }}>＋</div>
        <div style={{ fontSize: 13, fontWeight: FW.bold, color: C.textPrimary }}>Add account</div>
        <div style={{ fontSize: 11, color: C.textMuted, textAlign: "center" }}>
          Checking, savings, or multi-currency
        </div>
      </div>
    </Link>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Recent activity table
// ───────────────────────────────────────────────────────────────────────────

interface ActivityRow {
  id: string; date: string; desc: string; kind: "income" | "transfer" | "other";
  amount: number; currency: string; positive: boolean;
}

function buildRecentActivity(payments: Payment[], transfers: Transfer[]): ActivityRow[] {
  const rows: ActivityRow[] = [
    ...payments.map((p) => ({
      id: p.id, date: p.date, desc: p.description || p.customer || "Payment received",
      kind: "income" as const, amount: Number(p.amount || 0),
      currency: p.currency || "CAD", positive: true,
    })),
    ...transfers.map((t) => ({
      id: t.id, date: t.created_at,
      desc: `${capitalize(t.transfer_type)} to ${t.recipient_name || "—"}`,
      kind: "transfer" as const, amount: -(Number(t.amount || 0) + Number(t.fee || 0)),
      currency: "CAD", positive: false,
    })),
  ];
  rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return rows;
}

function ActivityTable({ rows, loading }: { rows: ActivityRow[]; loading: boolean }) {
  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ display: "flex", gap: 16, padding: "10px 0", borderBottom: i < 3 ? `1px solid ${C.borderSoft}` : "none" }}>
            <div style={{ width: 80, height: 12, background: C.surfaceInset, borderRadius: 4 }} />
            <div style={{ flex: 1, height: 12, background: C.surfaceInset, borderRadius: 4 }} />
            <div style={{ width: 100, height: 12, background: C.surfaceInset, borderRadius: 4 }} />
          </div>
        ))}
      </div>
    );
  }
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          {["Date", "Description", "Type", "Amount"].map((h) => (
            <th key={h} style={thStyle}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} style={{ borderTop: `1px solid ${C.borderSoft}` }}>
            <td style={tdStyle}>{fmtDate(r.date)}</td>
            <td style={{ ...tdStyle, color: C.textPrimary, fontWeight: FW.medium }}>{r.desc}</td>
            <td style={tdStyle}>
              <span style={r.kind === "income" ? kindBadgeIncome : kindBadgeTransfer}>
                {r.kind === "income" ? "Income" : "Transfer"}
              </span>
            </td>
            <td style={{ ...tdStyle, textAlign: "right", ...banking.amount.base,
              color: r.positive ? C.incomePositive : C.textPrimary }}>
              {r.positive ? "+" : "−"}{fmtCurrency(Math.abs(r.amount), r.currency)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EmptyActivity() {
  return (
    <div style={{ padding: "40px 24px", textAlign: "center", color: C.textMuted }}>
      <div style={{ fontSize: 34, marginBottom: 8 }}>📭</div>
      <p style={{ margin: "0 0 4px", fontWeight: FW.bold, color: C.textPrimary, fontSize: 14 }}>
        Nothing has moved yet
      </p>
      <p style={{ margin: "0 0 16px", fontSize: 12 }}>
        Your first transaction will appear here as soon as money flows in or out.
      </p>
      <BankingButton as="link" href="/app/wallets" variant="primary" size="sm">
        Make your first transfer
      </BankingButton>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Mini tiles
// ───────────────────────────────────────────────────────────────────────────

function MiniTile({ icon, label, value, sub, href }: { icon: string; label: string; value: string; sub?: string; href: string }) {
  return (
    <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
      <div style={{
        background: C.surfaceElevated, border: `1px solid ${C.borderSoft}`,
        borderRadius: R.md, padding: "16px 18px",
        display: "flex", alignItems: "center", gap: 14, cursor: "pointer",
        transition: banking.transition.base,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: R.sm,
          background: C.surfaceInset, display: "inline-flex",
          alignItems: "center", justifyContent: "center", fontSize: 20,
        }}>
          {icon}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 11, color: C.textMuted, fontWeight: FW.bold, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {label}
          </div>
          <div style={{ ...banking.amount.base, fontSize: 16, color: C.textPrimary, fontWeight: FW.bold, marginTop: 3 }}>
            {value}
          </div>
          {sub && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{sub}</div>}
        </div>
      </div>
    </Link>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Shared style tokens for this page
// ───────────────────────────────────────────────────────────────────────────

const sectionHeaderStyle: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "baseline",
  marginBottom: 12,
};
const h2Style: React.CSSProperties = {
  margin: 0, fontSize: 16, fontWeight: FW.bold, color: C.textPrimary, letterSpacing: "-0.2px",
};
const moreLinkStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: FW.bold, color: C.accountPrimary, textDecoration: "none",
};
const thStyle: React.CSSProperties = {
  textAlign: "left", padding: "12px 20px",
  fontSize: 10, fontWeight: FW.bold, color: C.textMuted,
  letterSpacing: "0.08em", textTransform: "uppercase",
};
const tdStyle: React.CSSProperties = {
  padding: "12px 20px", fontSize: 13, color: C.textSecondary,
  verticalAlign: "middle",
};
const pillOk: React.CSSProperties = {
  fontSize: 10, fontWeight: FW.bold, padding: "3px 10px", borderRadius: 999,
  background: C.accentSoft, color: C.incomePositive, letterSpacing: "0.04em",
  textTransform: "uppercase",
};
const pillPending: React.CSSProperties = {
  fontSize: 10, fontWeight: FW.bold, padding: "3px 10px", borderRadius: 999,
  background: C.pendingBg, color: C.pending, letterSpacing: "0.04em",
  textTransform: "uppercase",
};
const kindBadgeIncome: React.CSSProperties = {
  fontSize: 10, fontWeight: FW.bold, padding: "3px 10px", borderRadius: 999,
  background: C.accentSoft, color: C.incomePositive,
};
const kindBadgeTransfer: React.CSSProperties = {
  fontSize: 10, fontWeight: FW.bold, padding: "3px 10px", borderRadius: 999,
  background: C.surfaceInset, color: C.textSecondary,
};

function capitalize(s: string): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}
