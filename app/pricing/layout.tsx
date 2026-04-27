import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Free to start, scale as you grow",
  description:
    "ZeniPay is free to open. Personal accounts include 5 AI specialists at no cost. Business accounts pay only per transaction (cards 2.7% + 30¢, ACH 0.8%). No monthly fees, no setup, no contracts — pricing built for Canadian and American businesses.",
  keywords: [
    "ZeniPay pricing",
    "online bank pricing Canada",
    "transaction fees Canada",
    "payment processing fees Canada",
    "frais de paiement en ligne Canada",
    "tarifs banque en ligne Québec",
    "Stripe pricing alternative Canada",
    "no monthly fee bank Canada",
    "free business account Canada",
    "business banking fees Canada",
    "AI bank pricing",
    "payment fees ACH Canada",
    "credit card processing rates Canada",
    "neobank fees Canada",
    "tarification ZeniPay",
  ],
  openGraph: {
    title: "Pricing — Free to start, scale as you grow | ZeniPay",
    description:
      "Free to open. 5 AI agents included on personal accounts. Business pays per transaction — no monthly fee, no setup.",
    url: "https://zenipay.ca/pricing",
    images: [{ url: "/zenipay-logo.png", width: 1200, height: 1200, alt: "ZeniPay Pricing" }],
  },
  alternates: {
    canonical: "https://zenipay.ca/pricing",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
