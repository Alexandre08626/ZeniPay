// /personal/wallets — Send & Receive for the personal mode.
// Primary value: the cross-mode MoveMoneyWidget (Personal ↔ Business)
// since transfers between modes are the headline feature.

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BankingCard } from "@/components/dashboard/BankingCard";
import { MoveMoneyWidget } from "../MoveMoneyWidget";
import { ZeniPayAccountCard } from "@/app/components/shared/ZeniPayAccountCard";
import zp from "@/lib/design-system/zenipay-brand";

interface PersonalAccount {
  id: string; account_name: string; balance: number; currency: string;
  is_primary?: boolean;
  zp_account_number?: string | null;
  zp_routing_code?: string | null;
}
interface BusinessAccount { id: string; account_name: string; balance: number; currency?: string }

function mid(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("zp_client") ?? "";
}

export default function PersonalWalletsPage() {
  const [pa, setPa] = useState<PersonalAccount[]>([]);
  const [ba, setBa] = useState<BusinessAccount[]>([]);

  const load = useCallback(async () => {
    const m = mid();
    if (!m) return;
    const [p, b] = await Promise.all([
      fetch(`/api/v1/personal/accounts?merchant_id=${encodeURIComponent(m)}`).then((r) => r.json()),
      fetch(`/api/zenipay/banking-ops?merchant_id=${encodeURIComponent(m)}`).then((r) => r.json()).catch(() => ({ accounts: [] })),
    ]);
    setPa(p.accounts ?? []);
    setBa(b.accounts ?? []);
  }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <DashboardShell mode="personal">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontFamily: zp.font.display, fontSize: 32, letterSpacing: "-0.03em", fontWeight: zp.weight.semibold, color: zp.text.primary }}>Send & Receive</h1>
        <p style={{ margin: "4px 0 0", color: zp.text.muted, fontSize: 13 }}>Move money between your personal and business sides instantly.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 20, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 14 }}>
          <MoveMoneyWidget
            merchantId={mid()}
            personalAccounts={pa}
            businessAccounts={ba}
            onComplete={load}
          />
          {(() => {
            const primary = pa.find((a) => a.is_primary) ?? pa[0];
            if (!primary?.zp_account_number) return null;
            return (
              <ZeniPayAccountCard
                accountType="personal"
                accent="pink"
                accountNumber={primary.zp_account_number}
                routingCode={primary.zp_routing_code ?? null}
                accountName={primary.account_name}
                currency={primary.currency}
              />
            );
          })()}
        </div>

        <BankingCard accent="pink">
          <div style={{ fontSize: 11, fontWeight: zp.weight.semibold, color: zp.text.muted, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>How it works</div>
          <ul style={{ margin: "10px 0 0", paddingLeft: 18, color: zp.text.muted, fontSize: 13, lineHeight: 1.6 }}>
            <li>Personal ↔ Business transfers settle instantly. No fees.</li>
            <li>Business debit creates a ledger entry and a personal credit row.</li>
            <li>Both balances update atomically — one fails, both roll back.</li>
            <li>Audit log records every move under your merchant_id.</li>
          </ul>
        </BankingCard>
      </div>
    </DashboardShell>
  );
}
