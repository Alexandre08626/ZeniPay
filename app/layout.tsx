import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ZeniPay — Accept Payments. Move Money. Scale Your Business.",
  description: "ZeniPay is modern payment and financial infrastructure for businesses. Accept cards, move money, issue payouts — all in one platform.",
  keywords: "payment gateway, business payments, online payments, payout platform, fintech, ZeniPay",
  openGraph: {
    title: "ZeniPay — Payment Infrastructure for Businesses",
    description: "Accept payments, issue payouts, and manage your business finances with ZeniPay.",
    url: "https://zenipay.ca",
    siteName: "ZeniPay",
    type: "website",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
