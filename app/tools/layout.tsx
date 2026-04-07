import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Financial Tools — Dashboard, Invoicing, Accounting, Analytics",
  description:
    "Manage your business finances with ZeniPay's complete financial tools. Real-time dashboard, automated invoicing, multi-wallet architecture, commission splits, reconciliation, and QuickBooks export — all built in.",
  keywords: [
    "business financial tools",
    "payment dashboard",
    "invoicing platform Canada",
    "business analytics",
    "QuickBooks integration payments",
    "multi-wallet payment",
    "automated invoicing",
    "commission splits",
    "payment reconciliation",
    "facturation automatique",
    "outils financiers entreprise",
    "tableau de bord paiement",
    "accounting tools Canada",
    "business banking tools",
  ],
  openGraph: {
    title: "Financial Tools — Dashboard, Invoicing, Analytics | ZeniPay",
    description:
      "Complete financial command center. Real-time dashboards, invoicing, analytics, multi-wallet, and QuickBooks integration.",
    url: "https://zenipay.ca/tools",
    images: [{ url: "/zenipay-logo.png", width: 1200, height: 1200, alt: "ZeniPay Tools" }],
  },
  alternates: {
    canonical: "https://zenipay.ca/tools",
  },
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
