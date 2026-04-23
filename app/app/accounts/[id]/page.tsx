// /app/accounts/[id] — per-account detail view.
//
// Four tabs:
//   Activity   — transactions filtered to this account (payments +
//                transfers that reference from_account_id / to_account_id).
//   Details    — routing, SWIFT, masked account #, download ACH instructions.
//   Statements — monthly PDF statements (mock list — no generator yet).
//   Settings   — rename, set-as-primary, close account (via banking-ops).

"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BankingShell, BankingCard, BankingButton } from "../../BankingShell";
import { banking, fmtCurrency, fmtDate } from "@/lib/design-system/banking-tokens";

const { color: C, fontWeight: FW, radius: R } = banking;

interface Account {
  id: string; merchant_id: string; account_type: string; account_name: string;
  account_number: string; routing_number: string; balance: number; status: string;
  is_primary: boolean; currency?: string; created_at?: string;
}
interface Transfer {
  id: string; transfer_type: string; recipient_name: string;
  amount: number; fee: number; status: string; memo: string; created_at: string;
  from_account_id?: string; to_account_id?: string;
}
interface Payment { id: string; amount: number; currency: string; status: string; description: string; date: string }

type Tab = "activity" | "details" | "statements" | "settings";

function readMerchantId(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("zp_client") || "";
}

