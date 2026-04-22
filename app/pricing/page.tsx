// /pricing — public pricing overview for the Agents product.
// Teaser copy, not a detailed per-seat calculator. Investor-ready.

"use client";

import Link from "next/link";
import MarketingShell from "../components/MarketingShell";
import {
  color, gradientSignature, spacing, radius, shadow,
  font, fontSize, fontWeight,
} from "@/lib/design-system/tokens";

export default function PricingPage() {
  return (
    <MarketingShell active="pricing">
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: `${spacing[9]} ${spacing[5]} ${spacing[6]}` }}>
        <div style={{ maxWidth: 720 }}>
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
          <h1
            style={{
              fontFamily: font.serif,
              fontSize: "clamp(40px, 6vw, 64px)",
              lineHeight: 1.08,
              letterSpacing: "-0.04em",
              fontWeight: fontWeight.semibold,
              color: color.textHeading,
              margin: 0,
            }}
          >
            Usage-based.{" "}
            <span style={{ color: color.textMuted }}>Predictable. Transparent.</span>
          </h1>
          <p
            style={{
              marginTop: spacing[5],
              fontFamily: font.sans,
              fontSize: fontSize.lg.size,
              lineHeight: fontSize.lg.line,
              color: color.textBody,
              maxWidth: 640,
            }}
          >
            You pay for what your agents actually spend, not for seats or features.
            The dashboards your team uses every day are free.
          </p>
        </div>
      </section>

      <section style={{ maxWidth: 1100, margin: "0 auto", padding: `${spacing[4]} ${spacing[5]} ${spacing[9]}` }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: spacing[4] }}>
          <PricingCard
            title="Starter"
            tagline="Under 10 agents."
            price="$0"
            priceSub="for 6 months, then Growth"
            featured={false}
            items={[
              "Up to 10 active virtual cards",
              "Treasury in 2 currencies",
              "All dashboards included",
              "Email + community support",
            ]}
            cta={{ label: "Get started", href: "/contact" }}
          />
          <PricingCard
            title="Growth"
            tagline="For production fleets."
            price="$3"
            priceSub="per active card / month"
            featured
            items={[
              "Unlimited active virtual cards",
              "Treasury in all 7 currencies",
              "SOC2 audit exports",
              "Approval workflows with TOTP",
              "Fraud ML baseline + alerts",
              "Priority support + Slack Connect",
            ]}
            cta={{ label: "Talk to sales", href: "/contact" }}
          />
          <PricingCard
            title="Enterprise"
            tagline="Custom volume."
            price="Custom"
            priceSub="with SLAs + dedicated runbook"
            featured={false}
            items={[
              "Everything in Growth",
              "Dedicated infrastructure shard",
              "Custom approval routing",
              "99.99% uptime SLA + credits",
              "White-glove onboarding",
            ]}
            cta={{ label: "Request a briefing", href: "/contact" }}
          />
        </div>

        <div
          style={{
            marginTop: spacing[8],
            padding: spacing[5],
            background: color.surface,
            borderRadius: radius.md,
            border: `1px solid ${color.border}`,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: spacing[5],
          }}
        >
          {[
            { label: "Transaction fee", value: "0%", sub: "No markup on authorizations. Card networks charge interchange directly." },
            { label: "FX spread", value: "0.50%", sub: "Against ECB reference on non-USD settlement. Competitive with Wise." },
            { label: "Audit exports", value: "Included", sub: "Signed SOC2 exports with Merkle proofs, unlimited runs." },
            { label: "Dashboards", value: "Free", sub: "Every seat, every module — no per-user charge." },
          ].map((r) => (
            <div key={r.label}>
              <div
                style={{
                  fontFamily: font.sans,
                  fontSize: fontSize.xs.size,
                  fontWeight: fontWeight.semibold,
                  color: color.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: spacing[2],
                }}
              >
                {r.label}
              </div>
              <div
                style={{
                  fontFamily: font.sans,
                  fontSize: fontSize.h4.size,
                  lineHeight: fontSize.h4.line,
                  letterSpacing: fontSize.h4.tracking,
                  fontWeight: fontWeight.semibold,
                  color: color.textHeading,
                  marginBottom: spacing[2],
                }}
              >
                {r.value}
              </div>
              <div
                style={{
                  fontFamily: font.sans,
                  fontSize: fontSize.sm.size,
                  lineHeight: fontSize.sm.line,
                  color: color.textBody,
                }}
              >
                {r.sub}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: `${spacing[9]} ${spacing[5]}`, background: color.surface, borderTop: `1px solid ${color.border}` }}>
        <div style={{ maxWidth: 820, margin: "0 auto", textAlign: "center" }}>
          <h2
            style={{
              fontFamily: font.serif,
              fontSize: fontSize.h3.size,
              lineHeight: fontSize.h3.line,
              letterSpacing: fontSize.h3.tracking,
              fontWeight: fontWeight.semibold,
              color: color.textHeading,
              margin: 0,
              marginBottom: spacing[3],
            }}
          >
            Ready to scale?
          </h2>
          <p
            style={{
              fontFamily: font.sans,
              fontSize: fontSize.lg.size,
              lineHeight: fontSize.lg.line,
              color: color.textBody,
              margin: `0 auto ${spacing[5]}`,
              maxWidth: 540,
            }}
          >
            Enterprise contracts include procurement-ready MSAs, DPAs, and SOC2 evidence
            packets on day one.
          </p>
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
            }}
          >
            Talk to us →
          </Link>
        </div>
      </section>

      {/* Keep the gradient token referenced so the linter doesn't drop the
          import when tokens shift. */}
      {void gradientSignature}
    </MarketingShell>
  );
}

