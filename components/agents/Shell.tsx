// Shell — thin backward-compat wrapper that delegates to the PR 20
// DashboardShell. Every /agents/* page imports { Shell, Card, Metric }
// from this file, so swapping the chrome here migrates all of
// /agents/* onto the unified ZeniPay brand shell with zero page edits.

"use client";

import React from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BankingCard } from "@/components/dashboard/BankingCard";
import zp from "@/lib/design-system/zenipay-brand";

export function Shell({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <DashboardShell mode="agents">
      <div style={{ marginBottom: 18 }}>
        <h1
          style={{
            margin: 0,
            fontFamily: zp.font.display,
            fontSize: 28,
            fontWeight: zp.weight.semibold,
            letterSpacing: "-0.02em",
            color: zp.text.primary,
          }}
        >
          {title}
        </h1>
      </div>
      {children}
    </DashboardShell>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <BankingCard style={style}>{children}</BankingCard>;
}

export function Metric({
  label, value, sub, color,
}: { label: string; value: string; sub?: string; color?: string }) {
  // Map the old colour prop onto the new BankingCard accent system.
  const accent =
    color === "#2DBE60" ? "green" :
    color === "#7B4FBF" ? "violet" :
    color === "#15B8C9" ? "cyan" :
    "neutral";
  return (
    <BankingCard accent={accent}>
      <div
        style={{
          fontSize: 10,
          fontWeight: zp.weight.semibold,
          color: zp.text.muted,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          ...zp.amountStyle.large,
          fontSize: 22,
          color: zp.text.primary,
          marginTop: 6,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: zp.text.muted, marginTop: 4 }}>
          {sub}
        </div>
      )}
    </BankingCard>
  );
}
