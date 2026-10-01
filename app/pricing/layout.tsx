import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — payment links, invoicing and card processing",
  description:
    "ZeniPay pricing for Canadian businesses: open a business account at no charge, then per-payment processing fees quoted for your business. Payment links, invoices and installments included.",
  keywords: [
    "ZeniPay pricing",
    "payment link pricing Canada",
    "transaction fees Canada",
    "payment processing fees Canada",
    "frais de paiement en ligne Canada",
    "tarifs lien de paiement Québec",
    "Stripe pricing alternative Canada",
    "invoicing software pricing Canada",
    "payment fees ACH Canada",
    "credit card processing rates Canada",
    "tarification ZeniPay",
  ],
  openGraph: {
    title: "Pricing — payment links, invoicing and card processing | ZeniPay",
    description:
      "Business account at no charge; per-payment processing fees quoted for your business.",
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