export default function AccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const accountId = String(params?.id ?? "");

  const [account, setAccount] = useState<Account | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("activity");

  // Sync tab with URL hash on mount (links from /app/accounts use #details).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace("#", "") as Tab;
    if (["activity", "details", "statements", "settings"].includes(hash)) setTab(hash);
  }, []);

  const load = useCallback(async () => {
    const mid = readMerchantId();
    if (!mid || !accountId) return;
    setLoading(true);
    try {
      const [bankingRes, statsRes] = await Promise.all([
        fetch(`/api/zenipay/banking-ops?merchant_id=${encodeURIComponent(mid)}`).then((r) => r.json()),
        fetch(`/api/zenipay/stats?merchant_id=${encodeURIComponent(mid)}`).then((r) => r.json()),
      ]);
      const accounts: Account[] = bankingRes.accounts ?? [];
      setAccount(accounts.find((a) => a.id === accountId) ?? null);
      setTransfers((bankingRes.transfers ?? []).filter((t: Transfer) => t.from_account_id === accountId || t.to_account_id === accountId));
      setPayments(statsRes.recent_transactions ?? []);
    } finally {
      setLoading(false);
    }
  }, [accountId]);
  useEffect(() => { void load(); }, [load]);

  const activity = useMemo(() => {
    const rows = [
      ...payments.map((p) => ({ id: p.id, date: p.date, desc: p.description || "Payment received", amount: Number(p.amount || 0), positive: true, kind: "Payment" })),
      ...transfers.map((t) => ({ id: t.id, date: t.created_at, desc: `${capitalize(t.transfer_type)} to ${t.recipient_name || "—"}`, amount: -(Number(t.amount || 0) + Number(t.fee || 0)), positive: false, kind: "Transfer" })),
    ];
    rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return rows;
  }, [payments, transfers]);

  const isSavings = account?.account_type?.includes("savings");
  const accent = isSavings ? C.accountSecondary : C.accountPrimary;

  const postBanking = async (action: string, body: Record<string, unknown> = {}) => {
    const mid = readMerchantId();
    await fetch("/api/zenipay/banking-ops", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, merchant_id: mid, account_id: accountId, ...body }),
    });
  };

  if (!accountId) {
    return <BankingShell title="Account"><p style={{ color: C.textMuted }}>Missing account id.</p></BankingShell>;
  }

  return (
    <BankingShell
      title={account?.account_name || "Account"}
      subtitle={account ? capitalize(account.account_type.replace(/_/g, " ")) : "Loading…"}
      actions={
        <>
          <BankingButton as="link" href="/app/accounts" variant="ghost" size="sm">← All accounts</BankingButton>
          <BankingButton as="link" href={`/app/wallets?from=${encodeURIComponent(accountId)}`} variant="primary" size="sm">Send money</BankingButton>
        </>
      }
    >
      {/* Header block with balance + quick actions */}
      <BankingCard style={{ padding: 0, overflow: "hidden", marginBottom: 20, borderLeft: "none" }}>
        <div style={{ padding: "26px 28px", background: `linear-gradient(135deg, ${accent} 0%, #072B22 100%)`, color: "#fff" }}>
          <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.12em", opacity: 0.8, fontWeight: FW.bold, textTransform: "uppercase" }}>
            Available balance
          </p>
          <p style={{ ...banking.amount.hero, margin: "8px 0 0", color: "#fff", fontSize: 44 }}>
            {loading && !account
              ? <span style={{ opacity: 0.6 }}>…</span>
              : fmtCurrency(Number(account?.balance || 0), account?.currency || "CAD")}
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 12, opacity: 0.85 }}>
            Opened {account?.created_at ? fmtDate(account.created_at) : "—"} ·{" "}
            <span style={{ fontFamily: banking.font.mono }}>•••• {(account?.account_number || "").slice(-4) || "————"}</span>
          </p>
        </div>
      </BankingCard>

      {/* Tabs */}
      <nav style={{
        display: "flex", gap: 2, borderBottom: `1px solid ${C.borderSoft}`,
        marginBottom: 18,
      }}>
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
                padding: "12px 18px", borderRadius: `${R.sm} ${R.sm} 0 0`,
                border: "none", background: "transparent",
                color: active ? C.accountPrimary : C.textMuted,
                fontWeight: FW.bold, fontSize: 13, cursor: "pointer",
                borderBottom: `3px solid ${active ? C.accountPrimary : "transparent"}`,
                marginBottom: -1, textTransform: "capitalize" as const,
              }}
            >
              {t}
            </button>
          );
        })}
      </nav>

      {/* Content */}
      {tab === "activity" && (
        <BankingCard style={{ padding: 0 }}>
          {activity.length === 0 ? (
            <p style={{ padding: "36px 20px", margin: 0, color: C.textMuted, textAlign: "center" as const }}>
              No activity for this account yet.
            </p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Date", "Description", "Type", "Amount"].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activity.slice(0, 50).map((r) => (
                  <tr key={r.id} style={{ borderTop: `1px solid ${C.borderSoft}` }}>
                    <td style={tdStyle}>{fmtDate(r.date)}</td>
                    <td style={{ ...tdStyle, color: C.textPrimary }}>{r.desc}</td>
                    <td style={tdStyle}>
                      <span style={r.positive ? kindBadgeIncome : kindBadgeTransfer}>{r.kind}</span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" as const, ...banking.amount.base,
                      color: r.positive ? C.incomePositive : C.textPrimary }}>
                      {r.positive ? "+" : "−"}{fmtCurrency(Math.abs(r.amount), account?.currency || "CAD")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </BankingCard>
      )}

      {tab === "details" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
          <BankingCard>
            <div style={fieldLabel}>Account holder</div>
            <div style={{ ...fieldValue, fontWeight: FW.bold }}>{account?.account_name || "—"}</div>
            <div style={{ ...fieldLabel, marginTop: 14 }}>Account number</div>
            <div style={{ ...fieldValue, fontFamily: banking.font.mono }}>{account?.account_number || "—"}</div>
            <div style={{ ...fieldLabel, marginTop: 14 }}>Routing / Transit</div>
            <div style={{ ...fieldValue, fontFamily: banking.font.mono }}>{account?.routing_number || "—"}</div>
            <div style={{ ...fieldLabel, marginTop: 14 }}>Currency</div>
            <div style={fieldValue}>{account?.currency || "CAD"}</div>
          </BankingCard>
          <BankingCard>
            <div style={{ fontSize: 14, fontWeight: FW.bold, color: C.textPrimary, marginBottom: 12 }}>
              Receive money
            </div>
            <p style={{ fontSize: 12, color: C.textMuted, margin: "0 0 12px" }}>
              Share these coordinates with anyone who needs to send you an ACH transfer, wire, or Interac e-transfer.
            </p>
            <BankingButton
              variant="secondary" size="sm"
              onClick={() => {
                if (!account) return;
                const text = `Account name: ${account.account_name}\nAccount number: ${account.account_number}\nRouting: ${account.routing_number}\nCurrency: ${account.currency || "CAD"}`;
                if (navigator.clipboard) navigator.clipboard.writeText(text);
              }}
            >
              Copy wire instructions
            </BankingButton>
            <BankingButton
              variant="ghost" size="sm" style={{ marginLeft: 6 }}
              onClick={() => window.print()}
            >
              Print / PDF
            </BankingButton>
          </BankingCard>
        </div>
      )}

      {tab === "statements" && (
        <BankingCard>
          <div style={{ fontSize: 14, fontWeight: FW.bold, color: C.textPrimary, marginBottom: 4 }}>
            Monthly statements
          </div>
          <p style={{ fontSize: 12, color: C.textMuted, margin: "0 0 14px" }}>
            Statements are generated on the 1st of each month.
          </p>
          {statementsPlaceholder(account).map((m) => (
            <div key={m.month} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderTop: `1px solid ${C.borderSoft}` }}>
              <div>
                <div style={{ fontSize: 13, color: C.textPrimary, fontWeight: FW.bold }}>{m.month}</div>
                <div style={{ fontSize: 11, color: C.textMuted }}>{m.range}</div>
              </div>
              <BankingButton variant="ghost" size="sm" onClick={() => alert("Statement download will unlock after first full month of activity.")}>
                Download PDF
              </BankingButton>
            </div>
          ))}
        </BankingCard>
      )}

      {tab === "settings" && (
        <BankingCard>
          <div style={{ fontSize: 14, fontWeight: FW.bold, color: C.textPrimary, marginBottom: 14 }}>
            Account settings
          </div>
          <SettingsRow
            label="Account name"
            value={account?.account_name || "—"}
            action={
              <BankingButton variant="secondary" size="sm" onClick={async () => {
                const name = prompt("New account name", account?.account_name || "");
                if (name && name !== account?.account_name) {
                  await postBanking("update_account", { account_name: name });
                  await load();
                }
              }}>Rename</BankingButton>
            }
          />
          <SettingsRow
            label="Primary account"
            value={account?.is_primary ? "Yes" : "No"}
            action={
              !account?.is_primary ? (
                <BankingButton variant="secondary" size="sm" onClick={async () => {
                  await postBanking("update_account", { is_primary: true });
                  await load();
                }}>Set as primary</BankingButton>
              ) : (
                <span style={{ fontSize: 12, color: C.textMuted }}>Default for transfers</span>
              )
            }
          />
          <SettingsRow
            label="Status"
            value={account?.status || "—"}
            action={
              account?.status === "active" ? (
                <BankingButton variant="secondary" size="sm" onClick={async () => {
                  if (confirm("Freeze this account? You can unfreeze it later.")) {
                    await postBanking("freeze_account", { freeze: true });
                    await load();
                  }
                }}>Freeze</BankingButton>
              ) : (
                <BankingButton variant="secondary" size="sm" onClick={async () => {
                  await postBanking("freeze_account", { freeze: false });
                  await load();
                }}>Unfreeze</BankingButton>
              )
            }
          />
          <SettingsRow
            label="Close account"
            value="Permanently close. Balance must be $0."
            action={
              <BankingButton
                variant="danger" size="sm"
                disabled={Number(account?.balance || 0) > 0}
                onClick={async () => {
                  if (!confirm("Close this account? This cannot be undone.")) return;
                  await postBanking("update_account", { status: "closed" });
                  router.push("/app/accounts");
                }}
              >
                Close account
              </BankingButton>
            }
          />
        </BankingCard>
      )}
    </BankingShell>
  );
}

