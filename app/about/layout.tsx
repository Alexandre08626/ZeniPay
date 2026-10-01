import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About ZeniPay — Canadian payment platform built in Québec",
  description:
    "ZeniPay Inc. is a Canadian payment technology platform founded in 2026 by Alexandre Blais in Québec: payment links, online invoicing, installments and card processing through Finix, a PCI DSS Level 1 processor.",
  keywords: [
    "about ZeniPay",
    "ZeniPay mission",
    "ZeniPay team",
    "payment platform Canada",
    "plateforme de paiement Québec",
    "fintech Canada about",
    "ZeniPay company",
    "à propos ZeniPay",
    "lien de paiement Québec",
    "Alexandre Blais ZeniPay",
    "ZeniPay Quebec",
    "Zeniva Group",
  ],
  openGraph: {
    title: "About ZeniPay — Canadian payment platform built in Québec",
    description:
      "Payment links, invoicing and installments for Canadian businesses. Made in Québec, serving Canada and the United States.",
    url: "https://zenipay.ca/about",
    images: [{ url: "/zenipay-logo.png", width: 1200, height: 1200, alt: "About ZeniPay" }],
  },
  alternates: {
    canonical: "https://zenipay.ca/about",
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
