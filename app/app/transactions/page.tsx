// /app/transactions — unified activity feed.
//
// Merges three sources into one sortable table:
//   * zenipay_payments    (incoming card charges — income)
//   * zenipay_transfers   (outgoing ACH / wire / internal)
//   * zenipay_payouts     (external payouts)
//   Fees are surfaced as synthetic rows from each transfer's fee column.
//
// Filters (URL-synced so links are shareable):
//   type       — all / income / spending / transfers / fees
//   account    — from/to account id
//   date       — preset 7d / 30d / 90d / all
//   amount     — min/max
//   q          — full-text over description + counterparty
//
// Row click opens a side panel with full metadata + actions.

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BankingShell, BankingCard, BankingButton } from "../BankingShell";
import { banking, fmtCurrency, fmtDateTime } from "@/lib/design-system/banking-tokens";

const { color: C, fontWeight: FW, radius: R } = banking;

type TxKind = "income" | "transfer" | "payout" | "fee";
type TypeFilter = "all" | "income" | "spending" | "transfers" | "fees";

interface UnifiedRow {
  id: string;
  kind: TxKind;
  date: string;
  description: string;
  counterparty: string;
  amount: number;                 // signed: positive income, negative spend
  currency: string;
  status: string;
  accountId: string | null;
  raw: Record<string, unknown>;
}

function readMerchantId(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("zp_client") || "";
}

