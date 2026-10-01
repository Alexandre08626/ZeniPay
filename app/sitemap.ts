import { MetadataRoute } from "next";
import { POSTS } from "./blog/posts";
import { NEWS } from "./news/news-data";

// Sitemap for crawlers (Google, Bing, DuckDuckGo, Yandex, AI search).
// Only indexable marketing pages belong here. Pages marked noindex
// (/banking, /payouts, /accounting, /financing, /tools, /analytics,
// /transactions) and app pages (/login, /register, /signup) are left out.
// FR/EN pairs carry hreflang alternates.

const BASE = "https://zenipay.ca";

// [EN path, FR path]
const PAIRS: Array<[string, string]> = [
  ["", "/fr"],
  ["/payments", "/fr/processeur-de-paiement-canada"],
  ["/paylinks", "/fr/lien-de-paiement"],
  ["/invoices", "/fr/facturation-en-ligne"],
  ["/installments", "/fr/paiement-en-versements"],
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const paired: MetadataRoute.Sitemap = PAIRS.flatMap(([en, fr]) => {
    const languages = { "en-CA": `${BASE}${en}`, "fr-CA": `${BASE}${fr}`, "x-default": `${BASE}${en}` };
    const priority = en === "" ? 1.0 : 0.9;
    return [
      { url: `${BASE}${en}`, lastModified: now, changeFrequency: "weekly" as const, priority, alternates: { languages } },
      { url: `${BASE}${fr}`, lastModified: now, changeFrequency: "weekly" as const, priority, alternates: { languages } },
    ];
  });

  const single: Array<[string, number]> = [
    ["/pricing", 0.9],
    ["/contact", 0.8],
    ["/about", 0.8],
    ["/security", 0.7],
    ["/merchant", 0.7],
    ["/alexandre-blais", 0.6],
    ["/blog", 0.7],
    ["/news", 0.6],
    ["/docs", 0.6],
    ["/privacy", 0.3],
    ["/terms", 0.3],
  ];

  return [
    ...paired,
    ...single.map(([p, priority]) => ({ url: `${BASE}${p}`, lastModified: now, changeFrequency: "monthly" as const, priority })),
    ...POSTS.map((p) => ({
      url: `${BASE}/blog/${p.slug}`,
      lastModified: new Date(p.date),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...NEWS.map((n) => ({
      url: `${BASE}/news/${n.slug}`,
      lastModified: new Date(n.datePublished),
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
  ];
}
