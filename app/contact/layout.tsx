import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact ZeniPay — talk to a banking specialist",
  description:
    "Reach the ZeniPay team for sales, support, partnerships, or media. Bilingual (English / French) team based in Quebec, serving Canadian and American businesses. Expect a reply within one business day.",
  keywords: [
    "contact ZeniPay",
    "ZeniPay support",
    "online bank contact Canada",
    "fintech support Quebec",
    "contacter banque en ligne Canada",
    "ZeniPay sales",
    "fintech Canada partnership",
    "AI banking demo",
    "ZeniPay media inquiry",
    "online bank customer service Canada",
    "neobank Quebec contact",
  ],
  openGraph: {
    title: "Contact ZeniPay — talk to a banking specialist | ZeniPay",
    description:
      "Sales, support, partnerships, media. Bilingual team, replies within one business day.",
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
