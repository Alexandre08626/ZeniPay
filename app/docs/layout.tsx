import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Documentation — Payment API, Payout API, Webhooks",
  description:
    "ZeniPay API documentation. Integrate payments, payouts, invoicing, and webhooks into your application. RESTful API with sandbox environment, test cards, and comprehensive guides. Accept your first payment in under 10 minutes.",
  keywords: [
    "payment API documentation",
    "payment API Canada",
    "REST API payments",
    "payout API",
    "webhook integration",
    "payment SDK",
    "sandbox testing payments",
    "API paiement",
    "documentation API paiement",
    "integrate payment gateway",
    "developer payment platform",
  ],
  openGraph: {
    title: "API Documentation — Payment & Payout API | ZeniPay",
    description:
      "Integrate payments and payouts into your app. RESTful API, sandbox environment, and comprehensive guides.",
    url: "https://zenipay.ca/docs",
    images: [{ url: "/zenipay-logo.png", width: 1200, height: 1200, alt: "ZeniPay API Docs" }],
  },
  alternates: {
    canonical: "https://zenipay.ca/docs",
  },
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
