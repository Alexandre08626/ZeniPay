import { MetadataRoute } from "next";

// Robots policy.
//
// Public surface: crawl-allowed for every search engine and AI crawler
// we want to be findable on. Logged-in product surfaces (/app/*,
// /personal/*, /agents/* dashboard, /admin/*, /sandbox/*, /api/*) are
// off-limits — they require a session cookie anyway, so an indexed
// page would just be a useless login wall in search results.
//
// Why each crawler is named explicitly instead of relying on "*":
//   - Google, Bing, DuckDuckGo, Yandex, Baidu, Apple — search engines
//     we want ranking on.
//   - GPTBot, ClaudeBot, anthropic-ai, PerplexityBot, ChatGPT-User,
//     Google-Extended, Applebot-Extended, OAI-SearchBot — AI search /
//     answer engines. Without an explicit Allow they sometimes
//     conservatively skip a domain. Explicit consent makes us
//     citation-eligible in those products.
//   - Twitterbot, LinkedInBot, Slackbot, WhatsApp, TelegramBot —
//     social link unfurlers. They don't index but they fetch OG /
//     Twitter card metadata to render link previews.
//
// The disallow list below is the same for every UA. Anything we want
// kept out of any index goes there once.

const disallowAll = [
  "/app/",
  "/personal/",
  "/admin/",
  "/sandbox/",
  "/api/",
  "/dashboard/",
  // Logged-in agents surfaces. The marketing /agents/overview page
  // stays crawlable; only the dashboard tree is private.
  "/agents/dashboard",
  "/agents/agents",
  "/agents/accounting/chart-of-accounts",
  "/agents/accounting/mcc-mappings",
  "/agents/accounting/reports",
  "/agents/treasury",
  "/agents/wallets",
  "/agents/cards",
  "/agents/zenicards",
  "/agents/transactions",
  "/agents/ledger",
  "/agents/approvals",
  "/agents/audit",
  "/agents/fraud",
  "/agents/api-keys",
  "/agents/compliance",
  "/agents/settings",
  "/agents/login",
];

const namedBots = [
  // Search engines
  "Googlebot",
  "Bingbot",
  "DuckDuckBot",
  "Slurp",                  // Yahoo
  "YandexBot",
  "Baiduspider",
  "Applebot",
  // AI search / answer engines that drive traffic back to source URLs
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "anthropic-ai",
  "Claude-Web",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Meta-ExternalAgent",
  "FacebookBot",
  // Social link previewers (don't index, but pre-render link cards)
  "Twitterbot",
  "LinkedInBot",
  "Slackbot-LinkExpanding",
  "WhatsApp",
  "TelegramBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Default catch-all — same policy as the named bots so any
      // future crawler we don't list here still gets sane defaults.
      {
        userAgent: "*",
        allow: "/",
        disallow: disallowAll,
      },
      ...namedBots.map((ua) => ({
        userAgent: ua,
        allow: "/",
        disallow: disallowAll,
      })),
    ],
    sitemap: "https://zenipay.ca/sitemap.xml",
    host: "https://zenipay.ca",
  };
}
