import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact ZeniPay — payment links, invoicing and card processing",
  description:
    "Questions about payment links, online invoicing, installments or card processing for your business? Write to the ZeniPay team in Québec, in French or English: info@zeniva.ca.",
  keywords: [
    "contact ZeniPay",
    "ZeniPay support",
    "payment processor contact Canada",
    "fintech support Quebec",
    "contacter processeur de paiement Québec",
    "ZeniPay sales",
    "fintech Canada partnership",
    "payment links demo",
    "ZeniPay media inquiry",
    "payment platform support Canada",
    "lien de paiement Québec contact",
  ],
  openGraph: {
    title: "Contact ZeniPay — payment links, invoicing and card processing",
    description:
      "Sales, support and partnerships. Bilingual team based in Québec.",
    url: "https://zenipay.ca/contact",
    images: [{ url: "/zenipay-logo.png", width: 1200, height: 1200, alt: "Contact ZeniPay" }],
  },
  alternates: {
    canonical: "https://zenipay.ca/contact",
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
