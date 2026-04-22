// /agents/overview — dedicated ZeniPay Agents marketing page.
//
// Distinct from /agents/dashboard (the authenticated operator dashboard).
// This is public marketing: hero → 10 pillars (7 live / 3 roadmap) → ZeniCore
// ledger preview → deep dive on how the system composes → beta pricing → CTAs.
//
// SELF-CONTAINED: no @/components imports, inline styles only, only next/link
// + next/navigation. Fonts flow via globals.css CSS vars loaded in layout.tsx.

"use client";

import { useEffect, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Tokens — intentionally duplicated from lib/design-system/tokens.ts.
const T = {
  white: "#ffffff",
  surface: "#f8f9fa",
  border: "#e2e8f0",
  textHeading: "#0a0a0a",
  textBody: "#525252",
  textMuted: "#737373",
  textSubtle: "#a3a3a3",
  brandGreen: "#2dbe60",
  brandCyan: "#15b8c9",
  brandPurple: "#7b4fbf",
  success: "#16a34a",
  successBg: "#dcfce7",
  warn: "#d97706",
  warnBg: "#fef3c7",
  danger: "#dc2626",
  dangerBg: "#fee2e2",
  info: "#0891b2",
  infoBg: "#cffafe",
  gradient: "linear-gradient(135deg, #2dbe60 0%, #15b8c9 50%, #7b4fbf 100%)",
  fontSans: 'var(--font-inter), ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  fontSerif: 'var(--font-fraunces), Fraunces, Georgia, serif',
  fontMono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  shadowSm: "0 1px 2px rgba(0,0,0,0.04)",
  shadowMd: "0 4px 12px rgba(0,0,0,0.06)",
  shadowLg: "0 10px 30px rgba(0,0,0,0.08)",
};

export default function AgentsOverview() {
  const router = useRouter();
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && sessionStorage.getItem("zp_client")) {
        router.replace("/app/overview");
      }
    } catch { /* ignore */ }
  }, [router]);

  return (
    <div
      className="zp-root"
      style={{
        minHeight: "100vh",
        background: T.white,
        color: T.textBody,
        fontFamily: T.fontSans,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <TopBar />
      <Hero />
      <Pillars />
      <LedgerPreview />
      <DeepDive />
      <BetaPricing />
      <ClosingCta />
      <FooterBar />
    </div>
  );
}

function TopBar() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(255, 255, 255, 0.8)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
            color: T.textHeading,
            fontFamily: T.fontSans,
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          <BrandGlyph />
          ZeniPay
          <span
            style={{
              marginLeft: 6,
              fontSize: 11,
              fontWeight: 600,
              color: T.success,
              background: T.successBg,
              padding: "2px 8px",
              borderRadius: 999,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Agents
          </span>
        </Link>

        <nav className="agents-nav-links" style={{ display: "none", alignItems: "center", gap: 24 }}>
          <Link href="/merchant" style={navLinkStyle}>Merchant</Link>
          <Link href="/agents/overview" style={{ ...navLinkStyle, color: T.textHeading, fontWeight: 600 }}>AI Agents</Link>
          <Link href="/pricing" style={navLinkStyle}>Pricing</Link>
          <Link href="/security" style={navLinkStyle}>Security</Link>
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/agents/login" style={{ ...navLinkStyle, padding: "8px 12px" }}>Sign in</Link>
          <Link
            href="/contact"
            style={{
              fontFamily: T.fontSans,
              fontSize: 14,
              fontWeight: 600,
              color: T.white,
              background: T.textHeading,
              textDecoration: "none",
              padding: "8px 16px",
              borderRadius: 6,
              boxShadow: T.shadowSm,
            }}
          >
            Request access
          </Link>
        </div>
      </div>
      <style>{`
        @media (min-width: 768px) {
          .agents-nav-links { display: flex !important; }
        }
      `}</style>
    </header>
  );
}

const navLinkStyle: CSSProperties = {
  fontFamily: T.fontSans,
  fontSize: 14,
  fontWeight: 500,
  color: T.textBody,
  textDecoration: "none",
};

function BrandGlyph() {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 24,
        height: 24,
        borderRadius: 6,
        background: T.gradient,
        color: T.white,
        fontSize: 13,
        fontWeight: 800,
        letterSpacing: "-0.02em",
      }}
    >
      Z
    </span>
  );
}

