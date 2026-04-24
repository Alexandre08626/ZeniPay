// PR 9 — "Finix balance" tile for /app/overview.
// Reads /api/v1/merchant/finix-balance and offers a "Transfer to bank"
// action that hits /api/v1/merchant/settlements/trigger.

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ArrowDownToLine, Landmark } from "lucide-react";
import { BankingCard } from "@/components/dashboard/BankingCard";
import { GradientButton } from "@/components/dashboard/GradientButton";
import zp from "@/lib/design-system/zenipay-brand";

interface Balance {
  available_cents: number;
  pending_cents: number;
  currency: string;
  merchant_id: string;
}

function mid(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("zp_client") ?? "";
}

export function FinixBalanceTile() {
  const [bal, setBal] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [transferring, setTransferring] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const r = await fetch("/api/v1/merchant/finix-balance");
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(data?.error ?? "unreachable"); return; }
      setBal(data);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const transfer = async () => {
    setMsg(null); setErr(null);
    setTransferring(true);
    try {
      const r = await fetch("/api/v1/merchant/settlements/trigger", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchant_id: mid(), currency: bal?.currency ?? "CAD" }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || data?.error) {
        setErr(data?.error?.message ?? data?.error ?? "Settlement failed.");
        return;
      }
      setMsg(`Settlement initiated · $${((data.total_amount_cents ?? 0) / 100).toFixed(2)} ${data.currency} · ${data.estimated_arrival}`);
      await load();
    } finally {
      setTransferring(false);
    }
  };

  const fmt = (cents: number, cur: string) => {
    try { return new Intl.NumberFormat("en-CA", { style: "currency", currency: cur }).format(cents / 100); }
    catch { return `${(cents / 100).toFixed(2)} ${cur}`; }
  };

  return (
    <BankingCard accent="violet">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <Landmark size={18} color={zp.brand.violet} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Finix balance
          </div>
          <div style={{ fontSize: 10, color: zp.text.dim, marginTop: 2 }}>
            Ready to sweep to your bank
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: zp.text.muted }}>Loading…</div>
      ) : err ? (
        <div style={{ fontSize: 12, color: zp.semantic.danger, fontWeight: zp.weight.semibold }}>
          {String(err)}
        </div>
      ) : bal ? (
        <>
          <div style={{ ...zp.amountStyle.large, fontSize: 26, color: zp.text.primary, marginTop: 4 }}>
            {fmt(bal.available_cents, bal.currency)}
          </div>
          <div style={{ fontSize: 11, color: zp.text.muted, marginTop: 4 }}>
            {bal.pending_cents > 0 ? `+ ${fmt(bal.pending_cents, bal.currency)} pending` : "no pending"}
          </div>

          <div style={{ marginTop: 14 }}>
            <GradientButton
              size="sm"
              variant="primary"
              icon={<ArrowDownToLine size={12} color="#fff" />}
              onClick={transfer}
              disabled={transferring || bal.available_cents <= 0}
            >
              {transferring ? "Transferring…" : "Transfer to bank"}
            </GradientButton>
          </div>

          {msg && (
            <div style={{
              marginTop: 10, padding: "8px 10px", borderRadius: zp.radius.sm,
              background: zp.semantic.successBg, color: zp.semantic.success,
              fontSize: 11, fontWeight: zp.weight.semibold,
            }}>{msg}</div>
          )}

          <div style={{ marginTop: 10, fontSize: 10, color: zp.text.dim, lineHeight: 1.5 }}>
            Card payments sit in your Finix merchant account until you trigger a transfer. T+1 business day to your bank.
          </div>
        </>
      ) : null}
    </BankingCard>
  );
}
