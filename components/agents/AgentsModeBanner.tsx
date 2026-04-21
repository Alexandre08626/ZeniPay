// Opt-in entry-point banner for ZeniPay Agents.
//
// Matches the existing ZeniPay merchant dashboard aesthetic: white card,
// ZeniPay brand gradient (green → cyan → purple), light/fintech feel.
//
// Gated by NEXT_PUBLIC_AGENTS_ENABLED. Dismissal persists per merchant in
// localStorage. Renders null when disabled or dismissed — never disrupts the
// existing merchant UI.

"use client";

import React, { useEffect, useState } from "react";

const DISMISS_KEY = "zp_agents_banner_dismissed_v1";

// ZeniPay palette (matches app/app/ZenivaComplete.tsx)
const ZP_GREEN = "#2DBE60";
const ZP_CYAN = "#15B8C9";
const ZP_PURPLE = "#7B4FBF";
const ZP_GRAD = `linear-gradient(135deg, ${ZP_GREEN} 0%, ${ZP_CYAN} 45%, ${ZP_PURPLE} 100%)`;

const CARD_BG = "#ffffff";
const BORDER = "#e2e8f0";
const TEXT = "#0f172a";
const MUTED = "#64748b";

export interface AgentsModeBannerProps {
  /** Per-merchant namespace for dismissal. */
  merchantId?: string;
  /** CTA destination. Default: /agents */
  href?: string;
}

export function AgentsModeBanner({ merchantId, href = "/agents" }: AgentsModeBannerProps) {
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const enabled = process.env.NEXT_PUBLIC_AGENTS_ENABLED === "true";
  const storageKey = merchantId ? `${DISMISS_KEY}:${merchantId}` : DISMISS_KEY;

  useEffect(() => {
    setMounted(true);
    try {
      setDismissed(localStorage.getItem(storageKey) === "1");
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  if (!enabled || !mounted || dismissed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  return (
    <div
      role="region"
      aria-label="ZeniPay Agents — new mode available"
      style={{
        margin: "0 0 20px",
        padding: "16px 20px",
        borderRadius: 16,
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        boxShadow: "0 1px 4px rgba(15,23,42,0.04)",
        display: "flex",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Left accent bar in ZeniPay gradient */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          background: ZP_GRAD,
        }}
      />

      {/* Icon tile */}
      <span
        aria-hidden
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: ZP_GRAD,
          color: "#ffffff",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          fontWeight: 800,
          flexShrink: 0,
          boxShadow: "0 2px 10px rgba(45,190,96,0.25)",
        }}
      >
        🤖
      </span>

      <div style={{ flex: 1, minWidth: 220 }}>
        <p
          style={{
            margin: 0,
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontWeight: 800,
            background: ZP_GRAD,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          New Mode — ZeniPay Agents
        </p>
        <p style={{ margin: "4px 0 0", fontSize: 15, color: TEXT, fontWeight: 700 }}>
          Accept payments from AI agents
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: MUTED }}>
          Programmable wallets, policies, and audit trails for your AI fleet.
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <a
          href={href}
          data-testid="agents-mode-enter"
          style={{
            background: ZP_GRAD,
            color: "#ffffff",
            padding: "10px 18px",
            borderRadius: 10,
            textDecoration: "none",
            fontWeight: 700,
            fontSize: 13,
            whiteSpace: "nowrap",
            boxShadow: "0 4px 12px rgba(45,190,96,0.25)",
          }}
        >
          Open AI Agent Wallet →
        </a>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          style={{
            background: "#f8fafc",
            color: MUTED,
            border: `1px solid ${BORDER}`,
            padding: "10px 14px",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Later
        </button>
      </div>
    </div>
  );
}