function PricingCard({
  title,
  tagline,
  price,
  priceSub,
  items,
  cta,
  featured,
}: {
  title: string;
  tagline: string;
  price: string;
  priceSub: string;
  items: string[];
  cta: { label: string; href: string };
  featured: boolean;
}) {
  return (
    <div
      style={{
        background: color.white,
        border: featured ? `1px solid ${color.textHeading}` : `1px solid ${color.border}`,
        borderRadius: radius.md,
        padding: spacing[5],
        display: "flex",
        flexDirection: "column",
        gap: spacing[3],
        boxShadow: featured ? shadow.md : shadow.sm,
      }}
    >
      <div>
        <div
          style={{
            fontFamily: font.sans,
            fontSize: fontSize.xs.size,
            fontWeight: fontWeight.semibold,
            color: color.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: spacing[1],
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontFamily: font.sans,
            fontSize: fontSize.base.size,
            fontWeight: fontWeight.medium,
            color: color.textBody,
          }}
        >
          {tagline}
        </div>
      </div>
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: spacing[2] }}>
          <span
            style={{
              fontFamily: font.serif,
              fontSize: fontSize.h3.size,
              lineHeight: fontSize.h3.line,
              letterSpacing: fontSize.h3.tracking,
              fontWeight: fontWeight.semibold,
              color: color.textHeading,
            }}
          >
            {price}
          </span>
        </div>
        <div
          style={{
            marginTop: spacing[1],
            fontFamily: font.sans,
            fontSize: fontSize.sm.size,
            color: color.textMuted,
          }}
        >
          {priceSub}
        </div>
      </div>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "grid",
          gap: spacing[2],
          marginTop: spacing[2],
        }}
      >
        {items.map((i) => (
          <li
            key={i}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: spacing[2],
              fontFamily: font.sans,
              fontSize: fontSize.sm.size,
              lineHeight: fontSize.sm.line,
              color: color.textBody,
            }}
          >
            <span
              aria-hidden
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 14,
                height: 14,
                marginTop: 3,
                borderRadius: radius.pill,
                background: color.successBg,
                color: color.success,
                fontSize: 10,
                fontWeight: fontWeight.bold,
              }}
            >
              ✓
            </span>
            <span>{i}</span>
          </li>
        ))}
      </ul>
      <Link
        href={cta.href}
        style={{
          marginTop: spacing[3],
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: `${spacing[3]} ${spacing[4]}`,
          borderRadius: radius.sm,
          background: featured ? color.textHeading : color.white,
          color: featured ? color.white : color.textHeading,
          border: featured ? "none" : `1px solid ${color.border}`,
          textDecoration: "none",
          fontFamily: font.sans,
          fontSize: fontSize.sm.size,
          fontWeight: fontWeight.semibold,
        }}
      >
        {cta.label}
      </Link>
    </div>
  );
}
