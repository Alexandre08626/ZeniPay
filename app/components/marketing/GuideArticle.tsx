// Long-form guides (FR under /fr/guides, EN under /guides). Server
// component: the whole text, tables and FAQ are in the HTML so Google
// and AI answer engines read them without running JS.
//
// Copy rules (see intent-pages.ts and CLAUDE.md):
//  - ZeniPay is a payment technology platform, never a bank.
//  - No processing rates, no "no fees" claims, no SOC 2, no competitor bashing.
//  - Every external figure links to the official source it came from.
//  - Product facts only if they are already shown on zenipay.ca.
//
// Inline links in paragraphs, bullets and table cells use a tiny
// markdown subset: [label](/path) or [label](https://...).

import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { MarketingNav, MarketingFooter } from "@/app/components/marketing/MarketingNav";
import zp from "@/lib/design-system/zenipay-brand";

const BASE = "https://zenipay.ca";

export type GuideBlock = {
  h2: string;
  paragraphs?: string[];
  bullets?: string[];
  ordered?: string[];
  table?: { caption: string; head: string[]; rows: string[][]; note?: string };
  template?: { label: string; text: string };
  after?: string[];
};

export type GuideData = {
  lang: "fr" | "en";
  path: string;
  alternatePath?: string;
  /** <title> */
  title: string;
  description: string;
  h1: string;
  /** First paragraph: the direct answer to the main question. */
  answer: string;
  breadcrumb: string;
  datePublished: string;
  dateModified: string;
  readingMinutes: number;
  keywords: string[];
  blocks: GuideBlock[];
  faq: Array<{ q: string; a: string }>;
  sources: Array<{ label: string; url: string }>;
  related: Array<{ label: string; href: string }>;
  cta: { title: string; text: string; label: string; href: string };
};

export const guidesIndexPath = (lang: "fr" | "en") => (lang === "fr" ? "/fr/guides" : "/guides");

export function guideMetadata(d: GuideData): Metadata {
  const url = `${BASE}${d.path}`;
  const languages: Record<string, string> = {};
  if (d.alternatePath) {
    const fr = d.lang === "fr" ? d.path : d.alternatePath;
    const en = d.lang === "en" ? d.path : d.alternatePath;
    languages["fr-CA"] = `${BASE}${fr}`;
    languages["en-CA"] = `${BASE}${en}`;
    languages["x-default"] = `${BASE}${en}`;
  }
  return {
    title: { absolute: d.title },
    description: d.description,
    keywords: d.keywords,
    alternates: { canonical: url, ...(d.alternatePath ? { languages } : {}) },
    openGraph: {
      title: d.title,
      description: d.description,
      url,
      siteName: "ZeniPay",
      type: "article",
      publishedTime: d.datePublished,
      modifiedTime: d.dateModified,
      locale: d.lang === "fr" ? "fr_CA" : "en_CA",
      images: [{ url: `${BASE}/opengraph-image`, width: 1200, height: 630, alt: d.h1 }],
    },
    twitter: { card: "summary_large_image", title: d.title, description: d.description },
  };
}

const stripLinks = (s: string) => s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");

function guideJsonLd(d: GuideData) {
  const url = `${BASE}${d.path}`;
  const fr = d.lang === "fr";
  const home = fr ? `${BASE}/fr` : BASE;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${url}#article`,
        headline: d.h1,
        description: d.description,
        inLanguage: fr ? "fr-CA" : "en-CA",
        datePublished: d.datePublished,
        dateModified: d.dateModified,
        author: { "@id": `${BASE}/#organization` },
        publisher: { "@id": `${BASE}/#organization` },
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        url,
        keywords: d.keywords.join(", "),
        citation: d.sources.map((s) => s.url),
        isPartOf: { "@id": `${BASE}/#website` },
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        mainEntity: d.faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: stripLinks(f.a) },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: fr ? "Accueil" : "Home", item: home },
          { "@type": "ListItem", position: 2, name: "Guides", item: `${BASE}${guidesIndexPath(d.lang)}` },
          { "@type": "ListItem", position: 3, name: d.breadcrumb, item: url },
        ],
      },
    ],
  };
}

const linkColor = zp.brand.cyan;

