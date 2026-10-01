import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Security — PCI DSS Level 1 processing, signed audit trail",
  description:
    "ZeniPay's security: card processing through a PCI DSS Level 1 processor, encrypted-at-rest data, HMAC-signed sessions, Ed25519-signed agent payloads, RLS-isolated tenants, and an immutable signed audit chain.",
  keywords: [
    "payment platform security Canada",
    "PCI DSS Level 1 Canada",
    "fintech compliance Quebec",
    "payment security Canada",
    "FinCEN compliance USA",
    "PCI DSS Level 1 processor Canada",
    "AI agent security",
    "Ed25519 signed payments",
    "row-level security fintech",
    "payment fraud protection",
    "sécurité paiement en ligne Québec",
    "ZeniPay security",
  ],
  openGraph: {
    title: "Security — PCI DSS Level 1 processing, signed audit trail | ZeniPay",
    description:
      "PCI DSS Level 1 processor, encrypted at rest, HMAC sessions, Ed25519 agent signatures, immutable audit.",
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
