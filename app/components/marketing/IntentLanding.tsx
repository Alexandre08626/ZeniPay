// Shared layout for the high-intent landing pages (FR + EN):
// /payments, /paylinks, /invoices, /installments and their French
// counterparts under /fr. Server component: the whole text is in the
// HTML (Google + AI crawlers read it without running JS).
//
// Rules for the copy that feeds this component (see CLAUDE.md / memory):
//  - ZeniPay is a payment technology platform, never a bank.
//  - No processing rates, no "no fees" claims, no SOC 2.
//  - Card payments are processed by Finix, a PCI DSS Level 1 processor.
//  - Only state what the product actually does today.

import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav, MarketingFooter } from "@/app/components/marketing/MarketingNav";
import zp from "@/lib/design-system/zenipay-brand";

const BASE = "https://zenipay.ca";

export type IntentLandingData = {
  lang: "fr" | "en";
  path: string;
  /** Same page in the other language (hreflang pair). */
  alternatePath?: string;
  title: string;
  description: string;
  breadcrumb: string;
  eyebrow: string;
  h1: string;
  lead: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  facts: string[];
  sections: Array<{ h2: string; paragraphs?: string[]; bullets?: string[] }>;
  steps?: { h2: string; items: Array<{ title: string; body: string }> };
  faq: Array<{ q: string; a: string }>;
  related: Array<{ label: string; href: string }>;
  serviceName: string;
  serviceType: string;
};

export function intentMetadata(d: IntentLandingData): Metadata {
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
    alternates: { canonical: url, ...(d.alternatePath ? { languages } : {}) },
    openGraph: {
      title: d.title,
      description: d.description,
      url,
      siteName: "ZeniPay",
      type: "website",
      locale: d.lang === "fr" ? "fr_CA" : "en_CA",
      images: [{ url: `${BASE}/opengraph-image`, width: 1200, height: 630, alt: d.title }],
    },
    twitter: { card: "summary_large_image", title: d.title, description: d.description },
  };
}

function jsonLd(d: IntentLandingData) {
  const url = `${BASE}${d.path}`;
  const home = d.lang === "fr" ? `${BASE}/fr` : BASE;
  const crumbs = [
    { name: d.lang === "fr" ? "Accueil" : "Home", item: home },
    ...(d.path === "/fr" ? [] : [{ name: d.breadcrumb, item: url }]),
  ];
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: d.title,
        description: d.description,
        inLanguage: d.lang === "fr" ? "fr-CA" : "en-CA",
        isPartOf: { "@id": `${BASE}/#website` },
        about: { "@id": `${url}#service` },
      },
      {
        "@type": "Service",
        "@id": `${url}#service`,
        name: d.serviceName,
        serviceType: d.serviceType,
        provider: { "@id": `${BASE}/#organization` },
        areaServed: [
          { "@type": "Country", name: "Canada" },
          { "@type": "Country", name: "United States" },
        ],
        availableLanguage: ["fr", "en"],
        url,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.item })),
      },
      {
        "@type": "FAQPage",
        mainEntity: d.faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };
}

const h2Style: React.CSSProperties = {
  margin: "0 0 14px", fontFamily: zp.font.display, fontSize: "clamp(24px, 3vw, 32px)",
  fontWeight: zp.weight.semibold, letterSpacing: "-0.02em", lineHeight: 1.15, color: zp.text.primary,
};
const pStyle: React.CSSProperties = { margin: "0 0 14px", fontSize: 16, lineHeight: 1.65, color: zp.text.muted };
const primaryBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  padding: "14px 24px", borderRadius: zp.radius.sm, background: zp.gradient.main,
  color: "#fff", fontWeight: zp.weight.semibold, fontSize: 15, textDecoration: "none",
  boxShadow: "0 8px 24px rgba(15,184,201,0.28)",
};
const ghostBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  padding: "14px 24px", borderRadius: zp.radius.sm, background: "#fff",
  border: `1px solid ${zp.surface.border}`, color: zp.text.primary,
  fontWeight: zp.weight.semibold, fontSize: 15, textDecoration: "none",
};