/** Renders "[label](href)" segments as links, the rest as text. */
export function Rich({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(<Fragment key={i++}>{text.slice(last, m.index)}</Fragment>);
    const [, label, href] = m;
    parts.push(
      href.startsWith("/") ? (
        <Link key={i++} href={href} style={{ color: linkColor, fontWeight: zp.weight.semibold }}>{label}</Link>
      ) : (
        <a key={i++} href={href} rel="noopener" target="_blank" style={{ color: linkColor, fontWeight: zp.weight.semibold }}>{label}</a>
      ),
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(<Fragment key={i++}>{text.slice(last)}</Fragment>);
  return <>{parts}</>;
}

const h2Style: React.CSSProperties = {
  margin: "0 0 14px", fontFamily: zp.font.display, fontSize: "clamp(22px, 3vw, 28px)",
  fontWeight: zp.weight.semibold, letterSpacing: "-0.02em", lineHeight: 1.2, color: zp.text.primary,
};
const pStyle: React.CSSProperties = { margin: "0 0 14px", fontSize: 16, lineHeight: 1.7, color: zp.text.muted };
const listStyle: React.CSSProperties = { margin: "4px 0 14px", paddingLeft: 22, fontSize: 16, lineHeight: 1.7, color: zp.text.muted };
const cell: React.CSSProperties = { padding: "10px 12px", borderBottom: `1px solid ${zp.surface.border}`, textAlign: "left", verticalAlign: "top" };
const primaryBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  padding: "14px 24px", borderRadius: zp.radius.sm, background: zp.gradient.main,
  color: "#fff", fontWeight: zp.weight.semibold, fontSize: 15, textDecoration: "none",
  boxShadow: "0 8px 24px rgba(15,184,201,0.28)",
};
const ghostBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  padding: "14px 24px", borderRadius: zp.radius.sm, background: "transparent",
  border: "1px solid rgba(255,255,255,0.3)", color: "#fff",
  fontWeight: zp.weight.semibold, fontSize: 15, textDecoration: "none",
};