function readInitialFilters() {
  if (typeof window === "undefined") {
    return { type: "all" as TypeFilter, account: "", range: "30d", min: "", max: "", q: "" };
  }
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
  // Lazy init from the URL — avoids the useSearchParams() Suspense
  // requirement that trips static prerendering.
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [accountFilter, setAccountFilter] = useState("");
  const [range, setRange] = useState("30d");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    const f = readInitialFilters();
    setTypeFilter(f.type);
    setAccountFilter(f.account);
    setRange(f.range);
    setMin(f.min);
    setMax(f.max);
    setQ(f.q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [rows, setRows] = useState<UnifiedRow[]>([]);
  const [accounts, setAccounts] = useState<Array<{ id: string; account_name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<UnifiedRow | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  // Sync URL on filter change (history.replaceState — no router dep).
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
    const url = `/app/transactions${s ? `?${s}` : ""}`;
    window.history.replaceState(null, "", url);
  }, [typeFilter, accountFilter, range, min, max, q]);

  const load = useCallback(async () => {
    const mid = readMerchantId();
    if (!mid) return;
    setLoading(true);
    try {
      const [bankingRes, statsRes] = await Promise.all([
        fetch(`/api/zenipay/banking-ops?merchant_id=${encodeURIComponent(mid)}`).then((r) => r.json()),
        fetch(`/api/zenipay/stats?merchant_id=${encodeURIComponent(mid)}`).then((r) => r.json()),
      ]);

      const accts = (bankingRes.accounts ?? []) as Array<{ id: string; account_name: string }>;
      setAccounts(accts);

      const payments = (statsRes.recent_transactions ?? []) as Array<{
        id: string; customer: string; amount: number; currency: string; status: string;
        description: string; date: string;
      }>;
      const transfers = (bankingRes.transfers ?? []) as Array<{
        id: string; transfer_type: string; recipient_name: string; amount: number; fee: number;
        status: string; memo: string; created_at: string; from_account_id?: string; to_account_id?: string;
      }>;
      const payouts = (statsRes.recent_payouts ?? []) as Array<{
        id: string; amount?: number; method?: string; recipient_name?: string; status?: string; created_at?: string;
      }>;

      const merged: UnifiedRow[] = [
        ...payments.map((p) => ({
          id: p.id, kind: "income" as TxKind, date: p.date,
          description: p.description || "Payment",
          counterparty: p.customer || "—",
          amount: Number(p.amount || 0), currency: p.currency || "CAD",
          status: p.status, accountId: null,
          raw: p as unknown as Record<string, unknown>,
        })),
        ...transfers.map((t) => ({
          id: t.id, kind: "transfer" as TxKind, date: t.created_at,
          description: t.memo || `${capitalize(t.transfer_type)}`,
          counterparty: t.recipient_name || "—",
          amount: -(Number(t.amount || 0)), currency: "CAD",
          status: t.status, accountId: t.from_account_id || t.to_account_id || null,
          raw: t as unknown as Record<string, unknown>,
        })),
        ...transfers.filter((t) => Number(t.fee || 0) > 0).map((t) => ({
          id: `${t.id}_fee`, kind: "fee" as TxKind, date: t.created_at,
          description: `Fee · ${capitalize(t.transfer_type)}`,
          counterparty: t.recipient_name || "—",
          amount: -(Number(t.fee || 0)), currency: "CAD",
          status: t.status, accountId: t.from_account_id || null,
          raw: t as unknown as Record<string, unknown>,
        })),
        ...payouts.map((p) => ({
          id: p.id, kind: "payout" as TxKind, date: p.created_at || new Date().toISOString(),
          description: `Payout · ${p.method || "external"}`,
          counterparty: p.recipient_name || "—",
          amount: -(Number(p.amount || 0)), currency: "CAD",
          status: p.status || "processing", accountId: null,
          raw: p as unknown as Record<string, unknown>,
        })),
      ];

      merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRows(merged);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const ranges: Record<string, number | null> = {
      "7d": 7 * 86400_000, "30d": 30 * 86400_000, "90d": 90 * 86400_000, all: null,
    };
    const windowMs = ranges[range] ?? ranges["30d"];
    const minNum = min ? Number(min) : null;
    const maxNum = max ? Number(max) : null;
    const qLower = q.trim().toLowerCase();

    return rows.filter((r) => {
      if (windowMs != null && now - new Date(r.date).getTime() > windowMs) return false;
      if (typeFilter === "income"    && r.kind !== "income") return false;
      if (typeFilter === "spending"  && !(r.kind === "transfer" || r.kind === "payout")) return false;
      if (typeFilter === "transfers" && r.kind !== "transfer") return false;
      if (typeFilter === "fees"      && r.kind !== "fee") return false;
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
    const selectedRows = checked.size > 0 ? filtered.filter((r) => checked.has(r.id)) : filtered;
    const header = "date,description,counterparty,kind,status,amount,currency\n";
    const body = selectedRows.map((r) => {
      const d = new Date(r.date).toISOString();
      const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
      return `${d},${esc(r.description)},${esc(r.counterparty)},${r.kind},${r.status},${r.amount.toFixed(2)},${r.currency}`;
    }).join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zenipay-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <BankingShell
      title="Transactions"
      subtitle={`${filtered.length} result${filtered.length === 1 ? "" : "s"} · +${fmtCurrency(totalIncome)} in / −${fmtCurrency(totalSpend)} out`}
      actions={
        <>
          {checked.size > 0 && (
            <BankingButton variant="ghost" size="sm" onClick={() => setChecked(new Set())}>
              Clear ({checked.size})
            </BankingButton>
          )}
          <BankingButton variant="secondary" size="sm" onClick={exportCsv}>
            Export CSV
          </BankingButton>
        </>
      }
    >
      {/* Filter toolbar */}
      <BankingCard style={{ padding: "14px 16px", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <FilterPill
            options={[
              { v: "all", l: "All" },
              { v: "income", l: "Income" },
              { v: "spending", l: "Spending" },
              { v: "transfers", l: "Transfers" },
              { v: "fees", l: "Fees" },
            ]}
            value={typeFilter}
            onChange={(v) => setTypeFilter(v as TypeFilter)}
          />
          <FilterPill
            options={[
              { v: "7d", l: "7 days" }, { v: "30d", l: "30 days" },
              { v: "90d", l: "90 days" }, { v: "all", l: "All time" },
            ]}
            value={range}
            onChange={(v) => setRange(v)}
          />
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            style={selectStyle}
            aria-label="Account filter"
          >
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.account_name || "Untitled"}</option>
            ))}
          </select>
          <input
            placeholder="Min $"
            value={min}
            onChange={(e) => setMin(e.target.value.replace(/[^\d.]/g, ""))}
            style={{ ...textInputStyle, width: 90 }}
            aria-label="Minimum amount"
          />
          <input
            placeholder="Max $"
            value={max}
            onChange={(e) => setMax(e.target.value.replace(/[^\d.]/g, ""))}
            style={{ ...textInputStyle, width: 90 }}
            aria-label="Maximum amount"
          />
          <input
            placeholder="Search description or contact"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ ...textInputStyle, flex: "1 1 220px", minWidth: 180 }}
            aria-label="Search"
          />
          {(typeFilter !== "all" || accountFilter || range !== "30d" || min || max || q) && (
            <BankingButton variant="ghost" size="sm" onClick={() => {
              setTypeFilter("all"); setAccountFilter(""); setRange("30d");
              setMin(""); setMax(""); setQ("");
            }}>Reset</BankingButton>
          )}
        </div>
      </BankingCard>

      {/* Table */}
      <BankingCard style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <TxSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyTx />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: 32, paddingLeft: 20 }}>
                    <input
                      type="checkbox"
                      checked={checked.size > 0 && checked.size === filtered.length}
                      ref={(el) => { if (el) el.indeterminate = checked.size > 0 && checked.size < filtered.length; }}
                      onChange={(e) => {
                        if (e.target.checked) setChecked(new Set(filtered.map((r) => r.id)));
                        else setChecked(new Set());
                      }}
                      aria-label="Select all"
                    />
                  </th>
                  {["Date", "Description", "Counterparty", "Type", "Status", "Amount"].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 200).map((r) => {
                  const isChecked = checked.has(r.id);
                  return (
                    <tr
                      key={r.id}
                      onClick={(e) => {
                        const t = e.target as HTMLElement;
                        if (t.closest("input")) return;
                        setSelected(r);
                      }}
                      style={{
                        borderTop: `1px solid ${C.borderSoft}`,
                        cursor: "pointer",
                        background: isChecked ? "rgba(15,79,63,0.04)" : "transparent",
                      }}
                    >
                      <td style={{ ...tdStyle, paddingLeft: 20 }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const n = new Set(checked);
                            if (e.target.checked) n.add(r.id); else n.delete(r.id);
                            setChecked(n);
                          }}
                          aria-label={`Select ${r.description}`}
                        />
                      </td>
                      <td style={tdStyle}>{fmtDateTime(r.date)}</td>
                      <td style={{ ...tdStyle, color: C.textPrimary, fontWeight: FW.medium }}>{r.description}</td>
                      <td style={tdStyle}>{r.counterparty}</td>
                      <td style={tdStyle}>
                        <KindBadge kind={r.kind} />
                      </td>
                      <td style={tdStyle}>
                        <StatusBadge status={r.status} />
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right" as const, ...banking.amount.base,
                        color: r.amount > 0 ? C.incomePositive : C.textPrimary,
                        paddingRight: 20 }}>
                        {r.amount > 0 ? "+" : "−"}{fmtCurrency(Math.abs(r.amount), r.currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </BankingCard>

      {/* Side panel */}
      {selected && (
        <TxDetailPanel row={selected} onClose={() => setSelected(null)} />
      )}
    </BankingShell>
  );
}

