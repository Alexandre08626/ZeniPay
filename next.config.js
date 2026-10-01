/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Les images Open Graph lisent le logo sur disque : sans ceci, il n'est pas
  // copié dans la fonction Vercel (ENOENT → 500 sur /opengraph-image).
  experimental: {
    outputFileTracingIncludes: {
      "/opengraph-image": ["./public/zenipay-logo-nobg.png"],
      "/docs/opengraph-image": ["./public/zenipay-logo-nobg.png"],
      "/payments/opengraph-image": ["./public/zenipay-logo-nobg.png"],
      "/payouts/opengraph-image": ["./public/zenipay-logo-nobg.png"],
    },
  },
  async redirects() {
    return [
      // Communiqué retiré : il annonçait une répartition automatique des commissions pas encore construite.
      {
        source: "/news/zenipay-commission-splits-for-platforms",
        destination: "/news",
        permanent: true,
      },
      // Agents retired 2026-09-27 — Orvel replaces it.
      { source: "/agents", destination: "/app/orvel", permanent: false },
      // Pages only — /agents/*.png avatars in public/ must keep loading.
      { source: "/agents/:path((?!.*\\.(?:png|jpe?g|svg|webp|gif)$).*)", destination: "/app/orvel", permanent: false },
      // /app root → overview (matches PR 13 neobank IA).
      {
        source: "/app",
        destination: "/app/overview",
        permanent: false,
      },
      // /app/dashboard → /app/overview (old naming, keep it working).
      {
        source: "/app/dashboard",
        destination: "/app/overview",
        permanent: false,
      },
      {
        source: "/sandbox/dashboard",
        destination: "/sandbox/overview",
        permanent: false,
      },
      // /app/payouts is retired — the payouts feature lives inside
      // /app/wallets (Banking → Send Money + transaction history).
      {
        source: "/app/payouts",
        destination: "/app/wallets",
        permanent: false,
      },
      {
        source: "/sandbox/payouts",
        destination: "/sandbox/wallets",
        permanent: false,
      },
      // Catch stale /app/{tab}/{subtab} URLs → redirect to /app/{subtab}.
      // EXCLUDE routes that have legitimate dynamic children, otherwise we
      // eat valid IDs (e.g. /app/accounts/acct_123 would redirect to
      // /app/acct_123 and land on the catch-all ZenivaComplete renderer).
      //
      // Previous attempt used `accounts$` inside a negative lookahead, but
      // the `$` anchors to end-of-URL (not end-of-segment) in path-to-regexp
      // — `/app/accounts/ACC-123` still matched because `accounts$` only
      // asserts when `accounts` is the very last character of the whole
      // URL. We now anchor on the next `/` (which path-to-regexp always
      // requires before :subtab) using `(?=/)`.
      {
        source: "/app/:tab((?!accounts(?=/)|agents(?=/)|cards(?=/)|contacts(?=/)|invoices(?=/)|pay-links(?=/)|transactions(?=/))[^/]+)/:subtab",
        destination: "/app/:subtab",
        permanent: false,
      },
      // Same idea for /sandbox/*.
      {
        source: "/sandbox/:tab((?!accounts(?=/)|agents(?=/)|cards(?=/)|contacts(?=/)|invoices(?=/)|pay-links(?=/)|transactions(?=/))[^/]+)/:subtab",
        destination: "/sandbox/:subtab",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      // 🚀 Zeniva Dev Dashboard — internal employee tool
      // Proxy /zeniva/dev/* to the dashboard server
      // Update the destination URL when deployed (Railway/VPS)
      {
        source: "/zeniva/dev/:path*",
        destination: `${process.env.DEV_DASHBOARD_URL || "http://localhost:4567"}/:path*`,
      },
    ];
  },
};
module.exports = nextConfig;
