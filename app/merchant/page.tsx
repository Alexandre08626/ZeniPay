// /merchant — dedicated ZeniPay Merchant marketing page.
//
// Stripe-level polish for the revenue-generating Finix-backed product. Replaces
// the dark-mode legacy landing that was moved here in Phase 2.1. Same
// SELF-CONTAINED constraint as the 2-products root: no @/components imports,
// inline styles only, only next/link + next/navigation. Fonts flow via
// globals.css CSS vars loaded in layout.tsx.

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

export default function MerchantLanding() {
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
      <Stats />
      <Capabilities />
      <DashboardPreview />
      <Industries />
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
              color: T.info,
              background: T.infoBg,
              padding: "2px 8px",
              borderRadius: 999,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Merchant
          </span>
        </Link>

        <nav className="merchant-nav-links" style={{ display: "none", alignItems: "center", gap: 24 }}>
          <Link href="/merchant" style={{ ...navLinkStyle, color: T.textHeading, fontWeight: 600 }}>Merchant</Link>
          <Link href="/agents/overview" style={navLinkStyle}>AI Agents</Link>
          <Link href="/pricing" style={navLinkStyle}>Pricing</Link>
          <Link href="/security" style={navLinkStyle}>Security</Link>
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/login" style={{ ...navLinkStyle, padding: "8px 12px" }}>Sign in</Link>
          <Link
            href="/signup"
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
            Get started
          </Link>
        </div>
      </div>
      <style>{`
        @media (min-width: 768px) {
          .merchant-nav-links { display: flex !important; }
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
      <h1
        style={{
          margin: 0,
          fontFamily: T.fontSerif,
          fontSize: "clamp(44px, 7vw, 72px)",
          lineHeight: 1.05,
          letterSpacing: "-0.04em",
          fontWeight: 600,
          color: T.textHeading,
        }}
      >
        Accept payments.
        <br />
        <span
          style={{
            backgroundImage: `linear-gradient(135deg, ${T.brandCyan} 0%, ${T.brandPurple} 100%)`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          Move money.
        </span>{" "}
        Grow.
      </h1>
      <p
        style={{
          margin: "24px auto 0",
          maxWidth: 620,
          fontFamily: T.fontSans,
          fontSize: 19,
          lineHeight: 1.55,
          color: T.textBody,
        }}
      >
        ZeniPay Merchant is production-ready payment infrastructure for Canadian and
        American businesses. Cards, ACH, instant payouts, invoicing, pay links — all on
        one dashboard, with Finix-backed processing under the hood.
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
          href="/signup"
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
          Start accepting payments
          <span aria-hidden>→</span>
        </Link>
        <Link
          href="/app/overview"
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
          Open the dashboard
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
        Live in production · PCI DSS Level 1 · Finix-powered processor
      </p>
    </section>
  );
}

function Stats() {
  const stats = [
    { num: "99.99%", label: "Uptime target" },
    { num: "<200ms", label: "Processing latency" },
    { num: "135+",   label: "Currencies supported" },
    { num: "0 days", label: "Hold period on payouts" },
    { num: "PCI L1", label: "Compliance" },
  ];
  return (
    <section
      style={{
        padding: "32px 24px 48px",
        borderTop: `1px solid ${T.border}`,
        borderBottom: `1px solid ${T.border}`,
        background: T.surface,
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 24,
          textAlign: "center",
        }}
      >
        {stats.map((s) => (
          <div key={s.label}>
            <div
              style={{
                fontFamily: T.fontSans,
                fontSize: 28,
                lineHeight: 1.1,
                fontWeight: 700,
                color: T.textHeading,
                letterSpacing: "-0.02em",
              }}
            >
              {s.num}
            </div>
            <div
              style={{
                marginTop: 4,
                fontFamily: T.fontSans,
                fontSize: 13,
                color: T.textMuted,
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Capabilities() {
  const items = [
    { title: "Accept cards + ACH",  body: "Visa, Mastercard, Amex, debit + ACH bank transfers. Tokenized with Finix.js; PANs never touch your servers." },
    { title: "Instant payouts",     body: "RTP / FedNow / ACH / wire. Pay employees, contractors, suppliers in minutes, not days." },
    { title: "Pay links + QR",      body: "Generate a hosted checkout link or QR in seconds. Track status per customer." },
    { title: "Invoicing",           body: "Branded invoices with automated reminders. Customer pays online, funds settle directly." },
    { title: "Multi-wallet",        body: "Segregate customer funds, reserves, operating capital, and payouts. One dashboard, many balances." },
    { title: "Real-time analytics", body: "Volume, auth rates, decline reasons, refund velocity — by merchant, product, or timeframe." },
    { title: "Refunds + disputes",  body: "One-click refunds. Dispute evidence collection. Chargeback defense baked in." },
    { title: "Developer API",       body: "REST + webhooks. Idempotency keys, signed payloads, OpenAPI spec. Fits into your stack." },
  ];

  return (
    <section style={{ padding: "80px 24px" }}>
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
            Capabilities
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
            One dashboard for every money movement your business makes.
          </h2>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          {items.map((i) => (
            <article
              key={i.title}
              style={{
                background: T.white,
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                padding: 20,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontFamily: T.fontSans,
                  fontSize: 16,
                  fontWeight: 600,
                  color: T.textHeading,
                }}
              >
                {i.title}
              </h3>
              <p
                style={{
                  margin: "8px 0 0",
                  fontFamily: T.fontSans,
                  fontSize: 14,
                  lineHeight: 1.55,
                  color: T.textBody,
                }}
              >
                {i.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function DashboardPreview() {
  return (
    <section
      style={{
        background: T.surface,
        borderTop: `1px solid ${T.border}`,
        borderBottom: `1px solid ${T.border}`,
        padding: "80px 24px",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div
          className="preview-grid"
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
              Inside the dashboard
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
              Every transaction. Every payout. Every dispute. One view.
            </h2>
            <p
              style={{
                margin: "16px 0 24px",
                fontFamily: T.fontSans,
                fontSize: 16,
                lineHeight: 1.55,
                color: T.textBody,
              }}
            >
              Drill down per customer, per day, per product. Export to QuickBooks or Xero with
              one click. Your CFO sleeps at night.
            </p>
            <Link
              href="/app/overview"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
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
              Open the dashboard
              <span aria-hidden>→</span>
            </Link>
          </div>

          <DashboardMock />
        </div>

        <style>{`
          @media (max-width: 900px) {
            .preview-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    </section>
  );
}

function DashboardMock() {
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
      <BrowserChrome url="zenipay.ca/app/overview" />
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
          Net volume · Last 30 days
        </div>
        <div
          style={{
            fontFamily: T.fontSans,
            fontSize: 32,
            fontWeight: 700,
            color: T.textHeading,
            letterSpacing: "-0.03em",
          }}
        >
          $284,942<span style={{ color: T.textMuted, fontWeight: 500 }}>.18</span>
        </div>
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 4,
            fontFamily: T.fontSans,
            fontSize: 12,
            color: T.textMuted,
          }}
        >
          <span style={{ color: T.success, fontWeight: 600 }}>↑ 18.4% vs prior</span>
          <span>·</span>
          <span>1,286 transactions</span>
        </div>

        <div
          style={{
            marginTop: 20,
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
          }}
        >
          <MockStat label="Auth rate"      value="98.2%"   delta="+0.4" />
          <MockStat label="Avg. ticket"    value="$221.56" delta="+$12" />
          <MockStat label="Refund ratio"   value="0.9%"    delta="−0.1" negative />
        </div>

        <div
          style={{
            marginTop: 20,
            border: `1px solid ${T.border}`,
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.3fr 1fr auto",
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
            <span>Customer</span>
            <span>Method</span>
            <span>Amount</span>
          </div>
          {[
            { c: "Dubois Imports",    m: "Visa •••• 4242",     a: "$1,248.00", when: "2m ago" },
            { c: "Montréal Café Co.", m: "ACH",                 a: "$312.50",   when: "14m ago" },
            { c: "Lachine Logistics", m: "Mastercard •• 1203",  a: "$4,902.12", when: "1h ago" },
            { c: "Laval Design LLC",  m: "Visa •• 7891",        a: "$199.99",   when: "3h ago" },
          ].map((r) => (
            <div
              key={r.c + r.when}
              style={{
                display: "grid",
                gridTemplateColumns: "1.3fr 1fr auto",
                padding: "10px 12px",
                borderBottom: `1px solid ${T.border}`,
                fontFamily: T.fontSans,
                fontSize: 13,
                color: T.textBody,
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ color: T.textHeading, fontWeight: 600 }}>{r.c}</div>
                <div style={{ fontSize: 11, color: T.textMuted }}>{r.when}</div>
              </div>
              <span style={{ fontFamily: T.fontMono, fontSize: 12, color: T.textBody }}>{r.m}</span>
              <span style={{ fontFamily: T.fontMono, fontWeight: 600, color: T.textHeading }}>{r.a}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MockStat({ label, value, delta, negative }: { label: string; value: string; delta: string; negative?: boolean }) {
  return (
    <div
      style={{
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        padding: 12,
        background: T.white,
      }}
    >
      <div
        style={{
          fontFamily: T.fontSans,
          fontSize: 11,
          fontWeight: 600,
          color: T.textMuted,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
        <span style={{ fontFamily: T.fontSans, fontSize: 18, fontWeight: 600, color: T.textHeading }}>
          {value}
        </span>
        <span
          style={{
            fontFamily: T.fontSans,
            fontSize: 11,
            fontWeight: 600,
            color: negative ? "#dc2626" : T.success,
          }}
        >
          {delta}
        </span>
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

function Industries() {
  const items = [
    { name: "Travel & hospitality",  line: "Complex itineraries, multi-party payouts, long booking windows." },
    { name: "Professional services", line: "Invoicing, retainer billing, milestone-based releases." },
    { name: "E-commerce",            line: "High-volume auth, PCI tokenization, international checkout." },
    { name: "Marketplaces",          line: "Split payments, contributor payouts, managed liability." },
  ];
  return (
    <section style={{ padding: "80px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ maxWidth: 600, marginBottom: 40 }}>
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
            Who it&rsquo;s for
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
            Built for businesses who need payments, not a platform demo.
          </h2>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
          }}
        >
          {items.map((i) => (
            <div
              key={i.name}
              style={{
                background: T.white,
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                padding: 20,
              }}
            >
              <h3 style={{ margin: 0, fontFamily: T.fontSans, fontSize: 15, fontWeight: 600, color: T.textHeading }}>
                {i.name}
              </h3>
              <p style={{ margin: "6px 0 0", fontFamily: T.fontSans, fontSize: 14, lineHeight: 1.5, color: T.textBody }}>
                {i.line}
              </p>
            </div>
          ))}
        </div>
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
        borderBottom: `1px solid ${T.border}`,
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
          Start accepting payments in minutes.
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
          Fill out the onboarding flow, connect your bank account, start taking cards
          the same day. Competitive per-transaction pricing. No monthly minimums.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/signup"
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
            Get started
          </Link>
          <Link
            href="/pricing"
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
            See pricing
          </Link>
        </div>
      </div>
    </section>
  );
}

function FooterBar() {
  return (
    <footer style={{ background: T.white, padding: "48px 24px 32px" }}>
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
          <Link href="/agents/overview" style={footerLink}>AI Agents</Link>
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
