// ZeniPay Agents — public landing page.
//
// Target audience: CFOs managing fleets of AI agents, investors evaluating
// ZeniPay Agents as infrastructure. The page lives at `/` (the domain's
// root); existing merchant-product marketing has moved to `/merchant`.
//
// A signed-in merchant user hitting `/` gets auto-redirected to their
// dashboard at `/app/overview` (detected via `sessionStorage.zp_client`,
// set by `/app/login`). Signed-in Agents users are NOT auto-redirected —
// they may intentionally navigate here to show the product to a prospect.

"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MarketingNav from "./components/MarketingNav";
import MarketingFooter from "./components/MarketingFooter";
import {
  color,
  gradientSignature,
  spacing,
  radius,
  shadow,
  font,
  fontSize,
  fontWeight,
  transition,
} from "@/lib/design-system/tokens";

export default function AgentsLandingPage() {
  const router = useRouter();

  // Auto-redirect signed-in merchant users to their dashboard — they didn't
  // mean to land on the marketing page.
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && sessionStorage.getItem("zp_client")) {
        router.replace("/app/overview");
      }
    } catch {
      /* private mode, ignore */
    }
  }, [router]);

  return (
    <div
      className="zp-root"
      style={{
        minHeight: "100vh",
        background: color.white,
        color: color.textBody,
        fontFamily: font.sans,
      }}
    >
      <MarketingNav active="product" />
      <Hero />
      <LogosStrip />
      <PillarsSection />
      <ScreenshotsSection />
      <PricingTeaser />
      <MarketingFooter />
    </div>
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
        padding: `${spacing[9]} ${spacing[5]} ${spacing[8]}`,
      }}
    >
      <div
        style={{
          maxWidth: 820,
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <AnnounceBadge />

        <h1
          style={{
            fontFamily: font.serif,
            fontWeight: fontWeight.semibold,
            fontSize: "clamp(44px, 7vw, 80px)",
            lineHeight: 1.05,
            letterSpacing: "-0.04em",
            color: color.textHeading,
            marginTop: spacing[5],
            marginBottom: spacing[5],
          }}
        >
          The bank for{" "}
          <span
            className="zp-gradient-text"
            style={{
              display: "inline-block",
              backgroundImage: gradientSignature,
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
            maxWidth: 620,
            margin: `${spacing[5]} auto 0`,
            fontFamily: font.sans,
            fontSize: fontSize.lg.size,
            lineHeight: fontSize.lg.line,
            color: color.textBody,
          }}
        >
          Issue virtual cards, fund treasury in seven currencies, auto-categorize
          every charge, and give your CFO a SOC2-grade audit trail. Purpose-built
          for teams running a fleet of autonomous agents.
        </p>

        <div
          style={{
            marginTop: spacing[6],
            display: "flex",
            gap: spacing[3],
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/contact"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: spacing[2],
              padding: `${spacing[3]} ${spacing[5]}`,
              borderRadius: radius.sm,
              background: color.textHeading,
              color: color.white,
              textDecoration: "none",
              fontFamily: font.sans,
              fontSize: fontSize.base.size,
              fontWeight: fontWeight.semibold,
              boxShadow: shadow.md,
              transition: transition.base,
            }}
          >
            Request access
            <span aria-hidden style={{ transform: "translateY(-0.5px)" }}>→</span>
          </Link>
          <Link
            href="/agents/login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: spacing[2],
              padding: `${spacing[3]} ${spacing[5]}`,
              borderRadius: radius.sm,
              background: color.white,
              color: color.textHeading,
              textDecoration: "none",
              border: `1px solid ${color.border}`,
              fontFamily: font.sans,
              fontSize: fontSize.base.size,
              fontWeight: fontWeight.medium,
              transition: transition.base,
            }}
          >
            View the platform
          </Link>
        </div>

        <p
          style={{
            marginTop: spacing[5],
            fontFamily: font.sans,
            fontSize: fontSize.xs.size,
            color: color.textSubtle,
            letterSpacing: "0.02em",
          }}
        >
          7 pillars live in production · SOC2 evidence exports available today
        </p>
      </div>

      <DashboardPreview />
    </section>
  );
}