function Hero() {
  return (
    <section
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "64px 24px 48px",
        textAlign: "center",
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontFamily: T.fontSans,
            fontSize: 13,
            fontWeight: 500,
            color: T.textMuted,
            textDecoration: "none",
          }}
        >
          ← Both products
        </Link>
      </div>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "4px 12px",
          borderRadius: 999,
          background: T.white,
          border: `1px solid ${T.border}`,
          boxShadow: T.shadowSm,
          fontFamily: T.fontSans,
          fontSize: 12,
          fontWeight: 500,
          color: T.textBody,
          marginBottom: 16,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: T.success,
            boxShadow: `0 0 0 3px ${T.successBg}`,
          }}
        />
        7 of 10 pillars live in production
      </div>
      <h1
        style={{
          margin: 0,
          fontFamily: T.fontSerif,
          fontSize: "clamp(44px, 7vw, 80px)",
          lineHeight: 1.05,
          letterSpacing: "-0.04em",
          fontWeight: 600,
          color: T.textHeading,
        }}
      >
        The bank for{" "}
        <span
          style={{
            backgroundImage: T.gradient,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          AI agents
        </span>
        ,
        <br />
        at enterprise scale.
      </h1>
      <p
        style={{
          margin: "24px auto 0",
          maxWidth: 640,
          fontFamily: T.fontSans,
          fontSize: 19,
          lineHeight: 1.55,
          color: T.textBody,
        }}
      >
        Issue closed-loop cards, fund multi-currency treasuries, auto-categorize every
        charge, and sign your audit log with an Ed25519 key. Purpose-built for teams
        running fleets of autonomous agents.
      </p>

      <div
        style={{
          marginTop: 32,
          display: "flex",
          gap: 12,
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/contact"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "14px 28px",
            borderRadius: 6,
            background: T.textHeading,
            color: T.white,
            textDecoration: "none",
            fontFamily: T.fontSans,
            fontSize: 16,
            fontWeight: 600,
            boxShadow: T.shadowMd,
          }}
        >
          Request access <span aria-hidden>→</span>
        </Link>
        <Link
          href="/agents/login"
          style={{
            padding: "14px 28px",
            borderRadius: 6,
            background: T.white,
            color: T.textHeading,
            textDecoration: "none",
            border: `1px solid ${T.border}`,
            fontFamily: T.fontSans,
            fontSize: 16,
            fontWeight: 500,
          }}
        >
          View the platform
        </Link>
      </div>
      <p
        style={{
          marginTop: 20,
          fontFamily: T.fontSans,
          fontSize: 13,
          color: T.textSubtle,
        }}
      >
        SOC2-grade audit exports · Vault-encrypted secrets · Zero regression on merchant flows
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Pillars — 10 total, 7 live + 3 roadmap. Grid 3-col desktop, 1-col mobile.
// ---------------------------------------------------------------------------
interface Pillar {
  num: string;
  title: string;
  tagline: string;
  body: string;
  status: "live" | "roadmap";
  accent: string;
}

const PILLARS: Pillar[] = [
  { num: "01", title: "Virtual cards",          tagline: "Issue in seconds.",                    body: "ZeniPay-issued cards on our own BIN range + Stripe Issuing fallback. Per-merchant / per-category / off-hours policies.", status: "live",    accent: T.brandGreen },
  { num: "02", title: "Multi-currency treasury", tagline: "Seven currencies, one ledger.",       body: "USD, CAD, EUR, GBP, AUD, SGD, JPY. FX snapped at settle-time so historical reports never drift.",                status: "live",    accent: T.brandCyan },
  { num: "03", title: "Expense categorization", tagline: "The CFO's GL, automatically.",         body: "41-MCC default catalog + org overrides. Auto-booked to the right account within 15 minutes of settlement.",          status: "live",    accent: T.brandPurple },
  { num: "04", title: "Approval workflows",     tagline: "TOTP-gated, policy-driven.",           body: "Spend thresholds route to human approvers with Google-Authenticator-compatible step-up. Dual control built in.",    status: "live",    accent: T.info },
  { num: "05", title: "Unified agent + human wallet", tagline: "One balance, both personas.", body: "Humans and their agents share a common treasury with per-persona spend limits. Roadmap Q3 2026.",                status: "roadmap", accent: T.textMuted },
  { num: "06", title: "Credit lines",           tagline: "Agent-scale working capital.",         body: "Underwritten per-org credit that spills over into agent wallets on demand. Roadmap Q4 2026.",                           status: "roadmap", accent: T.textMuted },
  { num: "07", title: "Fraud ML",               tagline: "Z-scored 24/7.",                       body: "Welford baselines across three scopes. Alerts above 3σ, auto-pause card above 6σ. Real-time, not batched.",         status: "live",    accent: T.warn },
  { num: "08", title: "AP-Bot bill pay",        tagline: "Agents pay your suppliers.",          body: "Automated AP: invoices in, approvals out, payments on schedule. Roadmap Q1 2027.",                                    status: "roadmap", accent: T.textMuted },
  { num: "09", title: "SOC2 audit export",      tagline: "Ed25519-signed, tamper-evident.",     body: "Streamed NDJSON with per-row Merkle proofs. Auditors verify offline against our published public key.",           status: "live",    accent: T.success },
  { num: "10", title: "Closed-loop bank rails", tagline: "ZeniCore ledger + ZeniCards network.", body: "In-house double-entry ledger with chain-hashed journal. Own BIN range accepted by the ZeniPay merchant network.", status: "live",    accent: T.brandGreen },
];

function Pillars() {
  return (
    <section
      style={{
        padding: "80px 24px",
        background: T.surface,
        borderTop: `1px solid ${T.border}`,
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ maxWidth: 680, marginBottom: 48 }}>
          <div
            style={{
              fontFamily: T.fontSans,
              fontSize: 12,
              fontWeight: 600,
              color: T.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 12,
            }}
          >
            The 10 pillars
          </div>
          <h2
            style={{
              margin: 0,
              fontFamily: T.fontSerif,
              fontSize: 40,
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
              fontWeight: 600,
              color: T.textHeading,
            }}
          >
            A full bank, one pillar at a time.
          </h2>
          <p
            style={{
              margin: "16px 0 0",
              fontFamily: T.fontSans,
              fontSize: 17,
              lineHeight: 1.55,
              color: T.textBody,
            }}
          >
            Seven pillars are in production today. Three are on the roadmap. Every pillar
            composes with the next — the treasury is also the card backing; the ledger
            is also the audit trail.
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {PILLARS.map((p) => <PillarCard key={p.num} pillar={p} />)}
        </div>
      </div>
    </section>
  );
}

function PillarCard({ pillar }: { pillar: Pillar }) {
  const isLive = pillar.status === "live";
  return (
    <article
      style={{
        background: T.white,
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        opacity: isLive ? 1 : 0.92,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span
          style={{
            fontFamily: T.fontMono,
            fontSize: 12,
            fontWeight: 600,
            color: T.textSubtle,
            letterSpacing: "0.04em",
          }}
        >
          Pillar {pillar.num}
        </span>
        {isLive ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontFamily: T.fontSans,
              fontSize: 11,
              fontWeight: 600,
              color: T.success,
            }}
          >
            <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: T.success }} />
            Live
          </span>
        ) : (
          <span
            style={{
              fontFamily: T.fontSans,
              fontSize: 11,
              fontWeight: 600,
              color: T.warn,
              background: T.warnBg,
              padding: "2px 8px",
              borderRadius: 999,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Roadmap
          </span>
        )}
      </div>
      <div
        style={{
          width: 32,
          height: 2,
          background: pillar.accent,
          borderRadius: 999,
        }}
      />
      <h3
        style={{
          margin: 0,
          fontFamily: T.fontSans,
          fontSize: 18,
          fontWeight: 600,
          color: T.textHeading,
          letterSpacing: "-0.01em",
        }}
      >
        {pillar.title}
      </h3>
      <div
        style={{
          fontFamily: T.fontSans,
          fontSize: 14,
          fontWeight: 600,
          color: T.textHeading,
        }}
      >
        {pillar.tagline}
      </div>
      <p
        style={{
          margin: 0,
          fontFamily: T.fontSans,
          fontSize: 14,
          lineHeight: 1.55,
          color: T.textBody,
        }}
      >
        {pillar.body}
      </p>
    </article>
  );
}

// ---------------------------------------------------------------------------
// ZeniCore ledger preview — mirror of /agents/ledger dashboard view.
// ---------------------------------------------------------------------------
function LedgerPreview() {
  return (
    <section style={{ padding: "80px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div
          className="ledger-preview-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.4fr",
            gap: 48,
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: T.fontSans,
                fontSize: 12,
                fontWeight: 600,
                color: T.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 12,
              }}
            >
              ZeniCore ledger
            </div>
            <h2
              style={{
                margin: 0,
                fontFamily: T.fontSerif,
                fontSize: 36,
                lineHeight: 1.15,
                letterSpacing: "-0.03em",
                fontWeight: 600,
                color: T.textHeading,
              }}
            >
              Double-entry. Chain-hashed. Yours to audit.
            </h2>
            <p
              style={{
                margin: "16px 0 16px",
                fontFamily: T.fontSans,
                fontSize: 16,
                lineHeight: 1.55,
                color: T.textBody,
              }}
            >
              Every dollar that moves lands in our own general ledger. Debits and credits
              balance by construction. Each journal row carries a SHA-256 chain hash over
              its predecessor — tamper with one row and the verifier tells you exactly
              where the break is.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
              {[
                "Micro-unit precision (1e-6 of currency) — no floating-point drift.",
                "Append-only trigger rejects UPDATE and DELETE on the journal.",
                "Published public key at /.well-known/audit-signing-key.pub.",
              ].map((l) => (
                <li key={l} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span
                    aria-hidden
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 18,
                      height: 18,
                      marginTop: 2,
                      borderRadius: 999,
                      background: T.successBg,
                      color: T.success,
                      fontSize: 10,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    ✓
                  </span>
                  <span
                    style={{
                      fontFamily: T.fontSans,
                      fontSize: 14,
                      lineHeight: 1.5,
                      color: T.textBody,
                    }}
                  >
                    {l}
                  </span>
                </li>
              ))}
            </ul>
            <Link
              href="/agents/ledger"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                marginTop: 24,
                padding: "12px 20px",
                borderRadius: 6,
                background: T.textHeading,
                color: T.white,
                textDecoration: "none",
                fontFamily: T.fontSans,
                fontSize: 15,
                fontWeight: 600,
                boxShadow: T.shadowSm,
              }}
            >
              Open the live ledger <span aria-hidden>→</span>
            </Link>
          </div>

          <LedgerMock />
        </div>

        <style>{`
          @media (max-width: 900px) {
            .ledger-preview-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    </section>
  );
}

function LedgerMock() {
  const rows = [
    { seq: 15, dir: "credit", amt: "2,485,210.43", cur: "USD", memo: "Treasury funded (Finix transfer)",                 acct: "zca_treasury_usd" },
    { seq: 14, dir: "debit",  amt:   "18,000.00", cur: "USD", memo: "Distribute to agent gpt-marketing",                  acct: "zca_treasury_usd" },
    { seq: 13, dir: "credit", amt:   "18,000.00", cur: "USD", memo: "Credited agent wallet gpt-marketing",                acct: "zca_agent_gpt_mk" },
    { seq: 12, dir: "debit",  amt:        "249.00", cur: "USD", memo: "Hold — OpenAI API renewal (card ••••2693)",        acct: "zca_agent_gpt_mk" },
    { seq: 11, dir: "credit", amt:        "249.00", cur: "USD", memo: "Hold — pending_debit on card ••••2693",            acct: "zca_card_2693" },
  ];
  return (
    <div
      style={{
        background: T.white,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        boxShadow: T.shadowLg,
        overflow: "hidden",
      }}
    >
      <BrowserChrome url="zenipay.ca/agents/ledger" />
      <div
        style={{
          padding: 16,
          borderBottom: `1px solid ${T.border}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: T.successBg,
        }}
      >
        <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: T.success }} />
        <div
          style={{
            fontFamily: T.fontSans,
            fontSize: 12,
            fontWeight: 700,
            color: T.success,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Chain integrity · intact
        </div>
        <div
          style={{
            marginLeft: "auto",
            fontFamily: T.fontSans,
            fontSize: 12,
            color: T.textMuted,
          }}
        >
          15/15 entries verified
        </div>
      </div>
      <div style={{ padding: 20 }}>
        <div
          style={{
            fontFamily: T.fontSans,
            fontSize: 11,
            fontWeight: 600,
            color: T.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 8,
          }}
        >
          Recent journal entries
        </div>
        <div
          style={{
            border: `1px solid ${T.border}`,
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "40px 60px 1fr 120px",
              padding: "8px 12px",
              background: T.surface,
              borderBottom: `1px solid ${T.border}`,
              fontFamily: T.fontSans,
              fontSize: 11,
              fontWeight: 600,
              color: T.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            <span>Seq</span>
            <span>Dir</span>
            <span>Memo</span>
            <span style={{ textAlign: "right" }}>Amount</span>
          </div>
          {rows.map((r) => (
            <div
              key={r.seq}
              style={{
                display: "grid",
                gridTemplateColumns: "40px 60px 1fr 120px",
                padding: "10px 12px",
                borderBottom: `1px solid ${T.border}`,
                fontFamily: T.fontSans,
                fontSize: 13,
                color: T.textBody,
                alignItems: "center",
              }}
            >
              <span style={{ fontFamily: T.fontMono, fontSize: 11, color: T.textSubtle }}>#{r.seq}</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: 999,
                  background: r.dir === "credit" ? T.successBg : T.dangerBg,
                  color: r.dir === "credit" ? T.success : T.danger,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  width: "fit-content",
                }}
              >
                {r.dir}
              </span>
              <span style={{ color: T.textHeading, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.memo}
              </span>
              <span style={{ fontFamily: T.fontMono, textAlign: "right", fontWeight: 600, color: T.textHeading }}>
                {r.amt} {r.cur}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BrowserChrome({ url }: { url: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 16px",
        background: T.surface,
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <div style={{ display: "flex", gap: 6 }}>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: "#e5e5e5" }} />
        <span style={{ width: 10, height: 10, borderRadius: 999, background: "#e5e5e5" }} />
        <span style={{ width: 10, height: 10, borderRadius: 999, background: "#e5e5e5" }} />
      </div>
      <div
        style={{
          marginLeft: 12,
          padding: "4px 12px",
          borderRadius: 6,
          background: T.white,
          border: `1px solid ${T.border}`,
          fontFamily: T.fontMono,
          fontSize: 12,
          color: T.textMuted,
        }}
      >
        {url}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DeepDive — three-column explanation of how the system composes.
// ---------------------------------------------------------------------------
function DeepDive() {
  const items = [
    {
      title: "Treasury → Agent wallet → Card.",
      body: "Fund the treasury once. Distribute to agent wallets on demand. Every ZeniCard is backed by a dedicated zenicore account. Balances flow one way, forever traceable.",
    },
    {
      title: "Every spend writes signed events.",
      body: "Each authorization, settlement, approval, and fraud resolution emits a signed audit row. Your SOC2 auditor downloads the NDJSON and verifies it offline with our published public key.",
    },
    {
      title: "The merchant network is part of the product.",
      body: "Agents can pay any Zeniva-network merchant with zero card-network fees — closed-loop settlement runs through the ZeniCore ledger directly. External merchants route through Stripe Issuing.",
    },
  ];
  return (
    <section
      style={{
        padding: "80px 24px",
        background: T.surface,
        borderTop: `1px solid ${T.border}`,
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ maxWidth: 640, marginBottom: 48 }}>
          <div
            style={{
              fontFamily: T.fontSans,
              fontSize: 12,
              fontWeight: 600,
              color: T.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 12,
            }}
          >
            How it composes
          </div>
          <h2
            style={{
              margin: 0,
              fontFamily: T.fontSerif,
              fontSize: 40,
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
              fontWeight: 600,
              color: T.textHeading,
            }}
          >
            Each pillar feeds the next.
          </h2>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {items.map((i) => (
            <div
              key={i.title}
              style={{
                background: T.white,
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                padding: 24,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontFamily: T.fontSans,
                  fontSize: 17,
                  fontWeight: 600,
                  color: T.textHeading,
                  letterSpacing: "-0.01em",
                }}
              >
                {i.title}
              </h3>
              <p
                style={{
                  margin: "10px 0 0",
                  fontFamily: T.fontSans,
                  fontSize: 14,
                  lineHeight: 1.55,
                  color: T.textBody,
                }}
              >
                {i.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// BetaPricing
// ---------------------------------------------------------------------------
function BetaPricing() {
  return (
    <section style={{ padding: "80px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
        <div
          style={{
            fontFamily: T.fontSans,
            fontSize: 12,
            fontWeight: 600,
            color: T.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 12,
          }}
        >
          Beta pricing
        </div>
        <h2
          style={{
            margin: 0,
            fontFamily: T.fontSerif,
            fontSize: 40,
            lineHeight: 1.15,
            letterSpacing: "-0.03em",
            fontWeight: 600,
            color: T.textHeading,
          }}
        >
          Free for design partners through 2026.
        </h2>
        <p
          style={{
            margin: "16px auto 32px",
            maxWidth: 620,
            fontFamily: T.fontSans,
            fontSize: 17,
            lineHeight: 1.55,
            color: T.textBody,
          }}
        >
          Design partners pay nothing for the first six months. Enterprise pricing kicks in
          on the seventh month — $3 per active card per month + 50 bps FX spread, zero
          charge on the dashboards.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            maxWidth: 760,
            margin: "0 auto 32px",
          }}
        >
          {[
            { label: "Transaction fee",   value: "0%",        note: "No markup." },
            { label: "Active card fee",   value: "$3 / mo",   note: "Post-beta." },
            { label: "FX spread",         value: "0.50%",     note: "vs ECB reference." },
            { label: "Dashboards + API",  value: "Free",      note: "Every seat." },
          ].map((r) => (
            <div
              key={r.label}
              style={{
                background: T.white,
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                padding: 16,
                textAlign: "left",
              }}
            >
              <div
                style={{
                  fontFamily: T.fontSans,
                  fontSize: 11,
                  fontWeight: 600,
                  color: T.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                {r.label}
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontFamily: T.fontSans,
                  fontSize: 22,
                  fontWeight: 700,
                  color: T.textHeading,
                  letterSpacing: "-0.02em",
                }}
              >
                {r.value}
              </div>
              <div
                style={{
                  marginTop: 2,
                  fontFamily: T.fontSans,
                  fontSize: 12,
                  color: T.textMuted,
                }}
              >
                {r.note}
              </div>
            </div>
          ))}
        </div>
        <Link
          href="/contact"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 24px",
            borderRadius: 6,
            background: T.textHeading,
            color: T.white,
            textDecoration: "none",
            fontFamily: T.fontSans,
            fontSize: 15,
            fontWeight: 600,
            boxShadow: T.shadowSm,
          }}
        >
          Apply as a design partner
        </Link>
      </div>
    </section>
  );
}

function ClosingCta() {
  return (
    <section
      style={{
        padding: "80px 24px",
        background: T.surface,
        borderTop: `1px solid ${T.border}`,
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <h2
          style={{
            margin: 0,
            fontFamily: T.fontSerif,
            fontSize: 36,
            lineHeight: 1.15,
            letterSpacing: "-0.03em",
            fontWeight: 600,
            color: T.textHeading,
          }}
        >
          Run your agents on banking infrastructure that knows they exist.
        </h2>
        <p
          style={{
            margin: "16px auto 32px",
            maxWidth: 560,
            fontFamily: T.fontSans,
            fontSize: 17,
            lineHeight: 1.55,
            color: T.textBody,
          }}
        >
          Book a 30-minute briefing. We&rsquo;ll walk through the live dashboards, show you
          the audit export verifying against our Ed25519 key, and size a pilot to your
          fleet.
        </p>
        <Link
          href="/contact"
          style={{
            padding: "14px 28px",
            borderRadius: 6,
            background: T.textHeading,
            color: T.white,
            textDecoration: "none",
            fontFamily: T.fontSans,
            fontSize: 16,
            fontWeight: 600,
            boxShadow: T.shadowMd,
          }}
        >
          Talk to us →
        </Link>
      </div>
    </section>
  );
}

function FooterBar() {
  return (
    <footer
      style={{
        background: T.white,
        borderTop: `1px solid ${T.border}`,
        padding: "48px 24px 32px",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", color: T.textHeading }}>
          <BrandGlyph />
          <span style={{ fontFamily: T.fontSans, fontSize: 16, fontWeight: 700 }}>ZeniPay</span>
        </Link>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <Link href="/" style={footerLink}>Overview</Link>
          <Link href="/merchant" style={footerLink}>Merchant</Link>
          <Link href="/pricing" style={footerLink}>Pricing</Link>
          <Link href="/security" style={footerLink}>Security</Link>
          <Link href="/contact" style={footerLink}>Contact</Link>
          <Link href="/legal/privacy" style={footerLink}>Privacy</Link>
          <Link href="/legal/terms" style={footerLink}>Terms</Link>
        </div>
        <p style={{ margin: 0, fontFamily: T.fontSans, fontSize: 13, color: T.textMuted }}>
          © {new Date().getFullYear()} ILM Inc. Built in Québec.
        </p>
      </div>
    </footer>
  );
}

const footerLink: CSSProperties = {
  fontFamily: T.fontSans,
  fontSize: 13,
  fontWeight: 500,
  color: T.textBody,
  textDecoration: "none",
};
