// Root / — ZeniPay 2-products split landing.
//
// Two mature products under one roof:
//   - ZeniPay Merchant (Finix-backed payment processing, revenue-generating)
//   - ZeniPay Agents (in-house closed-loop bank for AI agents)
//
// Investor-meeting requirement: show both with equal visual weight. AI Agents
// is an addition, not a replacement. This file is SELF-CONTAINED — no imports
// from @/components or lib/design-system. Only next/link + next/navigation.
// Fonts flow from layout.tsx (Inter + Fraunces via next/font/google) and are
// referenced as CSS variables --font-inter / --font-fraunces in globals.css.

"use client";

import { useEffect, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ---------------------------------------------------------------------------
// Tokens — mirrored from lib/design-system/tokens.ts as literal CSSProperties.
// Intentionally duplicated so this file has zero imports from our design
// system module. Keeping in sync with the system is a visual review responsibility.
// ---------------------------------------------------------------------------
const T = {
  white: "#ffffff",
  surface: "#f8f9fa",
  border: "#e2e8f0",
  borderStrong: "#cbd5e1",
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

export default function TwoProductsLanding() {
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
      <TwoProductsSplit />
      <UsedTogether />
      <CtaBand />
      <FooterBar />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top nav (self-contained — a lighter-weight variant of MarketingNav that
// still works on merchant + agents pages since it links to both).
// ---------------------------------------------------------------------------
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
            fontFamily: T.fontSans,
            fontSize: 18,
            fontWeight: 700,
            color: T.textHeading,
            letterSpacing: "-0.02em",
          }}
        >
          <BrandGlyph />
          ZeniPay
        </Link>

        <nav className="landing-nav-links" style={{ display: "none", alignItems: "center", gap: 24 }}>
          <Link href="/merchant" style={navLinkStyle}>For merchants</Link>
          <Link href="/agents/overview" style={navLinkStyle}>For AI agents</Link>
          <Link href="/pricing" style={navLinkStyle}>Pricing</Link>
          <Link href="/security" style={navLinkStyle}>Security</Link>
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/login" style={{ ...navLinkStyle, padding: "8px 12px" }}>Sign in</Link>
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
              transition: "all 150ms ease-out",
            }}
          >
            Request access
          </Link>
        </div>
      </div>
      <style>{`
        @media (min-width: 768px) {
          .landing-nav-links { display: flex !important; }
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
  transition: "color 120ms ease-out",
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

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------
function Hero() {
  return (
    <section
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "64px 24px 32px",
        textAlign: "center",
      }}
    >
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
          marginBottom: 24,
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
        Two products live · One operational platform
      </div>

      <h1
        style={{
          margin: 0,
          fontFamily: T.fontSerif,
          fontWeight: 600,
          fontSize: "clamp(44px, 7vw, 80px)",
          lineHeight: 1.05,
          letterSpacing: "-0.04em",
          color: T.textHeading,
          maxWidth: 920,
          marginInline: "auto",
        }}
      >
        One platform.{" "}
        <span
          style={{
            backgroundImage: T.gradient,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          Two products.
        </span>
        <br />
        Every dollar your business moves.
      </h1>

      <p
        style={{
          maxWidth: 660,
          margin: "24px auto 0",
          fontFamily: T.fontSans,
          fontSize: 18,
          lineHeight: 1.55,
          color: T.textBody,
        }}
      >
        ZeniPay processes payments for Canadian and American merchants, AND operates the
        first closed-loop bank built for fleets of AI agents. Pick the product that
        matches where you are — or run both together.
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// TwoProductsSplit — the centerpiece. Two side-by-side cards.
// ---------------------------------------------------------------------------
interface ProductCardInfo {
  kind: "merchant" | "agents";
  eyebrow: string;
  title: string;
  subtitle: string;
  capabilities: Array<{ label: string; note: string }>;
  ctaPrimary: { label: string; href: string };
  ctaSecondary: { label: string; href: string };
  proof: string;
}

const MERCHANT_CARD: ProductCardInfo = {
  kind: "merchant",
  eyebrow: "ZeniPay Merchant",
  title: "Accept payments. Move money. Run your business.",
  subtitle:
    "Payment infrastructure for Canadian and American businesses. Live production. Finix-powered card processing, instant payouts, invoicing, pay links.",
  capabilities: [
    { label: "Card + ACH acceptance",  note: "Visa, Mastercard, Amex, debit. 135+ currencies." },
    { label: "Instant payouts",        note: "RTP / FedNow / ACH / wire. Pay employees in minutes." },
    { label: "Pay links + invoicing",  note: "Share a link. Get paid. Automated reminders." },
    { label: "99.99% uptime SLA",      note: "<200ms processing. PCI DSS Level 1 compliant." },
  ],
  ctaPrimary:   { label: "Open merchant dashboard →", href: "/app/overview" },
  ctaSecondary: { label: "Learn more",                href: "/merchant" },
  proof: "Live today · Serving Zeniva Travel and growing.",
};

const AGENTS_CARD: ProductCardInfo = {
  kind: "agents",
  eyebrow: "ZeniPay Agents",
  title: "The bank for AI agents, at enterprise scale.",
  subtitle:
    "Issue virtual cards, fund multi-currency treasuries, auto-categorize every charge, and sign your audit log. Purpose-built for teams running fleets of autonomous agents.",
  capabilities: [
    { label: "Closed-loop ZeniCards",    note: "In-house BIN range. Every card backed by a zenicore account." },
    { label: "Double-entry ledger",      note: "SHA-256 chain-hashed journal. Tamper-evident by construction." },
    { label: "Fraud ML + approvals",     note: "15-min Welford baseline. TOTP step-up on policy-gated spend." },
    { label: "SOC2-grade audit export",  note: "Ed25519-signed NDJSON with Merkle proofs. Verify offline." },
  ],
  ctaPrimary:   { label: "Open agents dashboard →", href: "/agents/dashboard" },
  ctaSecondary: { label: "See the platform",        href: "/agents/overview" },
  proof: "7 of 10 pillars live in production.",
};

function TwoProductsSplit() {
  return (
    <section
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "32px 24px 80px",
      }}
    >
      <div
        className="two-products-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
        }}
      >
        <ProductCard info={MERCHANT_CARD} />
        <ProductCard info={AGENTS_CARD} />
      </div>

      <style>{`
        @media (max-width: 900px) {
          .two-products-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}

function ProductCard({ info }: { info: ProductCardInfo }) {
  const accent = info.kind === "merchant" ? T.brandCyan : T.brandGreen;
  return (
    <article
      style={{
        position: "relative",
        background: T.white,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: 32,
        display: "flex",
        flexDirection: "column",
        gap: 24,
        boxShadow: T.shadowSm,
        overflow: "hidden",
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: info.kind === "merchant" ? accent : T.gradient,
        }}
      />
      <div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "4px 10px",
            borderRadius: 999,
            background: info.kind === "merchant" ? T.infoBg : T.successBg,
            color: info.kind === "merchant" ? T.info : T.success,
            fontFamily: T.fontSans,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          <span
            aria-hidden
            style={{ width: 6, height: 6, borderRadius: 999, background: info.kind === "merchant" ? T.info : T.success }}
          />
          {info.eyebrow}
        </div>
        <h2
          style={{
            margin: 0,
            fontFamily: T.fontSerif,
            fontWeight: 600,
            fontSize: 32,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            color: T.textHeading,
          }}
        >
          {info.title}
        </h2>
        <p
          style={{
            margin: "16px 0 0",
            fontFamily: T.fontSans,
            fontSize: 16,
            lineHeight: 1.55,
            color: T.textBody,
          }}
        >
          {info.subtitle}
        </p>
      </div>

      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
        {info.capabilities.map((c) => (
          <li key={c.label} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span
              aria-hidden
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 20,
                height: 20,
                marginTop: 2,
                borderRadius: 999,
                background: info.kind === "merchant" ? T.infoBg : T.successBg,
                color: info.kind === "merchant" ? T.info : T.success,
                fontSize: 11,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              ✓
            </span>
            <div>
              <div
                style={{
                  fontFamily: T.fontSans,
                  fontSize: 15,
                  fontWeight: 600,
                  color: T.textHeading,
                }}
              >
                {c.label}
              </div>
              <div
                style={{
                  fontFamily: T.fontSans,
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: T.textBody,
                  marginTop: 2,
                }}
              >
                {c.note}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link
            href={info.ctaPrimary.href}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "12px 20px",
              borderRadius: 6,
              background: T.textHeading,
              color: T.white,
              textDecoration: "none",
              fontFamily: T.fontSans,
              fontSize: 15,
              fontWeight: 600,
              boxShadow: T.shadowSm,
              minWidth: 0,
            }}
          >
            {info.ctaPrimary.label}
          </Link>
          <Link
            href={info.ctaSecondary.href}
            style={{
              padding: "12px 20px",
              borderRadius: 6,
              background: T.white,
              color: T.textHeading,
              textDecoration: "none",
              fontFamily: T.fontSans,
              fontSize: 15,
              fontWeight: 500,
              border: `1px solid ${T.border}`,
            }}
          >
            {info.ctaSecondary.label}
          </Link>
        </div>
        <p
          style={{
            margin: 0,
            fontFamily: T.fontSans,
            fontSize: 13,
            color: T.textMuted,
            letterSpacing: "0.01em",
          }}
        >
          {info.proof}
        </p>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// UsedTogether — explains how the two products compose.
// ---------------------------------------------------------------------------
function UsedTogether() {
  return (
    <section
      style={{
        background: T.surface,
        borderTop: `1px solid ${T.border}`,
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 24px" }}>
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
            Used together
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
            The two products are one balance sheet.
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
            A merchant processing cards with ZeniPay can fund an Agents treasury from the
            same ledger. An agent paying a Zeniva Travel invoice settles into that
            merchant&rsquo;s payout account with zero network fees. No second contract,
            no reconciliation spreadsheet.
          </p>
        </div>

        <div
          className="flow-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr auto 1fr",
            gap: 16,
            alignItems: "stretch",
          }}
        >
          <FlowStep n="01" title="Merchant charges a customer" body="Customer pays the merchant via ZeniPay. Funds settle into the merchant&rsquo;s Finix ledger." accent={T.brandCyan} />
          <FlowArrow />
          <FlowStep n="02" title="Treasury funds the agents" body="Merchant routes a slice into the Agents treasury via a single API call. Zero external rails." accent={T.brandPurple} />
          <FlowArrow />
          <FlowStep n="03" title="Agents spend on ZeniCards" body="Each agent gets a closed-loop card. Spending auto-categorizes, auto-reports, auto-audits." accent={T.brandGreen} />
        </div>

        <style>{`
          @media (max-width: 900px) {
            .flow-grid { grid-template-columns: 1fr !important; }
            .flow-arrow { transform: rotate(90deg); justify-self: center; }
          }
        `}</style>
      </div>
    </section>
  );
}

function FlowStep({ n, title, body, accent }: { n: string; title: string; body: string; accent: string }) {
  return (
    <div
      style={{
        background: T.white,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span
          aria-hidden
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: 6,
            background: accent,
            color: T.white,
            fontFamily: T.fontMono,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {n}
        </span>
        <span
          style={{
            fontFamily: T.fontSans,
            fontSize: 11,
            fontWeight: 600,
            color: T.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Step {n}
        </span>
      </div>
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
        {title}
      </h3>
      <p
        style={{
          margin: 0,
          fontFamily: T.fontSans,
          fontSize: 14,
          lineHeight: 1.55,
          color: T.textBody,
        }}
        dangerouslySetInnerHTML={{ __html: body }}
      />
    </div>
  );
}

function FlowArrow() {
  return (
    <div
      aria-hidden
      className="flow-arrow"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: T.textSubtle,
        fontSize: 24,
        fontFamily: T.fontMono,
      }}
    >
      →
    </div>
  );
}

// ---------------------------------------------------------------------------
// CTA band
// ---------------------------------------------------------------------------
function CtaBand() {
  return (
    <section
      style={{
        padding: "80px 24px",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
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
          Start where you are. Scale into the other.
        </h2>
        <p
          style={{
            margin: "16px auto 32px",
            fontFamily: T.fontSans,
            fontSize: 17,
            lineHeight: 1.55,
            color: T.textBody,
            maxWidth: 560,
          }}
        >
          Merchants onboard in minutes. Agent fleets go through a briefing so we understand
          your risk profile. Both plug into the same treasury and the same audit trail.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
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
            Request access
          </Link>
          <Link
            href="/pricing"
            style={{
              padding: "14px 28px",
              borderRadius: 6,
              background: T.white,
              color: T.textHeading,
              textDecoration: "none",
              fontFamily: T.fontSans,
              fontSize: 16,
              fontWeight: 500,
              border: `1px solid ${T.border}`,
            }}
          >
            See pricing
          </Link>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------
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
        className="footer-grid"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1.2fr 3fr",
          gap: 48,
        }}
      >
        <div>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", color: T.textHeading }}>
            <BrandGlyph />
            <span style={{ fontFamily: T.fontSans, fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>ZeniPay</span>
          </Link>
          <p style={{ margin: "12px 0 0", maxWidth: 300, fontSize: 14, lineHeight: 1.5, color: T.textBody }}>
            Payment processing + banking infrastructure for businesses and AI agents.
            Built by ILM Inc. in Québec.
          </p>
          <div
            style={{
              marginTop: 16,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 12px",
              borderRadius: 999,
              background: T.successBg,
              color: T.success,
              fontFamily: T.fontSans,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: T.success }} />
            All systems operational
          </div>
        </div>

        <div
          className="footer-sections"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 24,
          }}
        >
          <FooterColumn
            title="Merchant"
            links={[
              { label: "Overview", href: "/merchant" },
              { label: "Dashboard", href: "/app/overview" },
              { label: "Pay links", href: "/paylinks" },
              { label: "Payouts", href: "/payouts" },
            ]}
          />
          <FooterColumn
            title="AI Agents"
            links={[
              { label: "Overview", href: "/agents/overview" },
              { label: "Dashboard", href: "/agents/dashboard" },
              { label: "Ledger", href: "/agents/ledger" },
              { label: "Security", href: "/security" },
            ]}
          />
          <FooterColumn
            title="Company"
            links={[
              { label: "Pricing",  href: "/pricing" },
              { label: "Contact",  href: "/contact" },
              { label: "Privacy",  href: "/legal/privacy" },
              { label: "Terms",    href: "/legal/terms" },
            ]}
          />
        </div>
      </div>

      <div
        style={{
          maxWidth: 1200,
          margin: "48px auto 0",
          paddingTop: 24,
          borderTop: `1px solid ${T.border}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <p style={{ margin: 0, fontSize: 12, color: T.textMuted, fontFamily: T.fontSans }}>
          © {new Date().getFullYear()} ILM Inc. ZeniPay is a trademark of ILM Inc.
        </p>
        <p style={{ margin: 0, fontSize: 12, color: T.textSubtle, fontFamily: T.fontMono }}>
          Built in Québec.
        </p>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .footer-grid { grid-template-columns: 1fr !important; }
          .footer-sections { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: Array<{ label: string; href: string }> }) {
  return (
    <div>
      <h4
        style={{
          margin: "0 0 12px",
          fontFamily: T.fontSans,
          fontSize: 12,
          fontWeight: 600,
          color: T.textMuted,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {title}
      </h4>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              style={{
                fontFamily: T.fontSans,
                fontSize: 14,
                fontWeight: 500,
                color: T.textBody,
                textDecoration: "none",
              }}
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
