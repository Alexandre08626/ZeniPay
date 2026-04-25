// /admin/wallet/cards — virtual cards issued on the ZeniPay corporate
// wallet. Mirrors /app/cards but scoped to acc_1774740862294.

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus, Lock, Mail, CreditCard } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BankingCard } from "@/components/dashboard/BankingCard";
import { GradientButton } from "@/components/dashboard/GradientButton";
import zp from "@/lib/design-system/zenipay-brand";
import { AdminGate } from "../../AdminGate";
import { ZENIPAY_CORPORATE_MERCHANT_ID } from "../../_lib/corporate";

interface MerchantCard {
  id: string;
  last4: string | null;
  cardholder_name: string;
  exp_month: number | null;
  exp_year: number | null;
  status: "active" | "frozen" | "cancelled";
  spending_limit_daily: number | null;
  spending_limit_monthly: number | null;
  currency: string;
}

export default function AdminWalletCardsPage() {
  return (
    <DashboardShell mode="admin">
      <AdminGate>
        <Inner />
      </AdminGate>
    </DashboardShell>
  );
}

function Inner() {
  const [cards, setCards] = useState<MerchantCard[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const ts = Date.now();
      const r = await fetch(
        `/api/v1/merchant/cards?merchant_id=${encodeURIComponent(ZENIPAY_CORPORATE_MERCHANT_ID)}&_=${ts}`,
        { cache: "no-store" },
      ).then((x) => x.json());
      setEnabled(!!r.enabled);
      setCards((r.cards ?? []) as MerchantCard[]);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap" as const, gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: zp.font.display, fontSize: 32, letterSpacing: "-0.03em", fontWeight: zp.weight.semibold, color: zp.text.primary }}>
            My Cards
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: zp.text.muted }}>
            Virtual cards for ZeniPay Corporate spending · online purchases only
          </p>
        </div>
      </div>

      {!enabled && !loading && (
        <BankingCard style={{ padding: "24px 26px", marginBottom: 20, borderLeft: `3px solid ${zp.semantic.warning}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" as const }}>
            <div style={{ width: 44, height: 44, borderRadius: zp.radius.md, background: zp.semantic.warningBg, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <Lock size={20} color={zp.semantic.warning} />
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 15, fontWeight: zp.weight.semibold, color: zp.text.primary }}>Virtual cards — coming soon</div>
              <div style={{ fontSize: 12, color: zp.text.muted, marginTop: 4, lineHeight: 1.5 }}>
                ZeniPay corporate cards activate the moment STRIPE_ISSUING_ENABLED or FINIX_CARD_ISSUING_ENABLED is set on Vercel.
              </div>
            </div>
            <GradientButton variant="secondary" size="sm" icon={<Mail size={13} />} onClick={() => { window.location.href = "mailto:info@zeniva.ca?subject=Enable%20ZeniPay%20corporate%20cards"; }}>
              Remind me
            </GradientButton>
          </div>
        </BankingCard>
      )}

      {enabled && cards.length === 0 && !loading && (
        <BankingCard style={{ textAlign: "center", padding: "48px 24px" }}>
          <CreditCard size={36} color={zp.brand.green} />
          <h3 style={{ margin: "10px 0 4px", fontSize: 18, fontWeight: zp.weight.semibold, color: zp.text.primary }}>No corporate cards yet</h3>
          <p style={{ margin: "0 0 18px", color: zp.text.muted, fontSize: 13 }}>
            Issue a card on ZeniPay Corporate to pay vendors / SaaS directly from the company wallet.
          </p>
          <GradientButton variant="primary" size="md" icon={<Plus size={14} />}>
            Issue first card
          </GradientButton>
        </BankingCard>
      )}

      {enabled && cards.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
          {cards.map((c) => (
            <div key={c.id} style={{
              background: `linear-gradient(135deg, ${zp.brand.green} 0%, ${zp.brand.cyan} 50%, ${zp.brand.violet} 100%)`,
              borderRadius: zp.radius.lg, padding: 22, color: "#fff", minHeight: 180,
              boxShadow: zp.elevation.heroInk,
            }}>
              <div style={{ fontSize: 10, fontWeight: zp.weight.semibold, letterSpacing: "0.14em", textTransform: "uppercase" as const, opacity: 0.85 }}>
                ZeniPay Corporate
              </div>
              <div style={{ marginTop: 40, fontFamily: zp.font.mono, fontSize: 22, letterSpacing: "0.14em" }}>
                •••• •••• •••• {c.last4 ?? "••••"}
              </div>
              <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between" }}>
                <div style={{ fontSize: 13, fontWeight: zp.weight.semibold }}>{c.cardholder_name}</div>
                <div style={{ fontSize: 13, fontFamily: zp.font.mono }}>
                  {c.exp_month && c.exp_year ? `${String(c.exp_month).padStart(2, "0")}/${String(c.exp_year).slice(-2)}` : "—"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
