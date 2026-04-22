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
      <PlatformStripPlaceholder />
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

// Commit 2.2 will replace this with: pillars + product screenshots + pricing
// teaser + footer. Leaving a structural placeholder so the page renders
// cleanly on Commit 2.1's preview.
function PlatformStripPlaceholder() {
  return (
    <section
      id="platform"
      style={{
        padding: `${spacing[9]} ${spacing[5]}`,
        borderTop: `1px solid ${color.border}`,
        background: color.surface,
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontFamily: font.sans,
          fontSize: fontSize.sm.size,
          color: color.textMuted,
          margin: 0,
        }}
      >
        Platform highlights, pillars, and pricing coming on the next deploy.
      </p>
    </section>
  );
}
