// Shared navbar + footer for the public marketing pages.
// Sticky white bar with the official ZeniPay logo, 3 links, and two CTAs.
// Mobile: hamburger drawer.

"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import zp from "@/lib/design-system/zenipay-brand";

export function MarketingNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <header
      style={{
        position: "sticky", top: 0, zIndex: zp.zIndex.sticky,
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "blur(10px)",
        borderBottom: `1px solid ${zp.surface.border}`,
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 64, display: "flex", alignItems: "center", gap: 24 }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <Image src="/zenipay-logo-nobg.png" alt="ZeniPay" width={30} height={30} priority style={{ objectFit: "contain", width: 30, height: 30 }} />
          <span
            className="zp-brand-text"
            style={{ fontFamily: zp.font.display, fontSize: 20, fontWeight: zp.weight.semibold, letterSpacing: "-0.02em" }}
          >
            ZeniPay
          </span>
        </Link>

        <nav className="mk-nav-links" style={{ display: "flex", gap: 26, marginLeft: 24 }}>
          <Link href="/#features" style={linkStyle}>Features</Link>
          <Link href="/#pricing" style={linkStyle}>Pricing</Link>
          <Link href="/agents/overview" style={linkStyle}>Agents</Link>
        </nav>

        <div style={{ flex: 1 }} />

        <div className="mk-nav-ctas" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/login" style={{ ...linkStyle, color: zp.text.muted }}>Sign in</Link>
          <Link
            href="/register?type=personal"
            style={{
              padding: "8px 14px", borderRadius: zp.radius.sm,
              border: `1px solid ${zp.surface.border}`,
              background: "#fff", color: zp.text.primary,
              fontSize: 13, fontWeight: zp.weight.semibold, textDecoration: "none",
            }}
          >
            Personal account
          </Link>
          <Link
            href="/register?type=business"
            style={{
              background: zp.gradient.main, color: "#fff",
              padding: "9px 18px", borderRadius: zp.radius.sm,
              fontSize: 13, fontWeight: zp.weight.semibold, textDecoration: "none",
              letterSpacing: "0.01em",
              boxShadow: "0 2px 10px rgba(21,184,201,0.3)",
            }}
          >
            Business account
          </Link>
        </div>

        <button
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
          className="mk-nav-menu"
          style={{
            display: "none",
            width: 40, height: 40, borderRadius: zp.radius.sm,
            border: `1px solid ${zp.surface.border}`,
            background: zp.surface.bg1, color: zp.text.primary,
            cursor: "pointer",
            alignItems: "center", justifyContent: "center",
          }}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {open && (
        <div
          style={{
            position: "fixed", inset: "64px 0 0 0", zIndex: zp.zIndex.modal,
            background: "#fff", padding: "24px 28px", overflowY: "auto",
          }}
        >
          <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {[
              { href: "/#features", label: "Features" },
              { href: "/#pricing", label: "Pricing" },
              { href: "/agents/overview", label: "Agents" },
              { href: "/login", label: "Sign in" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                style={{ padding: "14px 4px", fontSize: 16, color: zp.text.primary, textDecoration: "none", borderBottom: `1px solid ${zp.surface.border}`, fontWeight: zp.weight.medium }}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/register"
              onClick={() => setOpen(false)}
              style={{
                marginTop: 14, padding: "14px 20px", textAlign: "center" as const,
                background: zp.gradient.main, color: "#fff",
                borderRadius: zp.radius.sm, textDecoration: "none",
                fontWeight: zp.weight.semibold, fontSize: 15,
              }}
            >
              Get started
            </Link>
          </nav>
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .mk-nav-links, .mk-nav-ctas { display: none !important; }
          .mk-nav-menu { display: inline-flex !important; }
        }
      `}</style>
    </header>
  );
}

export function MarketingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer style={{ borderTop: `1px solid ${zp.surface.border}`, background: zp.surface.bg2, marginTop: 64 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "52px 24px 32px" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.6fr) repeat(4, minmax(0, 1fr))",
          gap: 36,
        }} className="mk-footer-grid">
          <div>
            <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
              <Image src="/zenipay-logo-nobg.png" alt="ZeniPay" width={28} height={28} style={{ objectFit: "contain", width: 28, height: 28 }} />
              <span
                className="zp-brand-text"
                style={{ fontFamily: zp.font.display, fontSize: 18, fontWeight: zp.weight.semibold, letterSpacing: "-0.02em" }}
              >
                ZeniPay
              </span>
            </Link>
            <p style={{ margin: "12px 0 0", fontSize: 13, color: zp.text.muted, maxWidth: 300, lineHeight: 1.5 }}>
              The first online bank with AI-intelligent wallets. Personal and
              business banking in Canada and the US, with a built-in fleet of
              AI specialists.
            </p>
            <p style={{ margin: "16px 0 0", fontSize: 12, color: zp.text.muted }}>
              <a href="mailto:info@zeniva.ca" style={{ color: zp.text.muted, textDecoration: "none" }}>info@zeniva.ca</a>
            </p>
          </div>

          <FooterCol title="Solutions" links={[
            { label: "Banking",       href: "/banking" },
            { label: "Payments",      href: "/payments" },
            { label: "Payouts",       href: "/payouts" },
            { label: "Accounting",    href: "/accounting" },
            { label: "Pay Links",     href: "/paylinks" },
            { label: "Financing",     href: "/financing" },
            { label: "Tools",         href: "/tools" },
          ]} />

          <FooterCol title="Product" links={[
            { label: "AI Agents",     href: "/agents/overview" },
            { label: "Pricing",       href: "/pricing" },
            { label: "Security",      href: "/security" },
            { label: "Docs",          href: "/docs" },
            { label: "Sign in",       href: "/login" },
            { label: "Get started",   href: "/register" },
          ]} />

          <FooterCol title="Company" links={[
            { label: "About",         href: "/about" },
            { label: "Blog",          href: "/blog" },
            { label: "Contact",       href: "/contact" },
          ]} />

          <FooterCol title="Legal" links={[
            { label: "Privacy",       href: "/privacy" },
            { label: "Terms",         href: "/terms" },
          ]} />
        </div>

        <div style={{
          borderTop: `1px solid ${zp.surface.border}`,
          marginTop: 40, paddingTop: 18, fontSize: 11, color: zp.text.dim,
          display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8,
        }}>
          <span>© {year} International Luxury Management Inc. (ZeniPay)</span>
          <span>Made in Québec · Serving Canada and the United States</span>
        </div>

        <style>{`
          @media (max-width: 900px) {
            .mk-footer-grid { grid-template-columns: 1fr 1fr 1fr !important; gap: 28px !important; }
          }
          @media (max-width: 600px) {
            .mk-footer-grid { grid-template-columns: 1fr 1fr !important; }
          }
          @media (max-width: 420px) {
            .mk-footer-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: Array<{ label: string; href: string }> }) {
  return (
    <div>
      <div style={{
        fontSize: 11, color: zp.text.dim, fontWeight: zp.weight.semibold,
        letterSpacing: "0.14em", textTransform: "uppercase" as const, marginBottom: 10,
      }}>{title}</div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {links.map((l) => (
          <li key={l.label}>
            <Link href={l.href} style={{ fontSize: 13, color: zp.text.muted, textDecoration: "none" }}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

const linkStyle: React.CSSProperties = {
  fontSize: 13, color: zp.text.primary, textDecoration: "none", fontWeight: zp.weight.medium,
};
