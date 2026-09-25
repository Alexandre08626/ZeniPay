import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav, MarketingFooter } from "@/app/components/marketing/MarketingNav";
import zp from "@/lib/design-system/zenipay-brand";
import { NEWS } from "./news-data";

const BASE_URL = "https://zenipay.ca";

export const metadata: Metadata = {
  title: "News — official ZeniPay announcements",
  description:
    "Official announcements from ZeniPay: the fintech platform launch and Zeniva Group — the companies founded by Alexandre Blais.",
  alternates: { canonical: `${BASE_URL}/news` },
  openGraph: { title: "News — ZeniPay", description: "Official ZeniPay announcements.", url: `${BASE_URL}/news`, siteName: "ZeniPay", type: "website" },
};

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

export default function NewsIndex() {
  const sorted = [...NEWS].sort((a, b) => (a.datePublished < b.datePublished ? 1 : -1));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${BASE_URL}/news`,
    name: "ZeniPay News",
    isPartOf: { "@id": `${BASE_URL}/#website` },
    about: { "@id": `${BASE_URL}/#organization` },
    hasPart: sorted.map((n) => ({
      "@type": "NewsArticle",
      "@id": `${BASE_URL}/news/${n.slug}#article`,
      headline: n.title,
      datePublished: n.datePublished,
      url: `${BASE_URL}/news/${n.slug}`,
    })),
  };

  return (
    <div style={{ background: "#fff", color: zp.text.primary, minHeight: "100vh", fontFamily: zp.font.sans }}>
      <MarketingNav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section style={{ position: "relative", overflow: "hidden" }}>
        <span aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(circle at 12% 0%, rgba(123,79,191,0.07) 0%, transparent 55%)" }} />
        <div style={{ position: "relative", maxWidth: 880, margin: "0 auto", padding: "84px 24px 32px", textAlign: "center" }}>
          <span style={{ display: "inline-block", padding: "5px 12px", borderRadius: zp.radius.pill, background: zp.surface.bg2, border: `1px solid ${zp.surface.border}`, marginBottom: 22, fontSize: 11, fontWeight: zp.weight.bold, letterSpacing: "0.12em", textTransform: "uppercase", color: zp.brand.violet }}>
            News
          </span>
          <h1 style={{ margin: 0, fontFamily: zp.font.display, fontSize: "clamp(32px, 5vw, 52px)", fontWeight: zp.weight.semibold, letterSpacing: "-0.03em", lineHeight: 1.06, color: zp.text.primary }}>
            Official announcements.
          </h1>
          <p style={{ margin: "20px auto 0", maxWidth: 600, fontSize: 16, color: zp.text.muted, lineHeight: 1.55 }}>
            What ZeniPay and Zeniva Group launch, in our own words.
          </p>
        </div>
      </section>

      <section style={{ maxWidth: 880, margin: "0 auto", padding: "24px 24px 88px", display: "grid", gap: 16 }}>
        {sorted.map((n) => (
          <Link
            key={n.slug}
            href={`/news/${n.slug}`}
            style={{ display: "block", padding: 26, borderRadius: zp.radius.lg, border: `1px solid ${zp.surface.border}`, textDecoration: "none", background: "#fff" }}
          >
            <div style={{ fontSize: 11, color: zp.brand.violet, fontWeight: zp.weight.bold, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              {n.brand} · {formatDate(n.datePublished)}
            </div>
            <h2 style={{ margin: "10px 0 0", fontFamily: zp.font.display, fontSize: 22, fontWeight: zp.weight.semibold, letterSpacing: "-0.015em", color: zp.text.primary, lineHeight: 1.25 }}>
              {n.title}
            </h2>
            <p style={{ margin: "10px 0 0", fontSize: 15, lineHeight: 1.6, color: zp.text.muted }}>{n.summary}</p>
          </Link>
        ))}
      </section>

      <MarketingFooter />
    </div>
  );
}
