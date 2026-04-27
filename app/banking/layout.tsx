import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Online business banking in Canada — accounts, payouts, AI agents",
  description:
    "Open a real business account with ZeniPay — Canadian and US routing numbers, multi-wallet architecture, ACH and wire, instant payouts (RTP/FedNow), and a built-in fleet of AI specialists for your books and cashflow.",
  keywords: [
    "online business banking Canada",
    "business bank account Canada",
    "compte bancaire entreprise Canada",
    "neobank Canada business",
    "AI business banking",
    "compte affaires en ligne Québec",
    "best business bank Canada",
    "business banking Quebec",
    "multi-wallet business account",
    "RTP business payments",
    "FedNow business",
    "business ACH Canada",
    "ZeniPay business",
    "business banking USA online",
    "Stripe alternative business banking",
  ],
  openGraph: {
    title: "Online business banking in Canada — accounts, payouts, AI agents | ZeniPay",
    description:
      "Real business accounts with routing numbers, multi-wallet, ACH/wire, instant payouts, and built-in AI specialists. Banking that thinks.",
    url: "https://zenipay.ca/banking",
    images: [{ url: "/zenipay-logo.png", width: 1200, height: 1200, alt: "ZeniPay Banking" }],
  },
  alternates: {
    canonical: "https://zenipay.ca/banking",
  },
};

export default function BankingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