export function IntentLanding({ d }: { d: IntentLandingData }) {
  const fr = d.lang === "fr";
  return (
    <div lang={fr ? "fr-CA" : "en-CA"} style={{ background: "#fff", color: zp.text.primary, fontFamily: zp.font.sans, minHeight: "100vh" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(d)) }} />
      <MarketingNav />

      <main>
        <section style={{ background: zp.surface.bg2, borderBottom: `1px solid ${zp.surface.border}` }}>
          <div style={{ maxWidth: 920, margin: "0 auto", padding: "56px 20px 52px" }}>
            <nav aria-label={fr ? "Fil d'Ariane" : "Breadcrumb"} style={{ fontSize: 13, color: zp.text.dim, marginBottom: 18 }}>
              <Link href={fr ? "/fr" : "/"} style={{ color: zp.text.dim }}>{fr ? "Accueil" : "Home"}</Link>
              {d.path !== "/fr" && <> <span aria-hidden>›</span> <span>{d.breadcrumb}</span></>}
              {d.alternatePath && (
                <Link href={d.alternatePath} hrefLang={fr ? "en-CA" : "fr-CA"} style={{ float: "right", color: zp.text.muted }}>
                  {fr ? "English" : "Français"}
                </Link>
              )}
            </nav>
            <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: zp.weight.bold, letterSpacing: "0.12em", textTransform: "uppercase", color: zp.brand.violet }}>
              {d.eyebrow}
            </p>
            <h1 style={{ margin: 0, fontFamily: zp.font.display, fontSize: "clamp(32px, 5vw, 52px)", fontWeight: zp.weight.semibold, letterSpacing: "-0.03em", lineHeight: 1.06 }}>
              {d.h1}
            </h1>
            <p style={{ margin: "18px 0 0", fontSize: 18, lineHeight: 1.6, color: zp.text.muted, maxWidth: 720 }}>{d.lead}</p>
            <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
              <Link href={d.primaryCta.href} style={primaryBtn}>{d.primaryCta.label}</Link>
              <Link href={d.secondaryCta.href} style={ghostBtn}>{d.secondaryCta.label}</Link>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: "24px 0 0", display: "flex", flexWrap: "wrap", gap: "8px 22px", fontSize: 14, color: zp.text.muted }}>
              {d.facts.map((f) => (
                <li key={f}><span style={{ color: zp.brand.green, fontWeight: zp.weight.bold }}>✓</span> {f}</li>
              ))}
            </ul>
          </div>
        </section>

        <div style={{ maxWidth: 920, margin: "0 auto", padding: "8px 20px 0" }}>
          {d.sections.map((s) => (
            <section key={s.h2} style={{ padding: "40px 0 8px" }}>
              <h2 style={h2Style}>{s.h2}</h2>
              {s.paragraphs?.map((p, i) => <p key={i} style={pStyle}>{p}</p>)}
              {s.bullets && (
                <ul style={{ margin: "4px 0 14px", paddingLeft: 22, fontSize: 16, lineHeight: 1.7, color: zp.text.muted }}>
                  {s.bullets.map((b) => <li key={b} style={{ marginBottom: 6 }}>{b}</li>)}
                </ul>
              )}
            </section>
          ))}

          {d.steps && (
            <section style={{ padding: "40px 0 8px" }}>
              <h2 style={h2Style}>{d.steps.h2}</h2>
              <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
                {d.steps.items.map((s, i) => (
                  <li key={s.title} style={{ padding: "20px 20px", borderRadius: zp.radius.lg, border: `1px solid ${zp.surface.border}`, background: "#fff" }}>
                    <div style={{ fontSize: 12, fontWeight: zp.weight.bold, color: zp.brand.cyan, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
                      {fr ? "Étape" : "Step"} {i + 1}
                    </div>
                    <h3 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: zp.weight.semibold }}>{s.title}</h3>
                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: zp.text.muted }}>{s.body}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section style={{ padding: "40px 0 8px" }}>
            <h2 style={h2Style}>{fr ? "Questions fréquentes" : "Frequently asked questions"}</h2>
            <div style={{ display: "grid", gap: 10 }}>
              {d.faq.map((f) => (
                <details key={f.q} style={{ padding: "16px 20px", borderRadius: 12, border: `1px solid ${zp.surface.border}`, background: "#fff" }}>
                  <summary style={{ cursor: "pointer", fontSize: 16, fontWeight: zp.weight.semibold, color: zp.text.primary }}>{f.q}</summary>
                  <p style={{ ...pStyle, margin: "10px 0 0" }}>{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section style={{ padding: "40px 0 8px" }}>
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

          <section style={{ margin: "48px 0 0", padding: "32px 24px", borderRadius: 20, background: zp.surface.heroInk, color: "#fff", textAlign: "center" }}>
            <h2 style={{ ...h2Style, color: "#fff" }}>{fr ? "Prêt à vous faire payer en ligne ?" : "Ready to get paid online?"}</h2>
            <p style={{ ...pStyle, color: "rgba(255,255,255,0.75)", maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>
              {fr
                ? "Ouvrez votre compte d'entreprise en quelques minutes, ou écrivez-nous : une vraie personne vous répond, en français ou en anglais."
                : "Open your business account in a few minutes, or write to us: a real person answers, in English or French."}
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 8 }}>
              <Link href={d.primaryCta.href} style={primaryBtn}>{d.primaryCta.label}</Link>
              <a href="mailto:info@zeniva.ca" style={{ ...ghostBtn, background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,0.3)" }}>info@zeniva.ca</a>
            </div>
          </section>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
