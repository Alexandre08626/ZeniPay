import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About ZeniPay — the first online bank with AI wallets",
  description:
    "ZeniPay is the first online bank to give every account a fleet of AI specialists. Our mission: make banking that thinks the new default for personal and business customers in Canada and the US.",
  keywords: [
    "about ZeniPay",
    "ZeniPay mission",
    "ZeniPay team",
    "online bank Canada team",
    "neobank Quebec story",
    "fintech Canada about",
    "ZeniPay company",
    "à propos ZeniPay",
    "première banque IA",
    "founder online bank Canada",
    "ZeniPay Quebec",
    "AI banking pioneer",
  ],
  openGraph: {
    title: "About ZeniPay — the first online bank with AI wallets | ZeniPay",
    description:
      "Banking that thinks. We give every account a fleet of AI specialists. Made in Quebec, serving Canada and the United States.",
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
