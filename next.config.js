/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
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
      // Catch stale /app/{tab}/{subtab} URLs → redirect to /app/{subtab}
      {
        source: "/app/:tab/:subtab",
        destination: "/app/:subtab",
        permanent: false,
      },
      // Catch stale /sandbox/{tab}/{subtab} URLs → redirect to /sandbox/{subtab}
      {
        source: "/sandbox/:tab/:subtab",
        destination: "/sandbox/:subtab",
        permanent: false,
      },
    ];
  },
};
module.exports = nextConfig;
