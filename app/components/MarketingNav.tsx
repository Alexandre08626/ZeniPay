"use client";

// Lightweight top nav for the Agents-focused marketing pages (/, /pricing,
// /security, /contact). Intentionally different from `./Nav.tsx` which is
// the merchant-product nav (dark-mode, different links). This one is light-
// mode, minimal, investor-ready.

import Link from "next/link";
import { color, spacing, radius, shadow, font, fontSize, fontWeight, transition } from "@/lib/design-system/tokens";

export interface MarketingNavProps {
  /** Optional — if you pass a value, that nav item is highlighted. */
  active?: "product" | "pricing" | "security" | "docs" | null;
}

const LINKS: Array<{ label: string; href: string; key: "product" | "pricing" | "security" | "docs" }> = [
  { label: "Product",  href: "/#platform",    key: "product" },
  { label: "Pricing",  href: "/pricing",     key: "pricing" },
  { label: "Security", href: "/security",    key: "security" },
  { label: "Docs",     href: "/docs",        key: "docs" },
];

export default function MarketingNav({ active = null }: MarketingNavProps) {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: `rgba(255, 255, 255, 0.75)`,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: `1px solid ${color.border}`,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: `${spacing[4]} ${spacing[5]}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spacing[5],
        }}
      >
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: spacing[2],
            fontFamily: font.sans,
            fontSize: fontSize.lg.size,
            fontWeight: fontWeight.bold,
            color: color.textHeading,
            textDecoration: "none",
            letterSpacing: "-0.02em",
          }}
        >
          <ZeniMark />
          ZeniPay
          <span
            style={{
              fontSize: fontSize.xs.size,
              fontWeight: fontWeight.semibold,
              color: color.textMuted,
              padding: `2px ${spacing[2]}`,
              borderRadius: radius.pill,
              border: `1px solid ${color.border}`,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginLeft: spacing[1],
            }}
          >
            Agents
          </span>
        </Link>

        <nav
          style={{
            display: "none",
            alignItems: "center",
            gap: spacing[5],
          }}
          className="marketing-nav-links"
        >
          {LINKS.map((l) => (
            <Link
              key={l.key}
              href={l.href}
              style={{
                fontFamily: font.sans,
                fontSize: fontSize.sm.size,
                fontWeight: active === l.key ? fontWeight.semibold : fontWeight.medium,
                color: active === l.key ? color.textHeading : color.textBody,
                textDecoration: "none",
                transition: transition.fast,
              }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: spacing[2] }}>
          <Link
            href="/agents/login"
            style={{
              fontFamily: font.sans,
              fontSize: fontSize.sm.size,
              fontWeight: fontWeight.medium,
              color: color.textBody,
              textDecoration: "none",
              padding: `${spacing[2]} ${spacing[3]}`,
              borderRadius: radius.sm,
              transition: transition.fast,
            }}
          >
            Sign in
          </Link>
          <Link
            href="/contact"
            style={{
              fontFamily: font.sans,
              fontSize: fontSize.sm.size,
              fontWeight: fontWeight.semibold,
              color: color.white,
              background: color.textHeading,
              textDecoration: "none",
              padding: `${spacing[2]} ${spacing[4]}`,
              borderRadius: radius.sm,
              boxShadow: shadow.sm,
              transition: transition.base,
            }}
          >
            Request access
          </Link>
        </div>
      </div>

      {/* Show nav links on md+ */}
      <style>{`
        @media (min-width: 768px) {
          .marketing-nav-links { display: flex !important; }
        }
      `}</style>
    </header>
  );
}

// Brand glyph — same 3-color gradient as the signature. 20×20, mono-plane.
function ZeniMark() {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 24,
        height: 24,
        borderRadius: radius.sm,
        background: `linear-gradient(135deg, ${color.brandGreen} 0%, ${color.brandCyan} 50%, ${color.brandPurple} 100%)`,
        color: color.white,
        fontSize: 13,
        fontWeight: fontWeight.black,
        letterSpacing: "-0.02em",
      }}
    >
      Z
    </span>
  );
}
