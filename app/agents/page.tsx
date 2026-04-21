// Landing page for the ZeniPay Agents module — Phase 1 preview.
// Matches the existing ZeniPay merchant dashboard: white cards, ZeniPay
// gradient accent, fintech aesthetic. Fully isolated from /app (merchant).

"use client";

import Link from "next/link";

// ZeniPay palette — identical to app/app/ZenivaComplete.tsx.
const PAGE_BG = "#f0f4f8";
const CARD_BG = "#ffffff";
const BORDER = "#e2e8f0";
const TEXT = "#0f172a";
const MUTED = "#64748b";
const LIGHT = "#94a3b8";

const ZP_GREEN = "#2DBE60";
const ZP_CYAN = "#15B8C9";
const ZP_PURPLE = "#7B4FBF";
const ZP_BLUE = "#2A8FE0";
const ZP_GRAD = `linear-gradient(135deg, ${ZP_GREEN} 0%, ${ZP_CYAN} 45%, ${ZP_PURPLE} 100%)`;

const IS_ENABLED = process.env.NEXT_PUBLIC_AGENTS_ENABLED === "true";

export default function AgentsHome() {
  if (!IS_ENABLED) {
    return (
      <main style={{ padding: "80px 24px", maxWidth: 720, margin: "0 auto" }}>
        <p
          style={{
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: MUTED,
            fontWeight: 700,
          }}
        >
          Coming soon
        </p>
        <h1
          style={{
            fontSize: 36,
            fontWeight: 900,
            margin: "10px 0 14px",
            color: TEXT,
            letterSpacing: "-0.01em",
          }}
        >
          ZeniPay Agents
        </h1>
        <p style={{ color: MUTED, lineHeight: 1.6, fontSize: 15 }}>
          Payment infrastructure for AI agents. Invite-only preview.
        </p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 28px 72px" }}>
      {/* Top nav back */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <Link
          href="/app/overview"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 700,
            color: MUTED,
            textDecoration: "none",
            padding: "8px 14px",
            borderRadius: 999,
            border: `1px solid ${BORDER}`,
            background: CARD_BG,
          }}
        >
          ← Back to merchant dashboard
        </Link>
        <span
          style={{
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            padding: "5px 12px",
            borderRadius: 999,
            background: `${ZP_GREEN}15`,
            color: ZP_GREEN,
            border: `1px solid ${ZP_GREEN}30`,
            fontWeight: 800,
          }}
        >
          ● Preview — Phase 1
        </span>
      </div>

      {/* Hero card */}
      <section
        style={{
          background: CARD_BG,
          border: `1px solid ${BORDER}`,
          borderRadius: 24,
          padding: "40px 36px",
          boxShadow: "0 1px 6px rgba(15,23,42,0.05)",
          marginBottom: 24,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Gradient accent ribbon */}
        <span
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: 4,
            width: "100%",
            background: ZP_GRAD,
          }}
        />
        <span
          aria-hidden
          style={{
            position: "absolute",
            right: -80,
            top: -80,
            width: 240,
            height: 240,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${ZP_CYAN}14 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />
        <p
          style={{
            margin: 0,
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontWeight: 800,
            background: ZP_GRAD,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          ZeniPay Agents
        </p>
        <h1
          style={{
            margin: "10px 0 14px",
            fontSize: 40,
            fontWeight: 900,
            letterSpacing: "-0.02em",
            color: TEXT,
            maxWidth: 820,
            lineHeight: 1.1,
          }}
        >
          Wallets, policies, and audit trails —{" "}
          <span style={{ background: ZP_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            for the agents that pay on your behalf.
          </span>
        </h1>
        <p style={{ color: MUTED, fontSize: 15, maxWidth: 620, lineHeight: 1.6, margin: "0 0 26px" }}>
          Every AI agent gets a programmable sub-wallet with cryptographic
          authorization, spending guardrails, and an immutable audit trail.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link
            href="/agents/login"
            style={{
              padding: "12px 22px",
              borderRadius: 10,
              background: ZP_GRAD,
              color: "#ffffff",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: 14,
              boxShadow: "0 4px 14px rgba(45,190,96,0.28)",
            }}
          >
            Open sandbox dashboard →
          </Link>
          <a
            href="https://github.com/Alexandre08626/ZeniPay"
            target="_blank"
            rel="noreferrer"
            style={{
              padding: "12px 20px",
              borderRadius: 10,
              background: "#f8fafc",
              color: TEXT,
              textDecoration: "none",
              fontWeight: 700,
              fontSize: 14,
              border: `1px solid ${BORDER}`,
            }}
          >
            Read the docs
          </a>
        </div>
      </section>

      {/* Capability grid */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 14,
        }}
      >
        {[
          { icon: "💼", h: "Sub-wallets", b: "One virtual wallet per agent. Balance in cents. Atomic debit.", color: ZP_GREEN },
          { icon: "🛡️", h: "Policies", b: "Monthly budget, daily / per-tx caps, merchant whitelist, categories, time windows.", color: ZP_CYAN },
          { icon: "🔐", h: "Ed25519 signatures", b: "Every payment request signed by the agent and verified server-side.", color: ZP_PURPLE },
          { icon: "📜", h: "Append-only audit", b: "Immutable log — enforced by Postgres trigger, incl. service_role.", color: ZP_BLUE },
          { icon: "🔑", h: "API keys", b: "zpk_live_ / zpk_test_. SHA-256 hashed at rest. Shown once at creation.", color: "#F5A623" },
          { icon: "🏢", h: "Multi-tenant", b: "Row Level Security on every table, scoped by organization.", color: "#E5247B" },
        ].map((c) => (
          <div
            key={c.h}
            style={{
              background: CARD_BG,
              border: `1px solid ${BORDER}`,
              borderRadius: 16,
              padding: "18px 20px",
              boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
              borderLeft: `4px solid ${c.color}`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 8,
              }}
            >
              <span style={{ fontSize: 22 }}>{c.icon}</span>
              <h3 style={{ margin: 0, fontSize: 15, color: TEXT, fontWeight: 800 }}>{c.h}</h3>
            </div>
            <p style={{ margin: 0, color: MUTED, fontSize: 13, lineHeight: 1.55 }}>{c.b}</p>
          </div>
        ))}
      </section>

      {/* Status footer */}
      <div
        style={{
          marginTop: 32,
          padding: "14px 18px",
          borderRadius: 12,
          background: CARD_BG,
          border: `1px solid ${BORDER}`,
          color: MUTED,
          fontSize: 12,
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: ZP_GREEN,
            boxShadow: `0 0 8px ${ZP_GREEN}`,
          }}
        />
        <strong style={{ color: TEXT }}>Phase 1 — schema applied, core modules shipped.</strong>
        <span style={{ color: LIGHT }}>• API &amp; dashboard coming next.</span>
      </div>
    </main>
  );
}
