"use client";

// Public footer for zenipay.ca/*  marketing pages. Light-mode, minimal,
// mirrors the MarketingNav aesthetic. Separate from the merchant-product
// footer defined inline in app/merchant/page.tsx.

import Link from "next/link";
import {
  color,
  spacing,
  radius,
  font,
  fontSize,
  fontWeight,
  gradientSignature,
} from "@/lib/design-system/tokens";

const SECTIONS: Array<{
  title: string;
  links: Array<{ label: string; href: string; external?: boolean; soon?: boolean }>;
}> = [
  {
    title: "Product",
    links: [
      { label: "Platform", href: "/#platform" },
      { label: "Pricing", href: "/pricing" },
      { label: "Security", href: "/security" },
      { label: "Docs", href: "/docs", soon: true },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Contact", href: "/contact" },
      { label: "Status", href: "https://zenipay.instatus.com", external: true, soon: true },
      { label: "Merchant product", href: "/merchant" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/legal/privacy" },
      { label: "Terms", href: "/legal/terms" },
      { label: "Audit signing key", href: "/.well-known/audit-signing-key.pub", external: true },
    ],
  },
];

export default function MarketingFooter() {
  return (
    <footer
      style={{
        background: color.white,
        borderTop: `1px solid ${color.border}`,
        padding: `${spacing[8]} ${spacing[5]} ${spacing[6]}`,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1.2fr 3fr",
          gap: spacing[8],
        }}
        className="marketing-footer-grid"
      >
        <div>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: spacing[2],
              textDecoration: "none",
              fontFamily: font.sans,
              fontSize: fontSize.lg.size,
              fontWeight: fontWeight.bold,
              color: color.textHeading,
              letterSpacing: "-0.02em",
            }}
          >
            <span
              aria-hidden
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 24,
                height: 24,
                borderRadius: radius.sm,
                background: gradientSignature,
                color: color.white,
                fontSize: 13,
                fontWeight: fontWeight.black,
              }}
            >
              Z
            </span>
            ZeniPay
          </Link>
          <p
            style={{
              marginTop: spacing[3],
              maxWidth: 300,
              fontFamily: font.sans,
              fontSize: fontSize.sm.size,
              lineHeight: fontSize.sm.line,
              color: color.textBody,
            }}
          >
            Banking infrastructure for teams running fleets of autonomous
            AI agents. Built by ILM Inc. in Québec.
          </p>
          <div
            style={{
              marginTop: spacing[4],
              display: "inline-flex",
              alignItems: "center",
              gap: spacing[2],
              padding: `${spacing[1]} ${spacing[3]}`,
              borderRadius: radius.pill,
              background: color.successBg,
              color: color.success,
              fontFamily: font.sans,
              fontSize: fontSize.xs.size,
              fontWeight: fontWeight.semibold,
            }}
          >
            <span
              aria-hidden
              style={{
                width: 6,
                height: 6,
                borderRadius: radius.pill,
                background: color.success,
              }}
            />
            All systems operational
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: spacing[5],
          }}
          className="marketing-footer-sections"
        >
          {SECTIONS.map((s) => (
            <div key={s.title}>
              <h4
                style={{
                  fontFamily: font.sans,
                  fontSize: fontSize.xs.size,
                  fontWeight: fontWeight.semibold,
                  color: color.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  margin: 0,
                  marginBottom: spacing[3],
                }}
              >
                {s.title}
              </h4>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "grid",
                  gap: spacing[2],
                }}
              >
                {s.links.map((l) => (
                  <li key={l.label}>
                    {l.external ? (
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={footerLinkStyle}
                      >
                        {l.label}
                        {l.soon && <SoonBadge />}
                        <span style={{ color: color.textSubtle, marginLeft: 4 }}>↗</span>
                      </a>
                    ) : (
                      <Link href={l.href} style={footerLinkStyle}>
                        {l.label}
                        {l.soon && <SoonBadge />}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          maxWidth: 1200,
          margin: `${spacing[8]} auto 0`,
          paddingTop: spacing[5],
          borderTop: `1px solid ${color.border}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: spacing[3],
          flexWrap: "wrap",
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: font.sans,
            fontSize: fontSize.xs.size,
            color: color.textMuted,
          }}
        >
          © {new Date().getFullYear()} ILM Inc. ZeniPay is a trademark of ILM Inc.
        </p>
        <p
          style={{
            margin: 0,
            fontFamily: font.mono,
            fontSize: fontSize.xs.size,
            color: color.textSubtle,
          }}
        >
          Built in Québec.
        </p>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .marketing-footer-grid { grid-template-columns: 1fr !important; }
          .marketing-footer-sections { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </footer>
  );
}

const footerLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontFamily: font.sans,
  fontSize: fontSize.sm.size,
  fontWeight: fontWeight.medium,
  color: color.textBody,
  textDecoration: "none",
};

function SoonBadge() {
  return (
    <span
      style={{
        marginLeft: 6,
        padding: "1px 6px",
        borderRadius: radius.pill,
        background: color.surface,
        border: `1px solid ${color.border}`,
        fontSize: 10,
        fontWeight: fontWeight.semibold,
        color: color.textMuted,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
      }}
    >
      Soon
    </span>
  );
}