function AnnounceBadge() {
  return (
    <Link
      href="/security"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: spacing[2],
        padding: `${spacing[1]} ${spacing[3]}`,
        borderRadius: radius.pill,
        background: color.white,
        border: `1px solid ${color.border}`,
        boxShadow: shadow.sm,
        fontFamily: font.sans,
        fontSize: fontSize.xs.size,
        fontWeight: fontWeight.medium,
        color: color.textBody,
        textDecoration: "none",
        transition: transition.base,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: radius.pill,
          background: color.success,
          boxShadow: `0 0 0 3px ${color.successBg}`,
        }}
      />
      New — Signed audit export with Merkle-root tamper evidence
      <span style={{ color: color.textMuted }}>→</span>
    </Link>
  );
}

/**
 * In-page browser-chrome mockup of the Agents dashboard. Pure HTML/CSS —
 * no screenshot, no external asset, renders crisply at any size.
 */
function DashboardPreview() {
  return (
    <div
      style={{
        maxWidth: 1080,
        margin: `${spacing[8]} auto 0`,
        borderRadius: radius.lg,
        border: `1px solid ${color.border}`,
        background: color.white,
        boxShadow: shadow.lg,
        overflow: "hidden",
      }}
    >
      <BrowserChrome url="zenipay.ca/agents/treasury" />
      <TreasuryPreview />
    </div>
  );
}

function BrowserChrome({ url }: { url: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: spacing[2],
        padding: `${spacing[2]} ${spacing[4]}`,
        background: color.surface,
        borderBottom: `1px solid ${color.border}`,
      }}
    >
      <div style={{ display: "flex", gap: 6 }}>
        <span style={{ width: 10, height: 10, borderRadius: radius.pill, background: "#e5e5e5" }} />
        <span style={{ width: 10, height: 10, borderRadius: radius.pill, background: "#e5e5e5" }} />
        <span style={{ width: 10, height: 10, borderRadius: radius.pill, background: "#e5e5e5" }} />
      </div>
      <div
        style={{
          marginLeft: spacing[3],
          padding: `4px ${spacing[3]}`,
          borderRadius: radius.sm,
          background: color.white,
          border: `1px solid ${color.border}`,
          fontFamily: font.mono,
          fontSize: fontSize.xs.size,
          color: color.textMuted,
        }}
      >
        {url}
      </div>
    </div>
  );
}