function SettingsRow({ label, value, action }: { label: string; value: string; action: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "14px 0", borderTop: `1px solid ${C.borderSoft}`, gap: 12, flexWrap: "wrap",
    }}>
      <div style={{ minWidth: 200 }}>
        <div style={{ fontSize: 13, fontWeight: FW.bold, color: C.textPrimary }}>{label}</div>
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{value}</div>
      </div>
      {action}
    </div>
  );
}

function statementsPlaceholder(_a: Account | null): Array<{ month: string; range: string }> {
  const now = new Date();
  const months = [];
  for (let i = 0; i < 3; i++) {
    const start = new Date(now.getFullYear(), now.getMonth() - i - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i, 0);
    months.push({
      month: start.toLocaleString("en-CA", { month: "long", year: "numeric" }),
      range: `${fmtDate(start)} — ${fmtDate(end)}`,
    });
  }
  return months;
}

const fieldLabel: React.CSSProperties = {
  fontSize: 10, fontWeight: FW.bold, color: C.textMuted,
  letterSpacing: "0.1em", textTransform: "uppercase",
};
const fieldValue: React.CSSProperties = {
  fontSize: 13, color: C.textPrimary, marginTop: 4,
};
const thStyle: React.CSSProperties = {
  textAlign: "left", padding: "12px 20px", fontSize: 10, fontWeight: FW.bold,
  color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase",
};
const tdStyle: React.CSSProperties = {
  padding: "12px 20px", fontSize: 13, color: C.textSecondary,
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
  return s.charAt(0).toUpperCase() + s.slice(1);
}
