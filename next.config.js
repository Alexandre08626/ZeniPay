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
};
module.exports = nextConfig;
