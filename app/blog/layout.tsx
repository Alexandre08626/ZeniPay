import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog — AI banking, fintech, and product updates",
  description:
    "Insights on AI banking, neobanking in Canada and the US, AI agents in finance, and ZeniPay product updates. Bilingual English / French content.",
  keywords: [
    "AI banking blog",
    "fintech blog Canada",
    "blog banque IA Québec",
    "neobank insights",
    "ZeniPay blog",
    "AI agent finance",
    "Stripe alternative blog",
    "online banking Canada",
    "blogue fintech Québec",
    "AI banking Canada",
    "neobanque Québec blog",
    "AI accountant",
    "wallet IA",
  ],
  openGraph: {
    title: "Blog — AI banking, fintech, and product updates | ZeniPay",
    description:
      "AI banking, neobanking, and product updates from ZeniPay. Bilingual EN/FR.",
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
