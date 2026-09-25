import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Accept Payments Online — Credit Card, Debit, ACH",
  description:
    "Accept credit card, debit card and ACH payments online with ZeniPay, for Canadian and American businesses. Card processing through Finix, a PCI DSS Level 1 processor.",
  keywords: [
    "accept credit card payments Canada",
    "payment gateway Canada",
    "online payment processing",
    "accept payments online",
    "credit card processing Canada",
    "debit card payments",
    "ACH payment processing",
    "Stripe alternative Canada",
    "passerelle de paiement",
    "accepter paiements en ligne",
    "traitement carte de crédit Canada",
    "payment API Canada",
    "PCI DSS compliant payment",
    "ecommerce payment gateway",
    "accept Visa Mastercard Canada",
  ],
  openGraph: {
    title: "Accept Payments Online — Credit Card, Debit, ACH | ZeniPay",
    description:
      "Accept credit card, debit and ACH payments. The payment gateway for Canadian & American businesses.",
    url: "https://zenipay.ca/payments",
    images: [{ url: "/zenipay-logo.png", width: 1200, height: 1200, alt: "ZeniPay Payments" }],
  },
  alternates: {
    canonical: "https://zenipay.ca/payments",
  },
};

export default function PaymentsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
