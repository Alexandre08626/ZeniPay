import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Agent Wallet Platform — wallets for your AI fleet",
  description:
    "Stop hard-coding API keys and credit cards into your AI agents. ZeniPay gives every agent its own real wallet, spending controls, and a signed audit trail — purpose-built for the autonomous economy.",
  keywords: [
    "AI agent wallet",
    "wallet for AI agents",
    "autonomous agent payments",
    "spending controls AI agent",
    "agent banking",
    "AI agent banking platform",
    "AI agent treasury",
    "machine economy bank",
    "wallets for autonomous software",
    "ZeniPay agents",
    "agent virtual cards",
    "agent expense controls",
    "AI fleet banking",
    "agent transactions audit trail",
  ],
  openGraph: {
    title: "AI Agent Wallet Platform — wallets for your AI fleet | ZeniPay",
    description:
      "Real wallets, spending controls, and signed audit trails for every AI agent. The bank for the autonomous economy.",
    url: "https://zenipay.ca/agents/overview",
    images: [{ url: "/zenipay-logo.png", width: 1200, height: 1200, alt: "ZeniPay AI Agent Wallets" }],
  },
  alternates: {
    canonical: "https://zenipay.ca/agents/overview",
  },
};

export default function AgentsOverviewLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