function TreasuryPreview() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "220px 1fr",
        minHeight: 420,
        background: color.white,
      }}
      className="treasury-preview-grid"
    >
      {/* Sidebar */}
      <aside
        style={{
          borderRight: `1px solid ${color.border}`,
          padding: spacing[4],
          background: color.white,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: spacing[2], marginBottom: spacing[5] }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: radius.sm,
              background: gradientSignature,
              color: color.white,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: fontWeight.black,
              fontSize: 13,
            }}
          >
            Z
          </div>
          <span
            style={{
              fontFamily: font.sans,
              fontWeight: fontWeight.bold,
              fontSize: fontSize.sm.size,
              color: color.textHeading,
            }}
          >
            ZeniPay Agents
          </span>
        </div>
        <PreviewNavItem label="Overview" icon="•" />
        <PreviewNavItem label="Treasury" icon="•" active />
        <PreviewNavItem label="Cards" icon="•" />
        <PreviewNavItem label="Approvals" icon="•" badge="3" />
        <PreviewNavItem label="Accounting" icon="•" />
        <PreviewNavItem label="Fraud" icon="•" />
        <PreviewNavItem label="Audit" icon="•" />
      </aside>

      {/* Content */}
      <main style={{ padding: spacing[5] }}>
        <div
          style={{
            fontFamily: font.sans,
            fontSize: fontSize.xs.size,
            color: color.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            fontWeight: fontWeight.semibold,
            marginBottom: spacing[2],
          }}
        >
          Treasury · USD
        </div>
        <div
          style={{
            fontFamily: font.sans,
            fontSize: fontSize.h3.size,
            lineHeight: fontSize.h3.line,
            letterSpacing: fontSize.h3.tracking,
            fontWeight: fontWeight.semibold,
            color: color.textHeading,
            marginBottom: spacing[5],
          }}
        >
          $2,485,210<span style={{ color: color.textMuted, fontWeight: fontWeight.medium }}>.43</span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: spacing[3],
            marginBottom: spacing[5],
          }}
        >
          <PreviewStat label="Agents" value="48" delta="+4" />
          <PreviewStat label="Cards live" value="126" delta="+12" />
          <PreviewStat label="Alerts · 24h" value="2" delta="−1" negative />
        </div>

        {/* Balance distribution table */}
        <div
          style={{
            border: `1px solid ${color.border}`,
            borderRadius: radius.md,
            background: color.white,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: `${spacing[3]} ${spacing[4]}`,
              borderBottom: `1px solid ${color.border}`,
              fontFamily: font.sans,
              fontSize: fontSize.xs.size,
              fontWeight: fontWeight.semibold,
              color: color.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>Wallet</span>
            <span>Balance</span>
          </div>
          {[
            { label: "USD primary", value: "$1,842,900.00" },
            { label: "EUR hedge", value: "€412,000.00" },
            { label: "GBP ops", value: "£94,250.00" },
            { label: "CAD reserves", value: "CA$220,600.00" },
          ].map((row) => (
            <div
              key={row.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: `${spacing[3]} ${spacing[4]}`,
                borderBottom: `1px solid ${color.border}`,
                fontFamily: font.sans,
                fontSize: fontSize.sm.size,
                color: color.textBody,
              }}
            >
              <span>{row.label}</span>
              <span
                style={{
                  fontFamily: font.mono,
                  color: color.textHeading,
                  fontWeight: fontWeight.medium,
                }}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </main>

      <style>{`
        @media (max-width: 768px) {
          .treasury-preview-grid { grid-template-columns: 1fr !important; }
          .treasury-preview-grid aside { display: none; }
        }
      `}</style>
    </div>
  );
}

function PreviewNavItem({
  label,
  icon,
  active,
  badge,
}: {
  label: string;
  icon: string;
  active?: boolean;
  badge?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: `${spacing[2]} ${spacing[3]}`,
        marginBottom: spacing[1],
        borderRadius: radius.sm,
        background: active ? color.surface : "transparent",
        color: active ? color.textHeading : color.textBody,
        fontFamily: font.sans,
        fontSize: fontSize.sm.size,
        fontWeight: active ? fontWeight.semibold : fontWeight.medium,
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: spacing[2] }}>
        <span style={{ color: color.textSubtle }}>{icon}</span>
        {label}
      </span>
      {badge && (
        <span
          style={{
            padding: "1px 6px",
            borderRadius: radius.pill,
            background: color.danger,
            color: color.white,
            fontSize: 10,
            fontWeight: fontWeight.bold,
          }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

function PreviewStat({
  label,
  value,
  delta,
  negative,
}: {
  label: string;
  value: string;
  delta: string;
  negative?: boolean;
}) {
  return (
    <div
      style={{
        border: `1px solid ${color.border}`,
        borderRadius: radius.md,
        padding: spacing[3],
      }}
    >
      <div
        style={{
          fontFamily: font.sans,
          fontSize: fontSize.xs.size,
          color: color.textMuted,
          fontWeight: fontWeight.semibold,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          marginBottom: spacing[1],
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: spacing[2] }}>
        <span
          style={{
            fontFamily: font.sans,
            fontSize: fontSize.h5.size,
            fontWeight: fontWeight.semibold,
            color: color.textHeading,
          }}
        >
          {value}
        </span>
        <span
          style={{
            fontFamily: font.sans,
            fontSize: fontSize.xs.size,
            color: negative ? color.danger : color.success,
            fontWeight: fontWeight.semibold,
          }}
        >
          {delta}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Logos strip — placeholder brands row. Stripe does a "used by N teams"
// strip; we're pre-launch so we use an attribute-based strip instead:
// payment rails + compliance + integrations.
// ---------------------------------------------------------------------------
function LogosStrip() {
  const items = [
    { label: "Visa + Mastercard" },
    { label: "Stripe Issuing" },
    { label: "Supabase Vault" },
    { label: "SOC2 Type II target" },
    { label: "Ed25519 signed audit" },
  ];
  return (
    <section
      style={{
        padding: `${spacing[5]} ${spacing[5]} ${spacing[6]}`,
        borderBottom: `1px solid ${color.border}`,
        background: color.white,
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
          gap: spacing[5],
          flexWrap: "wrap",
        }}
      >
        {items.map((i) => (
          <div
            key={i.label}
            style={{
              fontFamily: font.sans,
              fontSize: fontSize.sm.size,
              fontWeight: fontWeight.semibold,
              color: color.textMuted,
              letterSpacing: "-0.01em",
            }}
          >
            {i.label}
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Pillars — 7 live (from PR 1-5) + 1 "more coming" card with roadmap.
// ---------------------------------------------------------------------------
interface Pillar {
  number: string;
  title: string;
  tagline: string;
  description: string;
  tint: string;
}

const PILLARS: Pillar[] = [
  {
    number: "01",
    title: "Virtual cards",
    tagline: "Issue in seconds.",
    description: "Every agent gets its own Visa/Mastercard backed by Stripe Issuing with per-merchant and per-category spending policies.",
    tint: color.brandGreen,
  },
  {
    number: "02",
    title: "Multi-currency treasury",
    tagline: "Seven currencies, one ledger.",
    description: "USD, EUR, GBP, CAD, AUD, SGD, JPY. FX converted at settle-time so historical reports never drift.",
    tint: color.brandCyan,
  },
  {
    number: "03",
    title: "Expense categorization",
    tagline: "Your CFO's GL, automatically.",
    description: "41-MCC default catalog, org-level overrides, auto-booked to the right account within 15 minutes of settlement.",
    tint: color.brandPurple,
  },
  {
    number: "04",
    title: "Approval workflows",
    tagline: "TOTP-gated, policy-driven.",
    description: "Spend thresholds route to human approvers with Google-Authenticator-compatible step-up. Dual-control built in.",
    tint: color.info,
  },
  {
    number: "07",
    title: "Fraud ML",
    tagline: "Z-scored 24/7.",
    description: "Welford baseline across three scopes. Alerts above 3σ, auto-pause card above 6σ. Real-time, not batched.",
    tint: color.warn,
  },
  {
    number: "09",
    title: "SOC2 audit export",
    tagline: "Ed25519-signed, tamper-evident.",
    description: "Streamed NDJSON with per-row Merkle proofs. Auditors verify offline against our published public key.",
    tint: color.success,
  },
];

function PillarsSection() {
  return (
    <section
      id="platform"
      style={{
        padding: `${spacing[10]} ${spacing[5]}`,
        background: color.surface,
        borderTop: `1px solid ${color.border}`,
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ maxWidth: 640, marginBottom: spacing[8] }}>
          <div
            style={{
              fontFamily: font.sans,
              fontSize: fontSize.xs.size,
              fontWeight: fontWeight.semibold,
              color: color.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: spacing[3],
            }}
          >
            The platform
          </div>
          <h2
            style={{
              fontFamily: font.serif,
              fontSize: fontSize.h2.size,
              lineHeight: fontSize.h2.line,
              letterSpacing: fontSize.h2.tracking,
              fontWeight: fontWeight.semibold,
              color: color.textHeading,
              margin: 0,
            }}
          >
            Six pillars live in production.
            <br />
            <span style={{ color: color.textMuted }}>Four more on the roadmap.</span>
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: spacing[4],
          }}
        >
          {PILLARS.map((p) => (
            <PillarCard key={p.number} pillar={p} />
          ))}
          <MorePillarsCard />
        </div>
      </div>
    </section>
  );
}

function PillarCard({ pillar }: { pillar: Pillar }) {
  return (
    <div
      style={{
        background: color.white,
        border: `1px solid ${color.border}`,
        borderRadius: radius.md,
        padding: spacing[5],
        transition: transition.base,
        display: "flex",
        flexDirection: "column",
        gap: spacing[3],
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span
          style={{
            fontFamily: font.mono,
            fontSize: fontSize.xs.size,
            fontWeight: fontWeight.semibold,
            color: color.textSubtle,
            letterSpacing: "0.04em",
          }}
        >
          Pillar {pillar.number}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontFamily: font.sans,
            fontSize: fontSize.xs.size,
            fontWeight: fontWeight.semibold,
            color: color.success,
          }}
        >
          <span
            aria-hidden
            style={{ width: 6, height: 6, borderRadius: radius.pill, background: color.success }}
          />
          Live
        </span>
      </div>
      <div
        style={{
          width: 32,
          height: 2,
          background: pillar.tint,
          borderRadius: radius.pill,
        }}
      />
      <h3
        style={{
          fontFamily: font.sans,
          fontSize: fontSize.h5.size,
          lineHeight: fontSize.h5.line,
          letterSpacing: fontSize.h5.tracking,
          fontWeight: fontWeight.semibold,
          color: color.textHeading,
          margin: 0,
        }}
      >
        {pillar.title}
      </h3>
      <div
        style={{
          fontFamily: font.sans,
          fontSize: fontSize.sm.size,
          fontWeight: fontWeight.semibold,
          color: color.textHeading,
        }}
      >
        {pillar.tagline}
      </div>
      <p
        style={{
          margin: 0,
          fontFamily: font.sans,
          fontSize: fontSize.sm.size,
          lineHeight: fontSize.sm.line,
          color: color.textBody,
        }}
      >
        {pillar.description}
      </p>
    </div>
  );
}

function MorePillarsCard() {
  const remaining = [
    { n: "05", label: "Unified agent + human wallets" },
    { n: "06", label: "Credit lines" },
    { n: "08", label: "AP-Bot bill pay" },
    { n: "10", label: "Issuing-as-a-Service public API" },
  ];
  return (
    <div
      style={{
        background: gradientSignature,
        borderRadius: radius.md,
        padding: spacing[5],
        display: "flex",
        flexDirection: "column",
        gap: spacing[3],
        color: color.white,
      }}
    >
      <div
        style={{
          fontFamily: font.sans,
          fontSize: fontSize.xs.size,
          fontWeight: fontWeight.semibold,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          opacity: 0.85,
        }}
      >
        On the roadmap
      </div>
      <h3
        style={{
          fontFamily: font.serif,
          fontSize: fontSize.h5.size,
          lineHeight: fontSize.h5.line,
          letterSpacing: fontSize.h5.tracking,
          fontWeight: fontWeight.semibold,
          margin: 0,
        }}
      >
        Four more pillars shipping soon.
      </h3>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: spacing[2] }}>
        {remaining.map((r) => (
          <li
            key={r.n}
            style={{
              display: "flex",
              alignItems: "center",
              gap: spacing[3],
              fontFamily: font.sans,
              fontSize: fontSize.sm.size,
            }}
          >
            <span
              style={{
                fontFamily: font.mono,
                fontSize: fontSize.xs.size,
                fontWeight: fontWeight.semibold,
                opacity: 0.9,
              }}
            >
              {r.n}
            </span>
            <span>{r.label}</span>
          </li>
        ))}
      </ul>
      <Link
        href="/contact"
        style={{
          alignSelf: "flex-start",
          marginTop: spacing[2],
          display: "inline-flex",
          alignItems: "center",
          gap: spacing[2],
          padding: `${spacing[2]} ${spacing[3]}`,
          borderRadius: radius.sm,
          background: "rgba(255, 255, 255, 0.15)",
          color: color.white,
          fontFamily: font.sans,
          fontSize: fontSize.sm.size,
          fontWeight: fontWeight.semibold,
          textDecoration: "none",
          border: `1px solid rgba(255, 255, 255, 0.25)`,
        }}
      >
        Get early access →
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Product screenshots — three dashboard mockups: Cards, Fraud, Audit.
// Pure HTML/CSS, same style family as the hero treasury preview.
// ---------------------------------------------------------------------------
function ScreenshotsSection() {
  return (
    <section
      style={{
        padding: `${spacing[10]} ${spacing[5]}`,
        background: color.white,
        borderTop: `1px solid ${color.border}`,
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ maxWidth: 640, marginBottom: spacing[8] }}>
          <div
            style={{
              fontFamily: font.sans,
              fontSize: fontSize.xs.size,
              fontWeight: fontWeight.semibold,
              color: color.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: spacing[3],
            }}
          >
            Inside the dashboard
          </div>
          <h2
            style={{
              fontFamily: font.serif,
              fontSize: fontSize.h2.size,
              lineHeight: fontSize.h2.line,
              letterSpacing: fontSize.h2.tracking,
              fontWeight: fontWeight.semibold,
              color: color.textHeading,
              margin: 0,
            }}
          >
            Everything a CFO needs to sleep at night.
          </h2>
        </div>

        <div style={{ display: "grid", gap: spacing[5] }}>
          <ShotRow
            title="Issue a virtual card in seconds."
            body="One primary beneficiary, per-merchant policies, per-category caps, off-hours blocking. Every card routes through your treasury balance — no separate float to reconcile."
            screenshot={<CardsMockup />}
            reversed={false}
          />
          <ShotRow
            title="Anomalies caught within the hour."
            body="The fraud cron runs every 15 minutes. A 3σ spike on daily spend or an unusual-merchant-count surge surfaces as an alert. Mark as confirmed — we pause the card atomically."
            screenshot={<FraudMockup />}
            reversed={true}
          />
          <ShotRow
            title="One signed export. Every audit."
            body="SOC2 auditors download a streamed NDJSON with a Merkle-rooted signature. They verify offline using our Ed25519 public key, published at /.well-known/."
            screenshot={<AuditMockup />}
            reversed={false}
          />
        </div>
      </div>
    </section>
  );
}

function ShotRow({
  title,
  body,
  screenshot,
  reversed,
}: {
  title: string;
  body: string;
  screenshot: React.ReactNode;
  reversed: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1.2fr",
        gap: spacing[6],
        alignItems: "center",
      }}
      className={`shot-row ${reversed ? "shot-row-reverse" : ""}`}
    >
      <div
        style={{
          gridColumn: reversed ? 2 : 1,
          gridRow: 1,
        }}
        className="shot-row-text"
      >
        <h3
          style={{
            fontFamily: font.serif,
            fontSize: fontSize.h4.size,
            lineHeight: fontSize.h4.line,
            letterSpacing: fontSize.h4.tracking,
            fontWeight: fontWeight.semibold,
            color: color.textHeading,
            margin: 0,
            marginBottom: spacing[3],
          }}
        >
          {title}
        </h3>
        <p
          style={{
            margin: 0,
            fontFamily: font.sans,
            fontSize: fontSize.base.size,
            lineHeight: fontSize.base.line,
            color: color.textBody,
          }}
        >
          {body}
        </p>
      </div>
      <div
        style={{
          gridColumn: reversed ? 1 : 2,
          gridRow: 1,
          borderRadius: radius.lg,
          border: `1px solid ${color.border}`,
          overflow: "hidden",
          boxShadow: shadow.md,
          background: color.white,
        }}
        className="shot-row-image"
      >
        {screenshot}
      </div>

      <style>{`
        @media (max-width: 900px) {
          .shot-row { grid-template-columns: 1fr !important; }
          .shot-row .shot-row-text,
          .shot-row .shot-row-image { grid-column: 1 !important; }
          .shot-row .shot-row-image { grid-row: 2 !important; }
        }
      `}</style>
    </div>
  );
}

function CardsMockup() {
  return (
    <div style={{ background: color.surface, padding: spacing[4] }}>
      <BrowserChrome url="zenipay.ca/agents/cards" />
      <div style={{ background: color.white, padding: spacing[4] }}>
        <div
          style={{
            fontFamily: font.sans,
            fontSize: fontSize.xs.size,
            color: color.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            fontWeight: fontWeight.semibold,
            marginBottom: spacing[3],
          }}
        >
          Cards · 126 live
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: spacing[3] }}>
          {[
            { name: "gpt-marketing", last4: "4242", limit: "$2,500 / mo", tint: color.brandGreen },
            { name: "claude-research", last4: "7891", limit: "$10,000 / mo", tint: color.brandCyan },
            { name: "ops-bot-ci", last4: "1203", limit: "$500 / mo", tint: color.brandPurple },
          ].map((c) => (
            <div
              key={c.name}
              style={{
                background: gradientSignature,
                borderRadius: radius.md,
                padding: spacing[3],
                color: color.white,
                minHeight: 120,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: fontSize.xs.size,
                    fontWeight: fontWeight.semibold,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    opacity: 0.85,
                  }}
                >
                  ZeniCard Agents · Virtual
                </div>
              </div>
              <div>
                <div style={{ fontFamily: font.mono, fontSize: 15, letterSpacing: 2, opacity: 0.95 }}>
                  •••• •••• •••• {c.last4}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 6,
                    fontSize: 11,
                    opacity: 0.9,
                  }}
                >
                  <span>{c.name}</span>
                  <span>{c.limit}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FraudMockup() {
  const alerts = [
    {
      sev: "critical",
      color: color.danger,
      metric: "daily_spend_cents",
      z: "7.82σ",
      scope: "card crd_a3f…",
      when: "2m ago",
    },
    {
      sev: "warn",
      color: color.warn,
      metric: "auth_count_1h",
      z: "4.21σ",
      scope: "card crd_91c…",
      when: "18m ago",
    },
    {
      sev: "info",
      color: color.textMuted,
      metric: "distinct_merchants_24h",
      z: "3.02σ",
      scope: "agent agt_77…",
      when: "1h ago",
    },
  ];
  return (
    <div style={{ background: color.surface, padding: spacing[4] }}>
      <BrowserChrome url="zenipay.ca/agents/fraud" />
      <div style={{ background: color.white, padding: spacing[4] }}>
        <div
          style={{
            fontFamily: font.sans,
            fontSize: fontSize.xs.size,
            color: color.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            fontWeight: fontWeight.semibold,
            marginBottom: spacing[3],
          }}
        >
          Fraud alerts · 2 open
        </div>
        <div style={{ display: "grid", gap: spacing[2] }}>
          {alerts.map((a) => (
            <div
              key={a.metric + a.when}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: `${spacing[3]} ${spacing[4]}`,
                borderRadius: radius.md,
                border: `1px solid ${color.border}`,
                borderLeft: `4px solid ${a.color}`,
                background: color.white,
              }}
            >
              <div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: spacing[2],
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: fontWeight.bold,
                      color: a.color,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {a.sev}
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: font.sans,
                    fontSize: fontSize.sm.size,
                    fontWeight: fontWeight.semibold,
                    color: color.textHeading,
                  }}
                >
                  {a.metric}
                </div>
                <div
                  style={{
                    fontFamily: font.mono,
                    fontSize: fontSize.xs.size,
                    color: color.textMuted,
                  }}
                >
                  {a.scope}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontFamily: font.sans,
                    fontSize: fontSize.h5.size,
                    fontWeight: fontWeight.semibold,
                    color: a.color,
                  }}
                >
                  {a.z}
                </div>
                <div
                  style={{
                    fontFamily: font.sans,
                    fontSize: fontSize.xs.size,
                    color: color.textMuted,
                  }}
                >
                  {a.when}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AuditMockup() {
  return (
    <div style={{ background: color.surface, padding: spacing[4] }}>
      <BrowserChrome url="zenipay.ca/agents/audit" />
      <div style={{ background: color.white, padding: spacing[4] }}>
        <div
          style={{
            fontFamily: font.sans,
            fontSize: fontSize.xs.size,
            color: color.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            fontWeight: fontWeight.semibold,
            marginBottom: spacing[3],
          }}
        >
          Audit export · Q1 2026
        </div>
        <div
          style={{
            border: `1px solid ${color.border}`,
            borderRadius: radius.md,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: `${spacing[3]} ${spacing[4]}`,
              background: color.surface,
              borderBottom: `1px solid ${color.border}`,
              display: "flex",
              justifyContent: "space-between",
              fontFamily: font.sans,
              fontSize: fontSize.xs.size,
              color: color.textMuted,
              fontWeight: fontWeight.semibold,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            <span>Entry</span>
            <span>Merkle root</span>
          </div>
          {[
            { id: "aud_4f2a…", ev: "card.issued", root: "3b7c…a9" },
            { id: "aud_9d11…", ev: "approval.resolved", root: "e1f4…02" },
            { id: "aud_c23e…", ev: "fraud_alert.raised", root: "7a2b…c8" },
            { id: "aud_21b9…", ev: "expense_report.finalized", root: "9f0d…14" },
          ].map((r) => (
            <div
              key={r.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1.3fr auto",
                gap: spacing[3],
                padding: `${spacing[3]} ${spacing[4]}`,
                borderBottom: `1px solid ${color.border}`,
                fontFamily: font.sans,
                fontSize: fontSize.sm.size,
                alignItems: "center",
              }}
            >
              <span style={{ fontFamily: font.mono, color: color.textSubtle }}>{r.id}</span>
              <span style={{ color: color.textHeading }}>{r.ev}</span>
              <span style={{ fontFamily: font.mono, color: color.textMuted }}>{r.root}</span>
            </div>
          ))}
          <div
            style={{
              padding: `${spacing[3]} ${spacing[4]}`,
              background: color.successBg,
              color: color.success,
              fontFamily: font.sans,
              fontSize: fontSize.xs.size,
              fontWeight: fontWeight.semibold,
              display: "flex",
              alignItems: "center",
              gap: spacing[2],
            }}
          >
            <span aria-hidden>✓</span>
            Ed25519 signature verified against zp_audit_v1 public key
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pricing teaser
// ---------------------------------------------------------------------------
function PricingTeaser() {
  return (
    <section
      style={{
        padding: `${spacing[10]} ${spacing[5]}`,
        background: color.surface,
        borderTop: `1px solid ${color.border}`,
      }}
    >
      <div
        style={{
          maxWidth: 920,
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: font.sans,
            fontSize: fontSize.xs.size,
            fontWeight: fontWeight.semibold,
            color: color.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: spacing[3],
          }}
        >
          Pricing
        </div>
        <h2
          style={{
            fontFamily: font.serif,
            fontSize: fontSize.h2.size,
            lineHeight: fontSize.h2.line,
            letterSpacing: fontSize.h2.tracking,
            fontWeight: fontWeight.semibold,
            color: color.textHeading,
            margin: 0,
            marginBottom: spacing[4],
          }}
        >
          Enterprise pricing, sized to your fleet.
        </h2>
        <p
          style={{
            maxWidth: 640,
            margin: `0 auto ${spacing[6]}`,
            fontFamily: font.sans,
            fontSize: fontSize.lg.size,
            lineHeight: fontSize.lg.line,
            color: color.textBody,
          }}
        >
          A transparent platform fee per live card, a small FX spread on non-USD
          settlement, zero charge on the dashboards your team actually uses.
          Startups under ten agents pay nothing for the first six months.
        </p>
        <div
          style={{
            display: "flex",
            gap: spacing[3],
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/pricing"
            style={{
              padding: `${spacing[3]} ${spacing[5]}`,
              borderRadius: radius.sm,
              background: color.textHeading,
              color: color.white,
              textDecoration: "none",
              fontFamily: font.sans,
              fontSize: fontSize.base.size,
              fontWeight: fontWeight.semibold,
              boxShadow: shadow.md,
            }}
          >
            See pricing details
          </Link>
          <Link
            href="/contact"
            style={{
              padding: `${spacing[3]} ${spacing[5]}`,
              borderRadius: radius.sm,
              background: color.white,
              color: color.textHeading,
              textDecoration: "none",
              border: `1px solid ${color.border}`,
              fontFamily: font.sans,
              fontSize: fontSize.base.size,
              fontWeight: fontWeight.medium,
            }}
          >
            Talk to us
          </Link>
        </div>
      </div>
    </section>
  );
}
