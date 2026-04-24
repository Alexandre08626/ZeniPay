// Reusable ZeniPay account-number card.
//
// Single source of truth for rendering ZP account / routing / SWIFT
// across /app, /personal, /agents. Use the full card on detail pages
// and the compact <CompactZpNumber> under existing balance cards.

"use client";

import React, { useState } from "react";
import { Building2, Bot, User, Landmark, Copy, Check } from "lucide-react";
import { BankingCard, type CardAccent } from "@/components/dashboard/BankingCard";
import zp from "@/lib/design-system/zenipay-brand";
import { formatZPAccount, rawZPAccount } from "@/lib/zenipay/account-format";

export type ZpAccountType = "agent" | "treasury" | "merchant" | "personal";

export interface ZeniPayAccountCardProps {
  accountNumber: string | null;
  routingCode: string | null;
  swiftStyle?: string | null;
  accountType: ZpAccountType;
  accountName?: string;
  currency?: string;
  balance?: number;
  accent?: Extract<CardAccent, "cyan" | "violet" | "pink" | "green">;
}

export function ZeniPayAccountCard({
  accountNumber, routingCode, swiftStyle,
  accountType, accountName, currency, balance,
  accent = "cyan",
}: ZeniPayAccountCardProps) {
  const Icon =
    accountType === "agent"    ? Bot      :
    accountType === "treasury" ? Landmark :
    accountType === "personal" ? User     :
                                 Building2;

  const accentColor =
    accent === "violet" ? zp.brand.violet :
    accent === "pink"   ? zp.brand.pink   :
    accent === "green"  ? zp.brand.green  :
                          zp.brand.cyan;

  return (
    <BankingCard accent={accent}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" as const }}>
        <div style={{
          width: 32, height: 32, borderRadius: zp.radius.sm,
          background: `${accentColor}15`, color: accentColor,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: zp.weight.semibold, color: zp.text.muted, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>
            ZeniPay Account
          </div>
          {accountName && (
            <div style={{ fontSize: 13, fontWeight: zp.weight.semibold, color: zp.text.primary, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
              {accountName}
            </div>
          )}
        </div>
        <span style={{
          fontSize: 9, fontWeight: zp.weight.semibold,
          padding: "3px 9px", borderRadius: 999,
          background: zp.gradient.main, color: "#fff",
          letterSpacing: "0.06em", textTransform: "uppercase" as const,
        }}>
          ZeniPay Network™
        </span>
      </div>

      {balance != null && (
        <div style={{ marginBottom: 14 }}>
          <Label>Balance</Label>
          <div style={{ ...zp.amountStyle.large, fontSize: 22, color: zp.text.primary, marginTop: 2 }}>
            {zp.fmtCurrency(Number(balance), currency || "CAD")}
          </div>
        </div>
      )}

      <RowKV label="Account" value={accountNumber} display={formatZPAccount(accountNumber)} mono />
      <RowKV label="Routing" value={routingCode} display={routingCode ?? ""} mono />
      {swiftStyle && (
        <RowKV label="SWIFT/ZP" value={swiftStyle} display={swiftStyle} mono />
      )}

      <div style={{ marginTop: 12, fontSize: 11, color: zp.text.dim, lineHeight: 1.5 }}>
        {(currency ?? "CAD")} · ZeniPay Internal Network
      </div>

      <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: zp.radius.sm, background: zp.surface.bg2, fontSize: 11, color: zp.text.dim, lineHeight: 1.5 }}>
        ZeniPay account numbers are valid within the ZeniPay Network only.
        To receive funds from external banks, use your ZeniPay payment link.
      </div>
    </BankingCard>
  );
}

// --- compact variant -------------------------------------------------------

/**
 * Mini display for use under existing balance cards. Renders the ZP
 * account in mono with a copy affordance and an optional click-to-expand
 * details modal trigger handled by the parent.
 */
export function CompactZpNumber({
  accountNumber, routingCode, onClick,
}: {
  accountNumber: string | null | undefined;
  routingCode?: string | null;
  onClick?: () => void;
}) {
  if (!accountNumber) return null;
  return (
    <div
      onClick={onClick}
      style={{
        marginTop: 6,
        fontSize: 11,
        color: zp.text.dim,
        fontFamily: zp.font.mono,
        letterSpacing: "0.04em",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {formatZPAccount(accountNumber)}
      {routingCode && <span style={{ marginLeft: 8, opacity: 0.7 }}>· {routingCode}</span>}
    </div>
  );
}

// --- internals -------------------------------------------------------------

function RowKV({ label, value, display, mono }: {
  label: string;
  value: string | null;
  display: string;
  mono?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState(false);

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(rawZPAccount(value));
      setCopied(true);
      setToast(true);
      setTimeout(() => setCopied(false), 1500);
      setTimeout(() => setToast(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "100px 1fr auto", padding: "8px 0", borderBottom: `1px solid ${zp.surface.border}`, alignItems: "center", gap: 8 }}>
      <Label>{label}</Label>
      <span style={{
        fontSize: 16,
        color: zp.text.primary,
        fontWeight: zp.weight.medium,
        fontFamily: mono ? zp.font.mono : zp.font.sans,
        letterSpacing: mono ? "0.02em" : undefined,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap" as const,
      }}>
        {display || "—"}
      </span>
      {value && (
        <button
          onClick={copy}
          aria-label={`Copy ${label}`}
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 28, height: 28, borderRadius: zp.radius.sm,
            border: `1px solid ${zp.surface.border}`, background: zp.surface.bg2,
            color: copied ? zp.semantic.success : zp.text.muted,
            cursor: "pointer", transition: zp.motion.base,
          }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
      )}
      {toast && <CopyToast />}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 10, color: zp.text.muted, fontWeight: zp.weight.semibold,
      letterSpacing: "0.1em", textTransform: "uppercase" as const,
    }}>
      {children}
    </span>
  );
}

function CopyToast() {
  return (
    <div
      role="status"
      style={{
        position: "fixed", bottom: 24, right: 24,
        padding: "10px 14px", borderRadius: zp.radius.sm,
        background: "#0F172A", color: "#fff",
        boxShadow: zp.elevation.lg,
        display: "inline-flex", alignItems: "center", gap: 8,
        fontSize: 13, fontWeight: zp.weight.semibold,
        zIndex: zp.zIndex.modal,
        animation: "zp-toast-fade 2s ease forwards",
      }}
    >
      <Check size={14} color={zp.semantic.success} />
      ZeniPay account number copied!
    </div>
  );
}

export default ZeniPayAccountCard;
