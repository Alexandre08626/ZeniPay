// /personal/invoices — placeholder for shared/personal invoices.

"use client";

import React from "react";
import { FileText } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BankingCard } from "@/components/dashboard/BankingCard";
import zp from "@/lib/design-system/zenipay-brand";

export default function PersonalInvoicesPage() {
  return (
    <DashboardShell mode="personal">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontFamily: zp.font.display, fontSize: 32, letterSpacing: "-0.03em", fontWeight: zp.weight.semibold, color: zp.text.primary }}>Invoices</h1>
        <p style={{ margin: "4px 0 0", color: zp.text.muted, fontSize: 13 }}>Shared bills, rent, and personal recurring payments.</p>
      </div>
      <BankingCard style={{ textAlign: "center", padding: "48px 24px" }}>
        <FileText size={36} color={zp.brand.pink} />
        <h3 style={{ margin: "10px 0 4px", fontSize: 18, fontWeight: zp.weight.semibold, color: zp.text.primary }}>Personal invoices — coming soon</h3>
        <p style={{ margin: "0 0 0", color: zp.text.muted, fontSize: 13, maxWidth: 480, marginInline: "auto" }}>
          Tag invoices as personal vs business, split rent with roommates, track recurring bills. Shipping in a follow-up PR — for now, all invoicing lives on the Business side.
        </p>
      </BankingCard>
    </DashboardShell>
  );
}