function FilterPill({ options, value, onChange }: {
  options: Array<{ v: string; l: string }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "inline-flex", gap: 2, background: C.surfaceInset, padding: 3, borderRadius: R.sm }}>
      {options.map((o) => {
        const active = o.v === value;
        return (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            style={{
              padding: "6px 12px", borderRadius: R.xs, border: "none", cursor: "pointer",
              background: active ? C.surfaceElevated : "transparent",
              color: active ? C.textPrimary : C.textSecondary,
              fontSize: 12, fontWeight: active ? FW.bold : FW.medium,
              boxShadow: active ? banking.shadow.sm : undefined,
            }}
          >
            {o.l}
          </button>
        );
      })}
    </div>
  );
}

function TxDetailPanel({ row, onClose }: { row: UnifiedRow; onClose: () => void }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(15,23,42,0.35)",
        backdropFilter: "blur(4px)", zIndex: banking.zIndex.modal,
        display: "flex", justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(480px, 100vw)", height: "100vh",
          background: C.surfaceElevated, boxShadow: banking.shadow.lg,
          overflowY: "auto", padding: 28,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <KindBadge kind={row.kind} />
            <h3 style={{ margin: "10px 0 2px", fontSize: 18, fontWeight: FW.black, color: C.textPrimary }}>
              {row.description}
            </h3>
            <p style={{ margin: 0, fontSize: 12, color: C.textMuted }}>{fmtDateTime(row.date)}</p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            background: C.surfaceInset, border: "none", borderRadius: R.sm,
            width: 30, height: 30, cursor: "pointer", color: C.textPrimary, fontSize: 16,
          }}>✕</button>
        </div>

        <div style={{
          ...banking.amount.hero,
          fontSize: 32, marginBottom: 18,
          color: row.amount > 0 ? C.incomePositive : C.textPrimary,
        }}>
          {row.amount > 0 ? "+" : "−"}{fmtCurrency(Math.abs(row.amount), row.currency)}
        </div>

        <dl style={{ margin: 0 }}>
          <DetailRow label="Counterparty" value={row.counterparty} />
          <DetailRow label="Status" value={<StatusBadge status={row.status} />} />
          <DetailRow label="Type" value={row.kind} />
          {row.accountId && <DetailRow label="Account" value={row.accountId} mono />}
          {(row.raw as { gateway_transfer_id?: string }).gateway_transfer_id && (
            <DetailRow label="Finix transfer" value={(row.raw as { gateway_transfer_id: string }).gateway_transfer_id} mono />
          )}
          {(row.raw as { card_brand?: string; card_last4?: string }).card_last4 && (
            <DetailRow
              label="Card"
              value={`${(row.raw as { card_brand?: string }).card_brand ?? "Card"} ••${(row.raw as { card_last4?: string }).card_last4}`}
            />
          )}
          {(row.raw as { memo?: string }).memo && (
            <DetailRow label="Memo" value={(row.raw as { memo: string }).memo} />
          )}
          {(row.raw as { fee?: number }).fee != null && Number((row.raw as { fee?: number }).fee) > 0 && (
            <DetailRow label="Fee" value={fmtCurrency(Number((row.raw as { fee?: number }).fee), row.currency)} />
          )}
          <DetailRow label="Reference" value={row.id} mono />
        </dl>

        <div style={{ marginTop: 22, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {row.kind === "income" && (
            <BankingButton variant="secondary" size="sm" onClick={() => alert("Refund flow lives in /app/wallets — copy the reference and issue a refund there.")}>
              Issue refund
            </BankingButton>
          )}
          <BankingButton variant="secondary" size="sm" onClick={() => {
            const text = JSON.stringify(row.raw, null, 2);
            if (navigator.clipboard) navigator.clipboard.writeText(text);
          }}>
            Copy raw JSON
          </BankingButton>
          <BankingButton variant="ghost" size="sm" onClick={() => window.print()}>
            Print receipt
          </BankingButton>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", padding: "10px 0", borderBottom: `1px solid ${C.borderSoft}`, alignItems: "center" }}>
      <dt style={{ fontSize: 11, color: C.textMuted, fontWeight: FW.bold, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {label}
      </dt>
      <dd style={{
        margin: 0, fontSize: 13, color: C.textPrimary,
        fontFamily: mono ? banking.font.mono : undefined,
        wordBreak: "break-all",
      }}>
        {value}
      </dd>
    </div>
  );
}

function KindBadge({ kind }: { kind: TxKind }) {
  const map: Record<TxKind, { bg: string; fg: string; label: string }> = {
    income:   { bg: C.accentSoft, fg: C.incomePositive, label: "Income" },
    transfer: { bg: C.surfaceInset, fg: C.textSecondary, label: "Transfer" },
    payout:   { bg: C.surfaceInset, fg: C.textSecondary, label: "Payout" },
    fee:      { bg: C.pendingBg, fg: C.pending, label: "Fee" },
  };
  const s = map[kind];
  return (
    <span style={{
      fontSize: 10, fontWeight: FW.bold, padding: "3px 10px", borderRadius: 999,
      background: s.bg, color: s.fg, letterSpacing: "0.04em", textTransform: "uppercase",
    }}>
      {s.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const key = status?.toLowerCase() || "";
  const map: Record<string, { bg: string; fg: string }> = {
    succeeded:   { bg: C.accentSoft, fg: C.incomePositive },
    completed:   { bg: C.accentSoft, fg: C.incomePositive },
    paid:        { bg: C.accentSoft, fg: C.incomePositive },
    processing:  { bg: C.pendingBg, fg: C.pending },
    pending:     { bg: C.pendingBg, fg: C.pending },
    scheduled:   { bg: C.pendingBg, fg: C.pending },
    failed:      { bg: C.disputedBg, fg: C.disputed },
    refunded:    { bg: C.surfaceInset, fg: C.textSecondary },
    disputed:    { bg: C.disputedBg, fg: C.disputed },
  };
  const s = map[key] ?? { bg: C.surfaceInset, fg: C.textSecondary };
  return (
    <span style={{
      fontSize: 10, fontWeight: FW.bold, padding: "3px 10px", borderRadius: 999,
      background: s.bg, color: s.fg, letterSpacing: "0.04em", textTransform: "capitalize" as const,
    }}>
      {status || "—"}
    </span>
  );
}

function TxSkeleton() {
  return (
    <div style={{ padding: 24 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ display: "flex", gap: 16, padding: "12px 0", borderBottom: i < 5 ? `1px solid ${C.borderSoft}` : "none" }}>
          <div style={{ width: 16, height: 16, background: C.surfaceInset, borderRadius: 3 }} />
          <div style={{ width: 100, height: 14, background: C.surfaceInset, borderRadius: 4 }} />
          <div style={{ flex: 1, height: 14, background: C.surfaceInset, borderRadius: 4 }} />
          <div style={{ width: 90, height: 14, background: C.surfaceInset, borderRadius: 4 }} />
          <div style={{ width: 60, height: 14, background: C.surfaceInset, borderRadius: 4 }} />
          <div style={{ width: 100, height: 14, background: C.surfaceInset, borderRadius: 4 }} />
        </div>
      ))}
    </div>
  );
}

function EmptyTx() {
  return (
    <div style={{ padding: "56px 24px", textAlign: "center" as const }}>
      <div style={{ fontSize: 44 }}>📊</div>
      <p style={{ margin: "10px 0 4px", fontWeight: FW.bold, fontSize: 15, color: C.textPrimary }}>
        No transactions match
      </p>
      <p style={{ margin: 0, color: C.textMuted, fontSize: 13 }}>
        Try clearing the filters or expanding the date range.
      </p>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left", padding: "12px 16px",
  fontSize: 10, fontWeight: FW.bold, color: C.textMuted,
  letterSpacing: "0.08em", textTransform: "uppercase",
  background: C.surfaceInset,
};
const tdStyle: React.CSSProperties = {
  padding: "12px 16px", fontSize: 13, color: C.textSecondary, verticalAlign: "middle",
};
const textInputStyle: React.CSSProperties = {
  height: 34, padding: "0 10px", borderRadius: R.sm,
  border: `1px solid ${C.borderSoft}`, background: C.surfaceInset,
  color: C.textPrimary, fontSize: 13, outline: "none",
  fontFamily: banking.font.sans,
};
const selectStyle: React.CSSProperties = {
  ...textInputStyle, cursor: "pointer", minWidth: 150,
};

function capitalize(s: string): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}
