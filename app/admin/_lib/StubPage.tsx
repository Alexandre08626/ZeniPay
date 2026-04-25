// Shared stub for admin pages whose full spec arrives in a later
// session. Keeps the sidebar links 200-OK and tells the operator
// what'll land here.

"use client";

import React from "react";
import { Construction } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BankingCard } from "@/components/dashboard/BankingCard";
import zp from "@/lib/design-system/zenipay-brand";
import { AdminGate } from "../AdminGate";

export interface AdminStubProps {
  title: string;
  blurb: string;
}

export function AdminStub({ title, blurb }: AdminStubProps) {
  return (
    <DashboardShell mode="admin">
      <AdminGate>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontFamily: zp.font.display, fontSize: 32, letterSpacing: "-0.03em", fontWeight: zp.weight.semibold, color: zp.text.primary }}>
            {title}
          </h1>
        </div>
        <BankingCard accent="green" style={{ textAlign: "center", padding: "60px 24px" }}>
          <Construction size={32} color={zp.brand.green} />
          <h3 style={{ margin: "12px 0 6px", fontSize: 18, fontWeight: zp.weight.semibold, color: zp.text.primary }}>Coming next</h3>
          <p style={{ margin: 0, fontSize: 13, color: zp.text.muted, maxWidth: 480, marginInline: "auto", lineHeight: 1.5 }}>
            {blurb}
          </p>
        </BankingCard>
      </AdminGate>
    </DashboardShell>
  );
}
