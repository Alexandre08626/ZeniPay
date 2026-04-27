import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Payment links — accept payments without a website",
  description:
    "Create a ZeniPay payment link in 30 seconds. Share by email, SMS, or QR code. Customers pay by credit card, debit, or ACH — funds settle to your ZeniPay account. No website, no integration required.",
  keywords: [
    "payment links Canada",
    "lien de paiement Canada",
    "lien de paiement Québec",
    "Stripe payment link alternative",
    "accept payment without website",
    "QR code payment Canada",
    "invoicing link",
    "freelancer payment Canada",
    "small business payment link",
    "online checkout link",
    "send invoice link",
    "ZeniPay paylinks",
    "checkout link Canada",
    "payment URL Canada",
  ],
  openGraph: {
    title: "Payment links — accept payments without a website | ZeniPay",
    description:
      "30-second payment links. Share by email, SMS, or QR. Cards, debit, ACH. No website, no integration.",
    url: "https://zenipay.ca/paylinks",
    images: [{ url: "/zenipay-logo.png", width: 1200, height: 1200, alt: "ZeniPay Pay Links" }],
  },
  alternates: {
    canonical: "https://zenipay.ca/paylinks",
  },
};

export default function PaylinksLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
