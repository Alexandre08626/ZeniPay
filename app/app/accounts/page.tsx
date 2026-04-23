// /app/accounts — list of business bank accounts.
//
// Each account is rendered as a full-width card (Mercury-style) showing:
//   * Account name + checking/savings pill + primary flag
//   * Big balance
//   * Masked account number (toggle show via eye button)
//   * Routing number
//   * Quick actions: Send, Receive, Statements, Close
//
// Clicking anywhere outside the action row navigates to /app/accounts/[id].

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { BankingShell, BankingCard, BankingButton } from "../BankingShell";
import { banking, fmtCurrency } from "@/lib/design-system/banking-tokens";

const { color: C, fontWeight: FW, radius: R } = banking;

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

function readMerchantId(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("zp_client") || "";
}

export default function AccountsListPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const mid = readMerchantId();
    if (!mid) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/zenipay/banking-ops?merchant_id=${encodeURIComponent(mid)}`).then((res) => res.json());
      setAccounts(r.accounts ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <BankingShell
      title="Accounts"
      subtitle={`${accounts.length} account${accounts.length === 1 ? "" : "s"} · total ${fmtCurrency(accounts.reduce((s, a) => s + Number(a.balance || 0), 0), accounts[0]?.currency || "CAD")}`}
      actions={
        <BankingButton
          variant="primary" size="sm"
          onClick={async () => {
            const mid = readMerchantId();
            if (!mid) return;
            const body = { action: "create_account", merchant_id: mid, account_type: "business_checking", currency: "CAD" };
            await fetch("/api/zenipay/banking-ops", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
            await load();
          }}
        >
          + New account
        </BankingButton>
      }
    >
      {err && (
        <div style={errBoxStyle}>
          Failed to load accounts: {err}
        </div>
      )}

      {loading && accounts.length === 0 ? (
        <AccountsSkeleton />
      ) : accounts.length === 0 ? (
        <EmptyAccounts onCreate={load} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {accounts.map((a) => (
            <AccountRow
              key={a.id}
              account={a}
              show={!!reveal[a.id]}
              onToggleReveal={() => setReveal((r) => ({ ...r, [a.id]: !r[a.id] }))}
            />
          ))}
        </div>
      )}
    </BankingShell>
  );
}

function AccountRow({ account, show, onToggleReveal }: { account: Account; show: boolean; onToggleReveal: () => void }) {
  const router = useRouter();
  const isSavings = account.account_type?.includes("savings");
  const accent = isSavings ? C.accountSecondary : C.accountPrimary;
  const maskedAcct = show ? account.account_number : `•••• •••• ${(account.account_number || "").slice(-4) || "————"}`;
  const maskedRouting = show ? account.routing_number : (account.routing_number ? `••• ${(account.routing_number || "").slice(-3)}` : "—");

  return (
    <div
      onClick={(e) => {
        // Ignore clicks on buttons / eye toggle — only navigate on card body.
        const t = e.target as HTMLElement;
        if (t.closest("button") || t.closest("a")) return;
        router.push(`/app/accounts/${account.id}`);
      }}
      style={{
        background: C.surfaceElevated, border: `1px solid ${C.borderSoft}`,
        borderRadius: R.md, padding: "22px 24px",
        borderLeft: `4px solid ${accent}`, cursor: "pointer",
        transition: banking.transition.base,
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr) auto", gap: 24, alignItems: "center" }} className="pr13-acct-row">
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {account.is_primary && (
              <span style={primaryPill}>Primary</span>
            )}
            <span style={typePill}>{isSavings ? "Savings" : "Checking"}</span>
            {account.status !== "active" && (
              <span style={statusPillPending}>{account.status}</span>
            )}
          </div>
          <div style={{ fontSize: 17, fontWeight: FW.bold, color: C.textPrimary, marginTop: 6, letterSpacing: "-0.2px" }}>
            <Link href={`/app/accounts/${account.id}`} style={{ color: "inherit", textDecoration: "none" }}>
              {account.account_name || capitalize(account.account_type.replace(/_/g, " "))}
            </Link>
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
            Opened {account.created_at ? new Date(account.created_at).toLocaleDateString("en-CA") : "—"}
          </div>
        </div>

        <div>
          <div style={fieldLabel}>Account number</div>
          <div style={{ ...fieldValue, fontFamily: banking.font.mono, display: "flex", alignItems: "center", gap: 6 }}>
            <span>{maskedAcct}</span>
            <button
              onClick={onToggleReveal}
              aria-label={show ? "Hide account number" : "Show account number"}
              style={eyeBtn}
            >
              {show ? "🙈" : "👁"}
            </button>
          </div>
          <div style={{ ...fieldLabel, marginTop: 8 }}>Routing</div>
          <div style={{ ...fieldValue, fontFamily: banking.font.mono, fontSize: 12 }}>{maskedRouting}</div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={fieldLabel}>Available</div>
          <div style={{ ...banking.amount.large, fontSize: 26, color: C.textPrimary, marginTop: 4 }}>
            {fmtCurrency(Number(account.balance || 0), account.currency || "CAD")}
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }} className="pr13-acct-actions">
          <BankingButton as="link" href={`/app/wallets?from=${encodeURIComponent(account.id)}`} variant="primary" size="sm">Send</BankingButton>
          <BankingButton as="link" href={`/app/accounts/${account.id}#details`} variant="secondary" size="sm">Receive</BankingButton>
          <BankingButton as="link" href={`/app/accounts/${account.id}#statements`} variant="ghost" size="sm">Statements</BankingButton>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .pr13-acct-row {
            grid-template-columns: 1fr 1fr !important;
          }
          .pr13-acct-actions {
            grid-column: 1 / -1 !important;
            justify-content: flex-start !important;
          }
        }
        @media (max-width: 540px) {
          .pr13-acct-row { grid-template-columns: 1fr !important; }
          .pr13-acct-actions { flex-wrap: wrap; }
        }
      `}</style>
    </div>
  );
}

function AccountsSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {Array.from({ length: 2 }).map((_, i) => (
        <BankingCard key={i}>
          <div style={{ display: "flex", gap: 24 }}>
            <div style={{ flex: "1 1 0" }}>
              <div style={{ height: 14, width: 90, background: C.surfaceInset, borderRadius: 4 }} />
              <div style={{ height: 20, width: "60%", background: C.surfaceInset, borderRadius: 4, marginTop: 10 }} />
            </div>
            <div style={{ flex: "1 1 0" }}>
              <div style={{ height: 12, width: 60, background: C.surfaceInset, borderRadius: 4 }} />
              <div style={{ height: 14, width: 140, background: C.surfaceInset, borderRadius: 4, marginTop: 8 }} />
            </div>
            <div style={{ flex: "0 0 180px", textAlign: "right" }}>
              <div style={{ height: 12, width: 80, background: C.surfaceInset, borderRadius: 4, marginLeft: "auto" }} />
              <div style={{ height: 30, width: 140, background: C.surfaceInset, borderRadius: 4, marginLeft: "auto", marginTop: 8 }} />
            </div>
          </div>
        </BankingCard>
      ))}
    </div>
  );
}

function EmptyAccounts({ onCreate }: { onCreate: () => void | Promise<void> }) {
  return (
    <BankingCard style={{ textAlign: "center", padding: "48px 24px" }}>
      <div style={{ fontSize: 44 }}>🏦</div>
      <h3 style={{ margin: "10px 0 4px", fontSize: 18, fontWeight: FW.bold, color: C.textPrimary }}>
        No accounts yet
      </h3>
      <p style={{ margin: "0 0 18px", color: C.textMuted, fontSize: 13 }}>
        Open your first ZeniPay business account to start receiving payments and sending transfers.
      </p>
      <BankingButton variant="primary" onClick={() => { void onCreate(); }}>
        Open my first account
      </BankingButton>
    </BankingCard>
  );
}

// Shared styles
const fieldLabel: React.CSSProperties = {
  fontSize: 10, fontWeight: FW.bold, color: C.textMuted,
  letterSpacing: "0.1em", textTransform: "uppercase",
};
const fieldValue: React.CSSProperties = {
  fontSize: 13, color: C.textPrimary, marginTop: 4,
};
const primaryPill: React.CSSProperties = {
  fontSize: 10, fontWeight: FW.bold, padding: "3px 10px", borderRadius: 999,
  background: C.accountPrimary, color: "#fff", letterSpacing: "0.08em",
  textTransform: "uppercase",
};
const typePill: React.CSSProperties = {
  fontSize: 10, fontWeight: FW.bold, padding: "3px 10px", borderRadius: 999,
  background: C.surfaceInset, color: C.textSecondary, letterSpacing: "0.06em",
  textTransform: "uppercase",
};
const statusPillPending: React.CSSProperties = {
  fontSize: 10, fontWeight: FW.bold, padding: "3px 10px", borderRadius: 999,
  background: C.pendingBg, color: C.pending, letterSpacing: "0.06em",
  textTransform: "uppercase",
};
const eyeBtn: React.CSSProperties = {
  background: "transparent", border: "none", cursor: "pointer",
  fontSize: 13, padding: 2, color: C.textMuted,
};
const errBoxStyle: React.CSSProperties = {
  padding: "12px 16px", borderRadius: 12, marginBottom: 16,
  background: C.disputedBg, border: `1px solid ${C.disputed}33`,
  color: C.disputed, fontSize: 13, fontWeight: FW.bold,
};

function capitalize(s: string): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}
