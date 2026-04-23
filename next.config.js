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
