/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
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
