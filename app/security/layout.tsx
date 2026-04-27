import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Banking-grade security — SOC 2, PCI DSS, signed audit",
  description:
    "Every dollar at ZeniPay is protected by SOC 2-grade controls: PCI DSS Level 1 processing, encrypted-at-rest data, HMAC-signed sessions, Ed25519-signed agent payloads, RLS-isolated tenants, and an immutable signed audit chain.",
  keywords: [
    "banking security Canada",
    "SOC 2 fintech Canada",
    "PCI DSS Level 1 Canada",
    "fintech compliance Quebec",
    "FINTRAC compliance bank",
    "FinCEN compliance USA",
    "encrypted online bank Canada",
    "audit trail bank Canada",
    "secure banking online",
    "AI agent security",
    "Ed25519 signed payments",
    "row-level security fintech",
    "online bank fraud protection",
    "sécurité banque en ligne Québec",
    "ZeniPay security",
  ],
  openGraph: {
    title: "Banking-grade security — SOC 2, PCI DSS, signed audit | ZeniPay",
    description:
      "PCI DSS Level 1, SOC 2 controls, encrypted at rest, HMAC sessions, Ed25519 agent signatures, immutable audit.",
    url: "https://zenipay.ca/security",
    images: [{ url: "/zenipay-logo.png", width: 1200, height: 1200, alt: "ZeniPay Security" }],
  },
  alternates: {
    canonical: "https://zenipay.ca/security",
  },
};

export default function SecurityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
