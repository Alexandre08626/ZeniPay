// Reusable yield panel — drops into /app/accounts/[id],
// /personal/accounts/[id], etc. Pure client component; the parent
// passes the merchant + account context.

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { TrendingUp, Sparkles, Pause, X } from "lucide-react";
import { BankingCard } from "@/components/dashboard/BankingCard";
import { GradientButton } from "@/components/dashboard/GradientButton";
import zp from "@/lib/design-system/zenipay-brand";

export type YieldAccountType = "merchant" | "personal" | "treasury";

interface StatusResp {
  enrolled: boolean;
  enrollment_id: string | null;
  enrollment_status: string | null;
  current_rate_client: number;
  current_rate_gross: number;
  min_balance: number;
  currency: string;
  total_earned_all_time: number;
  pending_payout: number;
  last_payout: { amount: number; date: string } | null;
  next_payout_date: string;
}

interface AccrualRow { client_amount: number; accrual_date: string }
interface HistoryResp { accruals: AccrualRow[]; payouts: Array<{ amount: number; period_to: string }> }

export interface YieldPanelProps {
  merchantId: string;
  accountId: string;
  accountType: YieldAccountType;
  balance: number;
  currency: string;
  /** "cyan" merchant, "pink" personal, "violet" treasury. */
  accent?: "cyan" | "pink" | "violet";
}

