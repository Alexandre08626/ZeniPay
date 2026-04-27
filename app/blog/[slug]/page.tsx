"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { MarketingNav, MarketingFooter } from "@/app/components/marketing/MarketingNav";
import zp from "@/lib/design-system/zenipay-brand";
import { findPost } from "../posts";

export default function BlogPostPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;
  const post = findPost(slug);

  if (!post) {
    return (
      <div style={{ background: "#fff", minHeight: "100vh", fontFamily: zp.font.sans }}>
        <MarketingNav />
        <section style={{ maxWidth: 720, margin: "0 auto", padding: "120px 24px", textAlign: "center" }}>
          <h1 style={{ fontFamily: zp.font.display, fontSize: 32, color: zp.text.primary }}>Article not found</h1>
          <p style={{ color: zp.text.muted, marginTop: 12 }}>
            <Link href="/blog" style={{ color: zp.brand.cyan, fontWeight: zp.weight.semibold }}>← Back to all articles</Link>
          </p>
        </section>
        <MarketingFooter />
      </div>
    );
  }

  // Article JSON-LD inline so AI search + Google have full context for
  // citation. We render it next to the header so crawlers fetch it on
  // the first paint.
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    inLanguage: post.language === "fr" ? "fr-CA" : "en-CA",
    datePublished: post.date,
    author: { "@type": "Organization", name: "ZeniPay", url: "https://zenipay.ca" },
    publisher: {
      "@type": "Organization",
      name: "ZeniPay",
      logo: { "@type": "ImageObject", url: "https://zenipay.ca/zenipay-logo.png" },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `https://zenipay.ca/blog/${post.slug}` },
    keywords: post.tags.join(", "),
  };

  return (
    <div style={{ background: "#fff", color: zp.text.primary, minHeight: "100vh", fontFamily: zp.font.sans }}>
      <MarketingNav />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <article style={{ maxWidth: 720, margin: "0 auto", padding: "64px 24px 88px" }}>
        <Link href="/blog" style={{ fontSize: 13, color: zp.text.muted, textDecoration: "none", fontWeight: zp.weight.semibold }}>
          ← All articles
        </Link>

        <div style={{
          marginTop: 24, marginBottom: 14, fontSize: 11, color: zp.text.dim,
          fontWeight: zp.weight.semibold, letterSpacing: "0.08em", textTransform: "uppercase",
        }}>
          {post.language === "fr" ? "Français" : "English"} · {post.date} · {post.readingMinutes} min read
        </div>

        <h1 style={{
          margin: 0, fontFamily: zp.font.display,
          fontSize: "clamp(30px, 4.5vw, 48px)", fontWeight: zp.weight.semibold,
          letterSpacing: "-0.025em", lineHeight: 1.1, color: zp.text.primary,
        }}>
          {post.title}
        </h1>

        <p style={{ margin: "18px 0 0", fontSize: 17, lineHeight: 1.55, color: zp.text.muted }}>
          {post.description}
        </p>

        <div style={{
          marginTop: 14, paddingTop: 14, borderTop: `1px solid ${zp.surface.border}`,
          display: "flex", flexWrap: "wrap", gap: 8,
        }}>
          {post.tags.map((t) => (
            <span key={t} style={{
              fontSize: 11, padding: "3px 10px", borderRadius: 999,
              background: zp.surface.bg2, color: zp.text.muted,
              fontWeight: zp.weight.semibold,
            }}>
              {t}
            </span>
          ))}
        </div>

        <div style={{ marginTop: 36, fontSize: 16, lineHeight: 1.7, color: zp.text.primary }}>
          {post.body.map((block, i) => {
            if (typeof block === "string") {
              return (
                <p key={i} style={{ margin: "0 0 18px" }}>{block}</p>
              );
            }
            return (
              <h2 key={i} style={{
                margin: "32px 0 14px", fontFamily: zp.font.display,
                fontSize: 22, fontWeight: zp.weight.semibold,
                letterSpacing: "-0.015em", color: zp.text.primary,
              }}>
                {block.h}
              </h2>
            );
          })}
        </div>

        <div style={{
          marginTop: 48, paddingTop: 24, borderTop: `1px solid ${zp.surface.border}`,
          display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontSize: 13, color: zp.text.muted }}>
            Want to try it? Open a free account in 2 minutes.
          </span>
          <Link href="/register" style={{
            display: "inline-flex", alignItems: "center",
            padding: "10px 18px", borderRadius: zp.radius.md,
            background: zp.gradient.main, color: "#fff",
            fontSize: 13, fontWeight: zp.weight.semibold,
            textDecoration: "none",
            boxShadow: "0 4px 12px rgba(45,190,96,0.25)",
          }}>
            Open an account →
          </Link>
        </div>
      </article>

      <MarketingFooter />
    </div>
  );
}
