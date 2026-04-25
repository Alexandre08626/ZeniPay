// /app/accounts/[id] — account detail page on the new DashboardShell.

"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, SendHorizontal, Copy, Printer, ArrowDownCircle } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BalanceHero } from "@/components/dashboard/BalanceHero";
import { BankingCard } from "@/components/dashboard/BankingCard";
import { DataTable } from "@/components/dashboard/DataTable";
import { GradientButton } from "@/components/dashboard/GradientButton";
import zp from "@/lib/design-system/zenipay-brand";
import { useAutoRefresh } from "@/lib/hooks/useAutoRefresh";
import { ZeniPayAccountCard } from "@/app/components/shared/ZeniPayAccountCard";
import { YieldPanel } from "@/app/components/shared/YieldPanel";
import { WithdrawSheet } from "./WithdrawSheet";

interface Account {
  id: string; account_type: string; account_name: string;
  account_number: string; routing_number: string; balance: number;
  status: string; is_primary: boolean; currency?: string; created_at?: string;
  zp_account_number?: string | null; zp_routing_code?: string | null;
}
interface ActivityRow {
  id: string;
  source: "payment" | "transfer" | "ledger" | "payout";
  kind: string;
  direction: "in" | "out";
  date: string;
  amount: number;
  currency: string;
  description: string;
  counterparty: string;
  status: string;
  account_id: string | null;
  metadata: Record<string, unknown>;
}

type Tab = "activity" | "details" | "statements" | "settings";

function mid() { return typeof window === "undefined" ? "" : sessionStorage.getItem("zp_client") || ""; }