export function YieldPanel({
  merchantId, accountId, accountType, balance, currency, accent = "cyan",
}: YieldPanelProps) {
  const [status, setStatus] = useState<StatusResp | null>(null);
  const [history, setHistory] = useState<HistoryResp | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const accentColor =
    accent === "pink"   ? zp.brand.pink   :
    accent === "violet" ? zp.brand.violet :
                          zp.brand.cyan;

  const load = useCallback(async () => {
    if (!merchantId || !accountId) return;
    setErr(null);
    try {
      const sp = new URLSearchParams({ merchant_id: merchantId, account_id: accountId, currency });
      const [s, h] = await Promise.all([
        fetch(`/api/v1/yield/status?${sp.toString()}`).then((r) => r.json()),
        fetch(`/api/v1/yield/history?${sp.toString()}&type=all`).then((r) => r.json()),
      ]);
      setStatus(s);
      setHistory(h);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "failed to load yield");
    }
  }, [merchantId, accountId, currency]);
  useEffect(() => { void load(); }, [load]);

  const enroll = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/v1/yield/enroll", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchant_id: merchantId, account_id: accountId, account_type: accountType, currency }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(data?.error?.message ?? "Enrollment failed"); return; }
      await load();
    } finally { setBusy(false); }
  };

  const unenroll = async () => {
    if (!status?.enrollment_id) return;
    if (!window.confirm("Cancel ZeniPay Yield? Pending accruals will still pay out at the next monthly cycle.")) return;
    setBusy(true); setErr(null);
    try {
      await fetch("/api/v1/yield/unenroll", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchant_id: merchantId, enrollment_id: status.enrollment_id }),
      });
      await load();
    } finally { setBusy(false); }
  };

  if (!status) {
    return (
      <BankingCard accent={accent}>
        <div style={{ color: zp.text.muted, fontSize: 13 }}>Loading yield…</div>
      </BankingCard>
    );
  }

  const eligible = balance >= status.min_balance;
  const monthlyEstimate = balance * (status.current_rate_client / 100) / 12;

  // Last 30 days of accruals — most recent first from the API; reverse for chart.
  const last30 = (history?.accruals ?? []).slice(0, 30).slice().reverse();
  const max = Math.max(1, ...last30.map((a) => Number(a.client_amount ?? 0)));

  return (
    <BankingCard accent={accent}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: zp.radius.md,
          background: `${accentColor}18`, color: accentColor,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
        }}>
          <TrendingUp size={18} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: zp.weight.semibold, color: zp.text.muted, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>
            ZeniPay Yield
          </div>
          <div style={{ fontSize: 15, fontWeight: zp.weight.semibold, color: zp.text.primary }}>
            {status.enrolled ? `Active · ${status.current_rate_client.toFixed(2)}% APY` : "Make your money work"}
          </div>
        </div>
        {status.enrolled && (
          <span style={{
            fontSize: 10, fontWeight: zp.weight.semibold, padding: "3px 10px", borderRadius: 999,
            background: zp.semantic.successBg, color: zp.semantic.success,
            letterSpacing: "0.06em", textTransform: "uppercase" as const,
          }}>Active</span>
        )}
      </div>

      {!status.enrolled && (
        <>
          <p style={{ margin: "6px 0 12px", fontSize: 13, color: zp.text.muted, lineHeight: 1.55 }}>
            Earn approximately {status.current_rate_client.toFixed(2)}% APY on your ZeniPay balance —
            credited automatically every month.
          </p>
          {!eligible ? (
            <div style={{ padding: "10px 12px", borderRadius: zp.radius.sm, background: zp.semantic.warningBg, color: zp.semantic.warning, fontSize: 12, fontWeight: zp.weight.semibold, marginBottom: 12 }}>
              Not eligible yet — minimum {zp.fmtCurrency(status.min_balance, currency)} balance required.
            </div>
          ) : (
            <div style={{ padding: "10px 12px", borderRadius: zp.radius.sm, background: zp.surface.bg2, fontSize: 12, color: zp.text.muted, lineHeight: 1.5, marginBottom: 12 }}>
              At your current balance of <strong style={{ color: zp.text.primary }}>{zp.fmtCurrency(balance, currency)}</strong>,
              you&apos;d earn approximately <strong style={{ color: accentColor }}>{zp.fmtCurrency(monthlyEstimate, currency)}/month</strong>.
            </div>
          )}
          <GradientButton variant="primary" size="md" icon={<Sparkles size={14} />} onClick={enroll} disabled={busy || !eligible}>
            {busy ? "Activating…" : "Activate Yield"}
          </GradientButton>
          <p style={{ margin: "10px 0 0", fontSize: 10, color: zp.text.dim, lineHeight: 1.5 }}>
            Variable rate. Not CDIC/FDIC insured. Past yield does not guarantee future returns.
            ZeniPay places funds in government T-Bills. No lock-up — cancel anytime.
          </p>
        </>
      )}

      {status.enrolled && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginTop: 8 }}>
            <Stat label="Pending payout" value={zp.fmtCurrency(status.pending_payout, currency)} accent={accentColor} />
            <Stat label="Earned all time" value={zp.fmtCurrency(status.total_earned_all_time, currency)} />
            <Stat label="Next payout" value={status.next_payout_date} />
          </div>

          {last30.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6 }}>
                Last {last30.length} days
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 36 }}>
                {last30.map((a, i) => {
                  const h = Math.max(2, Math.round((Number(a.client_amount) / max) * 36));
                  return (
                    <div key={`${a.accrual_date}-${i}`} title={`${a.accrual_date}: ${zp.fmtCurrency(Number(a.client_amount), currency)}`} style={{
                      flex: 1, height: h, background: accentColor, opacity: 0.7, borderRadius: 1,
                    }} />
                  );
                })}
              </div>
            </div>
          )}

          {history && history.payouts.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6 }}>
                Payout history
              </div>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 4 }}>
                {history.payouts.slice(0, 6).map((p, i) => (
                  <div key={`${p.period_to}-${i}`} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${zp.surface.border}`, fontSize: 12 }}>
                    <span style={{ color: zp.text.muted }}>{p.period_to}</span>
                    <span style={{ color: accentColor, fontWeight: zp.weight.semibold, fontFamily: zp.font.mono }}>+{zp.fmtCurrency(Number(p.amount), currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" as const }}>
            <GradientButton variant="ghost" size="sm" icon={<Pause size={12} />} onClick={unenroll} disabled={busy}>
              {busy ? "Cancelling…" : "Cancel yield"}
            </GradientButton>
          </div>

          <p style={{ margin: "10px 0 0", fontSize: 10, color: zp.text.dim, lineHeight: 1.5 }}>
            Variable rate. Not CDIC/FDIC insured. Past yield does not guarantee future returns.
          </p>
        </>
      )}

      {err && (
        <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: zp.radius.sm, background: zp.semantic.dangerBg, color: zp.semantic.danger, fontSize: 12, fontWeight: zp.weight.semibold }}>{err}</div>
      )}
    </BankingCard>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: zp.weight.semibold, color: zp.text.muted, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: zp.weight.semibold, color: accent ?? zp.text.primary, marginTop: 2, fontFamily: zp.font.mono }}>{value}</div>
    </div>
  );
}

export default YieldPanel;

// Re-export X icon kept import for type-safety on parts of the UI we
// might add later (cancel modal, etc.).
export { X as _X };
