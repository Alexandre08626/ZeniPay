/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
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
      {
        source: "/app/:tab((?!accounts$|agents$|cards$|contacts$|invoices$|pay-links$|transactions$)[^/]+)/:subtab",
        destination: "/app/:subtab",
        permanent: false,
      },
      // Same idea for /sandbox/*.
      {
        source: "/sandbox/:tab((?!accounts$|agents$|cards$|contacts$|invoices$|pay-links$|transactions$)[^/]+)/:subtab",
        destination: "/sandbox/:subtab",
        permanent: false,
      },
    ];
  },
};
module.exports = nextConfig;