export default function AccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const accountId = String(params?.id ?? "");

  const [account, setAccount] = useState<Account | null>(null);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("activity");
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [finixReady, setFinixReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace("#", "") as Tab;
    if (["activity", "details", "statements", "settings"].includes(hash)) setTab(hash);
  }, []);

  const load = useCallback(async () => {
    if (!mid() || !accountId) return;
    setLoading(true);
    try {
      const [banking, feed, dests] = await Promise.all([
        fetch(`/api/zenipay/banking-ops?merchant_id=${encodeURIComponent(mid())}`).then((r) => r.json()),
        fetch(`/api/zenipay/merchant-activity?merchant_id=${encodeURIComponent(mid())}&account_id=${encodeURIComponent(accountId)}&limit=200`).then((r) => r.json()),
        fetch(`/api/v1/merchant/payout-destinations?merchant_id=${encodeURIComponent(mid())}`).then((r) => r.json()),
      ]);
      const acc = (banking.accounts ?? []).find((a: Account) => a.id === accountId);
      setAccount(acc ?? null);
      setActivity((feed.activity ?? []) as ActivityRow[]);
      setFinixReady(!!dests.finix_payouts_ready);
    } finally { setLoading(false); }
  }, [accountId]);

  useEffect(() => { void load(); }, [load]);
  useAutoRefresh(load);

  const activityRows = useMemo(() => activity.map((a) => ({
    id: a.id,
    date: a.date,
    desc: a.description,
    amount: a.direction === "in" ? a.amount : -a.amount,
    positive: a.direction === "in",
    kind: kindLabel(a.kind),
  })), [activity]);

  const post = async (action: string, body: Record<string, unknown> = {}) => {
    await fetch("/api/zenipay/banking-ops", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, merchant_id: mid(), account_id: accountId, ...body }),
    });
    await load();
  };

  const isSavings = account?.account_type?.includes("savings");

  return (
    <DashboardShell mode="merchant">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <Link href="/app/accounts" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontSize: 13, fontWeight: zp.weight.semibold, color: zp.text.muted, textDecoration: "none",
        }}>
          <ChevronLeft size={14} /> All accounts
        </Link>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <GradientButton
            variant="secondary" size="md"
            icon={<ArrowDownCircle size={14} />}
            onClick={() => setShowWithdraw(true)}
            disabled={!account || Number(account?.balance ?? 0) <= 0}
          >
            Withdraw{finixReady ? "" : " (coming soon)"}
          </GradientButton>
          <GradientButton href={`/app/wallets?from=${encodeURIComponent(accountId)}`} variant="primary" size="md" icon={<SendHorizontal size={14} />}>
            Send money
          </GradientButton>
        </div>
      </div>

      {toast && (
        <BankingCard style={{ marginBottom: 12 }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            color: zp.semantic.success, fontSize: 13, fontWeight: zp.weight.semibold,
          }}>
            {toast}
            <button onClick={() => setToast(null)} style={{
              background: "transparent", border: "none", cursor: "pointer",
              color: zp.text.muted,
            }}>✕</button>
          </div>
        </BankingCard>
      )}

      <BalanceHero
        eyebrow={account ? capitalize(account.account_type.replace(/_/g, " ")) : "Loading…"}
        label={account?.account_name || "Account"}
        amount={Number(account?.balance || 0)}
        currency={account?.currency || "CAD"}
        subtitle={
          <span>
            <span style={{ fontFamily: zp.font.mono }}>•••• {(account?.account_number || "").slice(-4) || "————"}</span>
            {account?.created_at && <>  ·  opened {zp.fmtDate(account.created_at)}</>}
          </span>
        }
        accent={isSavings ? "violet" : "cyan"}
        cosmic={false}
        actions={[]}
        sparklineData={[]}
      />

      <nav style={{ display: "flex", gap: 2, borderBottom: `1px solid ${zp.surface.border}`, marginTop: 22, marginBottom: 18 }}>
        {(["activity", "details", "statements", "settings"] as Tab[]).map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                if (typeof window !== "undefined") window.history.replaceState(null, "", `#${t}`);
              }}
              style={{
                padding: "12px 18px", border: "none", background: "transparent",
                color: active ? zp.text.primary : zp.text.muted,
                fontWeight: active ? zp.weight.semibold : zp.weight.medium,
                fontSize: 13, cursor: "pointer",
                borderBottom: `2px solid ${active ? (isSavings ? zp.brand.violet : zp.brand.cyan) : "transparent"}`,
                marginBottom: -1,
                textTransform: "capitalize" as const,
                fontFamily: zp.font.sans,
                transition: zp.motion.base,
              }}
            >
              {t}
            </button>
          );
        })}
      </nav>

      {tab === "activity" && (
        <BankingCard padding="none" accent="neutral">
          <DataTable
            rows={activityRows}
            loading={loading && activityRows.length === 0}
            rowKey={(r) => r.id}
            columns={[
              { key: "date", header: "Date", cell: (r) => zp.fmtDate(r.date), width: 140 },
              { key: "desc", header: "Description", cell: (r) => r.desc },
              { key: "kind", header: "Type", cell: (r) => <KindPill kind={r.kind} positive={r.positive} />, width: 120 },
              {
                key: "amount", header: "Amount", mono: true, align: "right", width: 160,
                cell: (r) => (
                  <span style={{ color: r.positive ? zp.semantic.success : zp.text.primary, fontWeight: zp.weight.semibold }}>
                    {r.positive ? "+" : "−"}{zp.fmtCurrency(Math.abs(r.amount), account?.currency || "CAD")}
                  </span>
                ),
              },
            ]}
            empty="No activity on this account yet."
          />
        </BankingCard>
      )}

      {tab === "details" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
          {account && (
            <YieldPanel
              merchantId={account ? mid() : ""}
              accountId={account.id}
              accountType="merchant"
              balance={Number(account.balance ?? 0)}
              currency={account.currency || "CAD"}
              accent="cyan"
            />
          )}
          <ZeniPayAccountCard
            accountType="merchant"
            accent="cyan"
            accountNumber={account?.zp_account_number ?? null}
            routingCode={account?.zp_routing_code ?? null}
            accountName={account?.account_name}
            currency={account?.currency || "CAD"}
            balance={Number(account?.balance ?? 0)}
          />
          <BankingCard>
            <div style={{ fontSize: 14, fontWeight: zp.weight.semibold, color: zp.text.primary, marginBottom: 8 }}>
              Share your account
            </div>
            <p style={{ fontSize: 12, color: zp.text.muted, margin: "0 0 14px", lineHeight: 1.5 }}>
              Share this account number to receive funds within the ZeniPay Network.
              For external bank transfers (ACH, wire, Interac), generate a payment link.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <GradientButton
                variant="primary" size="sm" icon={<Copy size={12} />}
                onClick={async () => {
                  if (!account?.zp_account_number) return;
                  const txt = `${account.zp_account_number} · ${account.zp_routing_code ?? ""} · ZeniPay Network`;
                  try { await navigator.clipboard.writeText(txt); } catch { /* ignore */ }
                }}
              >
                Share account
              </GradientButton>
              <GradientButton href="/app/pay-links" variant="ghost" size="sm">
                Generate payment link
              </GradientButton>
              <GradientButton variant="ghost" size="sm" icon={<Printer size={12} />} onClick={() => window.print()}>
                Print
              </GradientButton>
            </div>
          </BankingCard>
        </div>
      )}

      {tab === "statements" && (
        <BankingCard>
          <div style={{ fontSize: 14, fontWeight: zp.weight.semibold, color: zp.text.primary, marginBottom: 4 }}>
            Monthly statements
          </div>
          <p style={{ fontSize: 12, color: zp.text.muted, margin: "0 0 14px" }}>
            Statements are generated on the 1st of each month.
          </p>
          {placeholderMonths().map((m) => (
            <div key={m.month} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderTop: `1px solid ${zp.surface.border}` }}>
              <div>
                <div style={{ fontSize: 13, color: zp.text.primary, fontWeight: zp.weight.semibold }}>{m.month}</div>
                <div style={{ fontSize: 11, color: zp.text.muted }}>{m.range}</div>
              </div>
              <GradientButton variant="ghost" size="sm" onClick={() => alert("Statement download unlocks after first full month.")}>
                Download PDF
              </GradientButton>
            </div>
          ))}
        </BankingCard>
      )}

      {showWithdraw && account && (
        <WithdrawSheet
          merchantId={mid()}
          fromAccountId={account.id}
          currency={account.currency || "CAD"}
          balance={Number(account.balance ?? 0)}
          finixReady={finixReady}
          onClose={() => setShowWithdraw(false)}
          onSuccess={async (msg) => {
            setShowWithdraw(false);
            setToast(msg);
            await load();
          }}
        />
      )}

      {tab === "settings" && (
        <BankingCard>
          <div style={{ fontSize: 14, fontWeight: zp.weight.semibold, color: zp.text.primary, marginBottom: 10 }}>
            Account settings
          </div>
          <SettingsRow
            label="Account name" value={account?.account_name || "—"}
            action={
              <GradientButton variant="secondary" size="sm" onClick={async () => {
                const name = prompt("New account name", account?.account_name || "");
                if (name && name !== account?.account_name) await post("update_account", { account_name: name });
              }}>Rename</GradientButton>
            }
          />
          <SettingsRow
            label="Primary account" value={account?.is_primary ? "Yes" : "No"}
            action={!account?.is_primary ? (
              <GradientButton variant="secondary" size="sm" onClick={() => post("update_account", { is_primary: true })}>Set as primary</GradientButton>
            ) : <span style={{ fontSize: 12, color: zp.text.muted }}>Default for transfers</span>}
          />
          <SettingsRow
            label="Status" value={account?.status || "—"}
            action={account?.status === "active" ? (
              <GradientButton variant="secondary" size="sm" onClick={() => {
                if (confirm("Freeze this account? You can unfreeze later.")) void post("freeze_account", { freeze: true });
              }}>Freeze</GradientButton>
            ) : (
              <GradientButton variant="secondary" size="sm" onClick={() => post("freeze_account", { freeze: false })}>Unfreeze</GradientButton>
            )}
          />
          <SettingsRow
            label="Close account" value="Permanently close. Balance must be $0."
            action={
              <GradientButton
                variant="danger" size="sm"
                disabled={Number(account?.balance || 0) > 0}
                onClick={async () => {
                  if (!confirm("Close this account? This cannot be undone.")) return;
                  const r = await fetch("/api/zenipay/banking-ops", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "close_account", merchant_id: mid(), account_id: accountId }),
                  });
                  const data = await r.json().catch(() => ({}));
                  if (!r.ok || data?.error) { alert(data?.error || "Close failed."); return; }
                  router.push("/app/accounts");
                }}
              >
                Close account
              </GradientButton>
            }
          />
        </BankingCard>
      )}
    </DashboardShell>
  );
}

