import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog — card fees, invoicing and getting paid in Canada",
  description:
    "Guides for Canadian small businesses on card processing fees, online invoicing, deposits and paying partners, from the ZeniPay team in Québec. English and French.",
  keywords: [
    "fintech blog Canada",
    "blog banque IA Québec",
    "ZeniPay blog",
    "AI agent finance",
    "Stripe alternative blog",
    "blogue fintech Québec",
    "neobanque Québec blog",
    "AI accountant",
    "wallet IA",
  ],
  openGraph: {
    title: "Blog — card fees, invoicing and getting paid in Canada | ZeniPay",
    description:
      "Card fees, invoicing and payments guides for Canadian small businesses. EN/FR.",
    url: "https://zenipay.ca/blog",
    images: [{ url: "/zenipay-logo.png", width: 1200, height: 1200, alt: "ZeniPay Blog" }],
  },
  alternates: {
    canonical: "https://zenipay.ca/blog",
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
