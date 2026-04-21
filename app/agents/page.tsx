// Landing inside the ZeniPay Agents module. This is the "other mode" —
// fully separate from the merchant dashboard. Phase 1 placeholder; the
// next steps wire it to the agents schema we just created.
//
// Visual is intentionally minimal and distinct from the merchant product's
// navy/teal theme: near-black + lime accent, monospace section markers.

"use client";

import Link from "next/link";

const BG = "#05070E";
const SURFACE = "#0A0F1E";
const BORDER = "#1b2132";
const TEXT = "#e5e7eb";
const MUTED = "#94a3b8";
const LIME = "#a3ff91";
const MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

const IS_ENABLED = process.env.NEXT_PUBLIC_AGENTS_ENABLED === "true";

export default function AgentsHome() {
  if (!IS_ENABLED) {
    return (
      <main style={{ padding: "80px 24px", maxWidth: 720, margin: "0 auto" }}>
        <p style={{ fontFamily: MONO, fontSize: 11, color: MUTED, letterSpacing: "0.1em" }}>
          § COMING_SOON
        </p>
        <h1 style={{ fontSize: 36, fontWeight: 700, margin: "12px 0 16px", color: TEXT }}>
          ZeniPay Agents
        </h1>
        <p style={{ color: MUTED, lineHeight: 1.6 }}>
          Payment infrastructure for AI agents. Invite-only preview.
        </p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 1400, margin: "0 auto", padding: "56px 32px" }}>
      {/* section marker */}
      <p
        style={{
          fontFamily: MONO,
          fontSize: 11,
          color: MUTED,
          letterSpacing: "0.12em",
          margin: 0,
        }}
      >
        § 01 — AGENTS / OVERVIEW
      </p>

      {/* hero */}
      <h1
        style={{
          margin: "14px 0 18px",
          fontSize: 56,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: TEXT,
          maxWidth: 900,
          lineHeight: 1.05,
        }}
      >
        Wallets, policies, and audit trails —{" "}
        <em style={{ color: LIME, fontStyle: "italic" }}>
          for the agents that pay on your behalf.
        </em>
      </h1>

      <p style={{ color: MUTED, fontSize: 16, maxWidth: 620, lineHeight: 1.6 }}>
        ZeniPay Agents gives every AI agent a programmable sub-wallet with
        cryptographic authorization, spending guardrails, and an immutable
        audit trail. Private preview.
      </p>

      <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
        <Link
          href="/agents/dashboard"
          style={{
            padding: "12px 22px",
            borderRadius: 999,
            background: LIME,
            color: "#0A0F1E",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          Open sandbox dashboard →
        </Link>
        <Link
          href="/app/overview"
          style={{
            padding: "12px 22px",
            borderRadius: 999,
            background: "transparent",
            color: TEXT,
            textDecoration: "none",
            border: `1px solid ${BORDER}`,
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          ← Back to merchant dashboard
        </Link>
      </div>

      {/* capability grid */}
      <section
        style={{
          marginTop: 56,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
          gap: 14,
        }}
      >
        {[
          { h: "Sub-wallets", b: "One virtual wallet per agent, balance in cents, atomic debit." },
          { h: "Policies", b: "Monthly budget, daily cap, per-tx cap, merchant whitelist/blacklist, category, time window." },
          { h: "Ed25519 signatures", b: "Every payment request is signed by the agent and verified server-side." },
          { h: "Append-only audit", b: "Immutable log — writes enforced by a Postgres trigger, including service_role." },
          { h: "API keys", b: "zpk_live_ / zpk_test_, SHA-256 hashed at rest, shown once at creation." },
          { h: "Multi-tenant", b: "Row Level Security on every table, scoped by organization." },
        ].map((c) => (
          <div
            key={c.h}
            style={{
              background: SURFACE,
              border: `1px solid ${BORDER}`,
              borderRadius: 12,
              padding: "18px 20px",
            }}
          >
            <p
              style={{
                fontFamily: MONO,
                fontSize: 10,
                color: LIME,
                letterSpacing: "0.1em",
                margin: 0,
              }}
            >
              ⌁ CAPABILITY
            </p>
            <h3 style={{ margin: "8px 0 6px", fontSize: 16, color: TEXT, fontWeight: 700 }}>{c.h}</h3>
            <p style={{ margin: 0, color: MUTED, fontSize: 13, lineHeight: 1.5 }}>{c.b}</p>
          </div>
        ))}
      </section>

      <div
        style={{
          marginTop: 40,
          padding: "12px 16px",
          borderRadius: 10,
          border: `1px dashed ${BORDER}`,
          color: MUTED,
          fontFamily: MONO,
          fontSize: 11,
          letterSpacing: "0.06em",
        }}
      >
        // phase 1 — schema applied, core modules shipped. api + dashboard next.
      </div>
    </main>
  );
}
