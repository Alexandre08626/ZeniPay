import { MetadataRoute } from "next";

// Sitemap for crawlers (Google, Bing, DuckDuckGo, Yandex, AI search).
// Priority is relative — 1.0 is the homepage, 0.9 the highest-intent
// commercial surfaces, 0.3 legal pages.

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://zenipay.ca";
  const now = new Date();

  const product = [
    "/payments",
    "/payouts",
    "/banking",
    "/invoices",
    "/paylinks",
    "/accounting",
    "/financing",
    "/security",
    "/tools",
    "/analytics",
    "/transactions",
  ];

  const agents = [
    "/agents/overview",
  ];

  const persona = [
    "/merchant",
    "/ben",
  ];

  const conversion = [
    "/pricing",
    "/signup",
    "/register",
    "/login",
    "/contact",
  ];

  const reference = [
    "/docs",
  ];

  const legal = [
    "/privacy",
    "/terms",
  ];

  const entries: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    ...product.map((p)     => ({ url: `${base}${p}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.9 })),
    ...agents.map((p)      => ({ url: `${base}${p}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.9 })),
    ...persona.map((p)     => ({ url: `${base}${p}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...conversion.map((p)  => ({ url: `${base}${p}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.9 })),
    ...reference.map((p)   => ({ url: `${base}${p}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.7 })),
    ...legal.map((p)       => ({ url: `${base}${p}`, lastModified: now, changeFrequency: "yearly"  as const, priority: 0.3 })),
  ];

  return entries;
}
