"use client";

import Link from "next/link";
import { MarketingNav, MarketingFooter } from "@/app/components/marketing/MarketingNav";
import zp from "@/lib/design-system/zenipay-brand";
import { POSTS } from "./posts";

export default function BlogIndex() {
  // Newest first.
  const sorted = [...POSTS].sort((a, b) => (a.date < b.date ? 1 : -1));
  return (
    <div style={{ background: "#fff", color: zp.text.primary, minHeight: "100vh", fontFamily: zp.font.sans }}>
      <MarketingNav />

      <section style={{ position: "relative", overflow: "hidden" }}>
        <span aria-hidden style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: `radial-gradient(circle at 12% 0%, rgba(123,79,191,0.07) 0%, transparent 55%)`,
        }} />
        <div style={{ position: "relative", maxWidth: 880, margin: "0 auto", padding: "84px 24px 32px", textAlign: "center" }}>
          <span style={{
            display: "inline-block", padding: "5px 12px", borderRadius: zp.radius.pill,
            background: zp.surface.bg2, border: `1px solid ${zp.surface.border}`, marginBottom: 22,
            fontSize: 11, fontWeight: zp.weight.bold, letterSpacing: "0.12em",
            textTransform: "uppercase", color: zp.brand.violet,
          }}>
            Blog
          </span>
          <h1 style={{
            margin: 0, fontFamily: zp.font.display,
            fontSize: "clamp(36px, 5vw, 56px)", fontWeight: zp.weight.semibold,
            letterSpacing: "-0.03em", lineHeight: 1.06, color: zp.text.primary,
          }}>
            On AI banking,
            <br />
            <span className="zp-brand-text">in plain language.</span>
          </h1>
          <p style={{ margin: "20px auto 0", maxWidth: 600, fontSize: 16, color: zp.text.muted, lineHeight: 1.55 }}>
            Insights from the team building the first online bank with
            AI-intelligent wallets. Bilingual English / French.
          </p>
        </div>
      </section>

      <section style={{ padding: "32px 24px 88px" }}>
        <div style={{ maxWidth: 880, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
          {sorted.map((p) => (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              style={{
                display: "block", textDecoration: "none",
                background: "#fff", border: `1px solid ${zp.surface.border}`,
                borderRadius: zp.radius.lg, padding: 24,
                color: zp.text.primary,
              }}
            >
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: 8, fontSize: 11, color: zp.text.dim,
                letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: zp.weight.semibold,
              }}>
                <span>{p.language === "fr" ? "Français" : "English"} · {p.date} · {p.readingMinutes} min</span>
                <span>{p.tags[0] ?? ""}</span>
              </div>
              <h2 style={{
                margin: "0 0 6px", fontFamily: zp.font.display,
                fontSize: 22, fontWeight: zp.weight.semibold, letterSpacing: "-0.02em",
                color: zp.text.primary, lineHeight: 1.2,
              }}>
                {p.title}
              </h2>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: zp.text.muted }}>
                {p.excerpt}
              </p>
              <span style={{
                display: "inline-block", marginTop: 12,
                fontSize: 13, fontWeight: zp.weight.semibold, color: zp.brand.cyan,
              }}>
                Read article →
              </span>
            </Link>
          ))}
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