function KindPill({ kind, positive }: { kind: string; positive: boolean }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: zp.weight.semibold, padding: "3px 10px", borderRadius: zp.radius.pill,
      background: positive ? zp.semantic.successBg : zp.surface.bg3,
      color: positive ? zp.semantic.success : zp.text.muted,
      letterSpacing: "0.06em", textTransform: "uppercase" as const,
    }}>{kind}</span>
  );
}

function SettingsRow({ label, value, action }: { label: string; value: string; action: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "14px 0", borderTop: `1px solid ${zp.surface.border}`, gap: 12, flexWrap: "wrap",
    }}>
      <div style={{ minWidth: 200 }}>
        <div style={{ fontSize: 13, fontWeight: zp.weight.semibold, color: zp.text.primary }}>{label}</div>
        <div style={{ fontSize: 12, color: zp.text.muted, marginTop: 2 }}>{value}</div>
      </div>
      {action}
    </div>
  );
}

function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted,
      letterSpacing: "0.1em", textTransform: "uppercase" as const, ...style,
    }}>{children}</div>
  );
}

function Value({ children, bold, mono }: { children: React.ReactNode; bold?: boolean; mono?: boolean }) {
  return (
    <div style={{
      fontSize: 13, color: zp.text.primary, marginTop: 4,
      fontWeight: bold ? zp.weight.semibold : zp.weight.regular,
      fontFamily: mono ? zp.font.mono : undefined,
    }}>{children}</div>
  );
}

function placeholderMonths(): Array<{ month: string; range: string }> {
  const now = new Date();
  const months = [];
  for (let i = 0; i < 3; i++) {
    const s = new Date(now.getFullYear(), now.getMonth() - i - 1, 1);
    const e = new Date(now.getFullYear(), now.getMonth() - i, 0);
    months.push({
      month: s.toLocaleString("en-CA", { month: "long", year: "numeric" }),
      range: `${zp.fmtDate(s)} — ${zp.fmtDate(e)}`,
    });
  }
  return months;
}

function capitalize(s: string): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}

function kindLabel(kind: string): string {
  switch (kind) {
    case "payment_in":          return "Payment";
    case "transfer_out":        return "Transfer";
    case "transfer_in":         return "Transfer in";
    case "transfer_fee":        return "Fee";
    case "payout_out":          return "Withdrawal";
    case "agent_treasury_fund": return "Agent treasury";
    case "transfer_to_agent":   return "Transfer to agent";
    case "refund":              return "Refund";
    case "fee":                 return "Fee";
    case "generic_credit":      return "Credit";
    case "generic_debit":       return "Debit";
    default:                    return capitalize(kind);
  }
}
