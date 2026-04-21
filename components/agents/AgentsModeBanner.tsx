// Opt-in entry-point banner for ZeniPay Agents (the "other mode").
//
// Gated by NEXT_PUBLIC_AGENTS_ENABLED (default: disabled). Renders nothing
// when the flag is false, when the user dismisses it, or when it's
// server-rendered (we need window for localStorage + for the distinct
// styling not to flash). Dismissal persists per merchant in localStorage.
//
// This component is designed to be dropped into the existing merchant
// dashboard without modifying any existing UI logic — it just mounts and
// gets out of the way.

"use client";

import React, { useEffect, useState } from "react";

const DISMISS_KEY = "zp_agents_banner_dismissed_v1";
const LIME = "#a3ff91";

export interface AgentsModeBannerProps {
  /** If provided, used as the localStorage namespace so dismissal is per-org. */
  merchantId?: string;
  /** Where the CTA sends the user. Default: /agents */
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
      // ignore SSR / disabled localStorage
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
        margin: "16px 0",
        padding: "14px 18px",
        borderRadius: 14,
        background: "linear-gradient(135deg, #0A0F1E 0%, #08110b 100%)",
        border: `1px solid ${LIME}33`,
        display: "flex",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap",
        boxShadow: `0 0 0 1px ${LIME}10 inset`,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: `${LIME}1a`,
          color: LIME,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontWeight: 800,
          fontSize: 14,
          flexShrink: 0,
        }}
      >
        ◆
      </span>
      <div style={{ flex: 1, minWidth: 220 }}>
        <p
          style={{
            margin: 0,
            fontSize: 10,
            letterSpacing: "0.12em",
            color: LIME,
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          }}
        >
          NEW MODE — ZENIPAY AGENTS
        </p>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "#e5e7eb", fontWeight: 600 }}>
          Accept payments from AI agents. Programmable wallets, policies, and audit trails.
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <a
          href={href}
          style={{
            background: LIME,
            color: "#0A0F1E",
            padding: "9px 18px",
            borderRadius: 999,
            textDecoration: "none",
            fontWeight: 700,
            fontSize: 13,
            whiteSpace: "nowrap",
          }}
          data-testid="agents-mode-enter"
        >
          Open AI Agent Wallet →
        </a>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          style={{
            background: "transparent",
            color: "rgba(255,255,255,0.55)",
            border: "1px solid rgba(255,255,255,0.15)",
            padding: "9px 14px",
            borderRadius: 999,
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