function formatDate(iso: string, lang: "fr" | "en") {
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

export function GuideArticle({ d }: { d: GuideData }) {
  const fr = d.lang === "fr";
  return (
    <div lang={fr ? "fr-CA" : "en-CA"} style={{ background: "#fff", color: zp.text.primary, fontFamily: zp.font.sans, minHeight: "100vh" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(guideJsonLd(d)) }} />
      <MarketingNav />

      <main>
        <article>
          <header style={{ background: zp.surface.bg2, borderBottom: `1px solid ${zp.surface.border}` }}>
            <div style={{ maxWidth: 780, margin: "0 auto", padding: "48px 20px 40px" }}>
              <nav aria-label={fr ? "Fil d'Ariane" : "Breadcrumb"} style={{ fontSize: 13, color: zp.text.dim, marginBottom: 18, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                <Link href={fr ? "/fr" : "/"} style={{ color: zp.text.dim }}>{fr ? "Accueil" : "Home"}</Link>
                <span aria-hidden>›</span>
                <Link href={guidesIndexPath(d.lang)} style={{ color: zp.text.dim }}>Guides</Link>
                <span aria-hidden>›</span>
                <span>{d.breadcrumb}</span>
                {d.alternatePath && (
                  <Link href={d.alternatePath} hrefLang={fr ? "en-CA" : "fr-CA"} style={{ marginLeft: "auto", color: zp.text.muted }}>
                    {fr ? "English" : "Français"}
                  </Link>
                )}
              </nav>
              <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: zp.weight.bold, letterSpacing: "0.12em", textTransform: "uppercase", color: zp.brand.violet }}>
                {fr ? "Guide" : "Guide"} · {d.readingMinutes} min
              </p>
              <h1 style={{ margin: 0, fontFamily: zp.font.display, fontSize: "clamp(30px, 4.6vw, 46px)", fontWeight: zp.weight.semibold, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
                {d.h1}
              </h1>
              <p style={{ margin: "20px 0 0", fontSize: 18, lineHeight: 1.65, color: zp.text.primary }}>
                <Rich text={d.answer} />
              </p>
              <p style={{ margin: "16px 0 0", fontSize: 13, color: zp.text.dim }}>
                {fr ? "Mis à jour le " : "Updated "}
                <time dateTime={d.dateModified}>{formatDate(d.dateModified, d.lang)}</time>
                {fr ? " · Sources officielles vérifiées à cette date · Par l'équipe ZeniPay" : " · Official sources checked on that date · By the ZeniPay team"}
              </p>
            </div>
          </header>

          <div style={{ maxWidth: 780, margin: "0 auto", padding: "8px 20px 0" }}>
            {d.blocks.map((b) => (
              <section key={b.h2} style={{ padding: "36px 0 4px" }}>
                <h2 style={h2Style}>{b.h2}</h2>
                {b.paragraphs?.map((p, i) => <p key={i} style={pStyle}><Rich text={p} /></p>)}
                {b.ordered && (
                  <ol style={listStyle}>
                    {b.ordered.map((x, i) => <li key={i} style={{ marginBottom: 8 }}><Rich text={x} /></li>)}
                  </ol>
                )}
                {b.bullets && (
                  <ul style={listStyle}>
                    {b.bullets.map((x, i) => <li key={i} style={{ marginBottom: 8 }}><Rich text={x} /></li>)}
                  </ul>
                )}
                {b.table && (
                  <div style={{ overflowX: "auto", margin: "6px 0 14px", border: `1px solid ${zp.surface.border}`, borderRadius: 12 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, lineHeight: 1.5, color: zp.text.primary, minWidth: 520 }}>
                      <caption style={{ captionSide: "top", textAlign: "left", padding: "12px 12px 4px", fontSize: 13, fontWeight: zp.weight.semibold, color: zp.text.muted }}>
                        {b.table.caption}
                      </caption>
                      <thead>
                        <tr style={{ background: zp.surface.bg2 }}>
                          {b.table.head.map((h) => <th key={h} scope="col" style={{ ...cell, fontWeight: zp.weight.semibold }}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {b.table.rows.map((r, i) => (
                          <tr key={i}>
                            {r.map((c, j) => j === 0
                              ? <th key={j} scope="row" style={{ ...cell, fontWeight: zp.weight.semibold }}><Rich text={c} /></th>
                              : <td key={j} style={{ ...cell, color: zp.text.muted }}><Rich text={c} /></td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {b.table?.note && <p style={{ ...pStyle, fontSize: 13 }}><Rich text={b.table.note} /></p>}
                {b.template && (
                  <figure style={{ margin: "6px 0 14px" }}>
                    <figcaption style={{ fontSize: 13, fontWeight: zp.weight.semibold, color: zp.text.muted, marginBottom: 6 }}>{b.template.label}</figcaption>
                    <blockquote style={{ margin: 0, padding: "16px 18px", borderLeft: `3px solid ${zp.brand.cyan}`, background: zp.surface.bg2, borderRadius: 8, fontSize: 15, lineHeight: 1.7, color: zp.text.primary, whiteSpace: "pre-line" }}>
                      {b.template.text}
                    </blockquote>
                  </figure>
                )}
                {b.after?.map((p, i) => <p key={`a${i}`} style={pStyle}><Rich text={p} /></p>)}
              </section>
            ))}

            <section style={{ padding: "36px 0 4px" }}>
              <h2 style={h2Style}>{fr ? "Questions fréquentes" : "Frequently asked questions"}</h2>
              <div style={{ display: "grid", gap: 10 }}>
                {d.faq.map((f) => (
                  <details key={f.q} style={{ padding: "16px 20px", borderRadius: 12, border: `1px solid ${zp.surface.border}`, background: "#fff" }}>
                    <summary style={{ cursor: "pointer", fontSize: 16, fontWeight: zp.weight.semibold, color: zp.text.primary }}>{f.q}</summary>
                    <p style={{ ...pStyle, margin: "10px 0 0" }}><Rich text={f.a} /></p>
                  </details>
                ))}
              </div>
            </section>

            <section style={{ padding: "36px 0 4px" }}>
              <h2 style={{ ...h2Style, fontSize: 20 }}>{fr ? "Sources officielles" : "Official sources"}</h2>
              <ul style={{ ...listStyle, fontSize: 14 }}>
                {d.sources.map((s) => (
                  <li key={s.url} style={{ marginBottom: 6 }}>
                    <a href={s.url} rel="noopener" target="_blank" style={{ color: linkColor }}>{s.label}</a>
                  </li>
                ))}
              </ul>
              <p style={{ ...pStyle, fontSize: 13 }}>
                {fr
                  ? "Ce guide vulgarise des règles publiques ; il ne remplace ni les textes de loi ni l'avis d'un comptable ou d'un avocat."
                  : "This guide summarizes public rules; it does not replace the legislation or advice from an accountant or lawyer."}
              </p>
            </section>

            <section style={{ padding: "28px 0 4px" }}>
              <h2 style={{ ...h2Style, fontSize: 20 }}>{fr ? "À lire aussi" : "Related"}</h2>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexWrap: "wrap", gap: 10 }}>
                {d.related.map((r) => (
                  <li key={r.href}>
                    <Link href={r.href} style={{ display: "inline-block", padding: "8px 14px", borderRadius: zp.radius.pill, border: `1px solid ${zp.surface.border}`, color: zp.text.primary, fontSize: 14, textDecoration: "none" }}>
                      {r.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section style={{ margin: "44px 0 0", padding: "32px 24px", borderRadius: 20, background: zp.surface.heroInk, color: "#fff", textAlign: "center" }}>
              <h2 style={{ ...h2Style, color: "#fff" }}>{d.cta.title}</h2>
              <p style={{ ...pStyle, color: "rgba(255,255,255,0.75)", maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>{d.cta.text}</p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 8 }}>
                <Link href={d.cta.href} style={primaryBtn}>{d.cta.label}</Link>
                <Link href="/contact" style={ghostBtn}>{fr ? "Nous écrire" : "Contact us"}</Link>
              </div>
            </section>
          </div>
        </article>
      </main>

      <MarketingFooter />
    </div>
  );
}

// ─── Index page ─────────────────────────────────────────────────────────────

export function guidesIndexMetadata(lang: "fr" | "en", list: GuideData[]): Metadata {
  const fr = lang === "fr";
  const url = `${BASE}${guidesIndexPath(lang)}`;
  const title = fr ? "Guides de paiement pour PME au Québec et au Canada | ZeniPay" : "Payment guides for Canadian small businesses | ZeniPay";
  const description = fr
    ? "Guides pratiques et sourcés : envoyer un lien de paiement, facturer avec la TPS et la TVQ au Québec, offrir le paiement en versements."
    : "Practical, sourced guides: sending a payment link, invoicing with GST and QST in Québec, offering installment payments.";
  void list;
  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: url,
      languages: { "fr-CA": `${BASE}/fr/guides`, "en-CA": `${BASE}/guides`, "x-default": `${BASE}/guides` },
    },
    openGraph: { title, description, url, siteName: "ZeniPay", type: "website", locale: fr ? "fr_CA" : "en_CA" },
  };
}

export function GuidesIndex({ lang, list }: { lang: "fr" | "en"; list: GuideData[] }) {
  const fr = lang === "fr";
  const url = `${BASE}${guidesIndexPath(lang)}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${url}#webpage`,
        url,
        name: fr ? "Guides ZeniPay" : "ZeniPay guides",
        inLanguage: fr ? "fr-CA" : "en-CA",
        isPartOf: { "@id": `${BASE}/#website` },
        mainEntity: {
          "@type": "ItemList",
          itemListElement: list.map((g, i) => ({ "@type": "ListItem", position: i + 1, url: `${BASE}${g.path}`, name: g.h1 })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: fr ? "Accueil" : "Home", item: fr ? `${BASE}/fr` : BASE },
          { "@type": "ListItem", position: 2, name: "Guides", item: url },
        ],
      },
    ],
  };
  return (
    <div lang={fr ? "fr-CA" : "en-CA"} style={{ background: "#fff", color: zp.text.primary, fontFamily: zp.font.sans, minHeight: "100vh" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MarketingNav />
      <main style={{ maxWidth: 780, margin: "0 auto", padding: "48px 20px 72px" }}>
        <nav aria-label={fr ? "Fil d'Ariane" : "Breadcrumb"} style={{ fontSize: 13, color: zp.text.dim, marginBottom: 18, display: "flex", gap: 6 }}>
          <Link href={fr ? "/fr" : "/"} style={{ color: zp.text.dim }}>{fr ? "Accueil" : "Home"}</Link>
          <span aria-hidden>›</span>
          <span>Guides</span>
          <Link href={fr ? "/guides" : "/fr/guides"} hrefLang={fr ? "en-CA" : "fr-CA"} style={{ marginLeft: "auto", color: zp.text.muted }}>
            {fr ? "English" : "Français"}
          </Link>
        </nav>
        <h1 style={{ margin: 0, fontFamily: zp.font.display, fontSize: "clamp(30px, 4.6vw, 46px)", fontWeight: zp.weight.semibold, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
          {fr ? "Guides pour se faire payer en ligne" : "Guides to getting paid online"}
        </h1>
        <p style={{ ...pStyle, fontSize: 18, marginTop: 16 }}>
          {fr
            ? "Des réponses directes, avec les règles de Revenu Québec, de l'Agence du revenu du Canada et de l'Office de la protection du consommateur citées à la source."
            : "Direct answers, with the rules from Revenu Québec, the Canada Revenue Agency and Québec's consumer protection office linked at the source."}
        </p>
        <ul style={{ listStyle: "none", padding: 0, margin: "28px 0 0", display: "grid", gap: 14 }}>
          {list.map((g) => (
            <li key={g.path} style={{ padding: "20px 22px", borderRadius: 14, border: `1px solid ${zp.surface.border}` }}>
              <h2 style={{ margin: "0 0 8px", fontSize: 20, fontFamily: zp.font.display, fontWeight: zp.weight.semibold, lineHeight: 1.25 }}>
                <Link href={g.path} style={{ color: zp.text.primary, textDecoration: "none" }}>{g.h1}</Link>
              </h2>
              <p style={{ ...pStyle, margin: 0, fontSize: 15 }}>{g.description}</p>
            </li>
          ))}
        </ul>
      </main>
      <MarketingFooter />
    </div>
  );
}
