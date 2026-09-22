import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketingNav, MarketingFooter } from "@/app/components/marketing/MarketingNav";
import zp from "@/lib/design-system/zenipay-brand";
import { NEWS, findNews } from "../news-data";

const BASE_URL = "https://zenipay.ca";
const AUTHOR_ID = "https://www.zenivatravel.com/alexandre-blais#person";
const GROUP_ID = "https://www.zeniva.ca/#group";

export function generateStaticParams() {
  return NEWS.map((n) => ({ slug: n.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const item = findNews(slug);
  if (!item) return { title: "Not found" };
  const url = `${BASE_URL}/news/${item.slug}`;
  return {
    title: item.title,
    description: item.summary,
    alternates: { canonical: url },
    openGraph: { title: item.title, description: item.summary, url, siteName: "ZeniPay", type: "article", publishedTime: item.datePublished },
    twitter: { card: "summary_large_image", title: item.title, description: item.summary },
  };
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

export default async function NewsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = findNews(slug);
  if (!item) notFound();
  const url = `${BASE_URL}/news/${item.slug}`;

  // NewsArticle authored by the founder, published by Zeniva Group, about the brand entity.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "NewsArticle",
        "@id": `${url}#article`,
        headline: item.title,
        description: item.summary,
        inLanguage: "en-CA",
        datePublished: item.datePublished,
        dateModified: item.datePublished,
        author: { "@id": AUTHOR_ID },
        publisher: { "@id": GROUP_ID },
        about: { "@id": item.aboutId },
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        articleBody: item.paragraphs.join("\n\n"),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "ZeniPay", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "News", item: `${BASE_URL}/news` },
          { "@type": "ListItem", position: 3, name: item.title, item: url },
        ],
      },
    ],
  };

  return (
    <div style={{ background: "#fff", color: zp.text.primary, minHeight: "100vh", fontFamily: zp.font.sans }}>
      <MarketingNav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <article style={{ maxWidth: 720, margin: "0 auto", padding: "64px 24px 88px" }}>
        <Link href="/news" style={{ fontSize: 13, color: zp.text.muted, textDecoration: "none", fontWeight: zp.weight.semibold }}>
          ← All announcements
        </Link>

        <div style={{ marginTop: 24, marginBottom: 14, fontSize: 11, color: zp.text.dim, fontWeight: zp.weight.semibold, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {item.brand} · {item.dateline} · {formatDate(item.datePublished)}
        </div>

        <h1 style={{ margin: 0, fontFamily: zp.font.display, fontSize: "clamp(28px, 4.2vw, 44px)", fontWeight: zp.weight.semibold, letterSpacing: "-0.025em", lineHeight: 1.12, color: zp.text.primary }}>
          {item.title}
        </h1>

        <p style={{ margin: "18px 0 0", fontSize: 17, lineHeight: 1.55, color: zp.text.muted }}>{item.summary}</p>

        <div style={{ marginTop: 36, fontSize: 16, lineHeight: 1.7, color: zp.text.primary }}>
          {item.paragraphs.map((p, i) => (
            <p key={i} style={{ margin: "0 0 18px" }}>{p}</p>
          ))}
        </div>

        {item.quote && (
          <blockquote style={{ margin: "32px 0", padding: "4px 0 4px 20px", borderLeft: `3px solid ${zp.brand.violet}` }}>
            <p style={{ margin: 0, fontSize: 19, lineHeight: 1.5, fontFamily: zp.font.display, color: zp.text.primary }}>
              &ldquo;{item.quote}&rdquo;
            </p>
            <footer style={{ marginTop: 10, fontSize: 13, color: zp.text.muted }}>
              — <Link href="/alexandre-blais" style={{ color: zp.text.muted }}>Alexandre Blais</Link>, founder and president
            </footer>
          </blockquote>
        )}

        <section style={{ marginTop: 44, paddingTop: 24, borderTop: `1px solid ${zp.surface.border}` }}>
          <h2 style={{ margin: 0, fontSize: 11, fontWeight: zp.weight.bold, letterSpacing: "0.12em", textTransform: "uppercase", color: zp.text.dim }}>About</h2>
          <p style={{ margin: "12px 0 0", fontSize: 14, lineHeight: 1.6, color: zp.text.muted }}>{item.boilerplate}</p>
          <ul style={{ margin: "18px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
            {item.links.map((l) => (
              <li key={l.href}>
                <a href={l.href} style={{ fontSize: 14, color: zp.brand.violet, fontWeight: zp.weight.semibold }}>{l.label}</a>
              </li>
            ))}
          </ul>
          <p style={{ margin: "18px 0 0", fontSize: 12, color: zp.text.dim }}>Media contact: zenipay@zeniva.ca</p>
        </section>
      </article>

      <MarketingFooter />
    </div>
  );
}
