import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Accounting integrations — QuickBooks, Xero, Wave, FreshBooks",
  description:
    "Sync every ZeniPay transaction to QuickBooks, Xero, Wave, or FreshBooks. Categorization, GL mapping, and period closes are handled by Leo, your AI accountant — built into every account.",
  keywords: [
    "accounting integration Canada",
    "QuickBooks integration",
    "Xero integration Canada",
    "Wave accounting",
    "FreshBooks Canada",
    "automated bookkeeping Canada",
    "AI accounting agent",
    "intégration comptable QuickBooks",
    "intégration Xero Québec",
    "comptabilité automatisée Canada",
    "GL mapping",
    "expense categorization automation",
    "tax-prep readiness",
    "small business accounting Canada",
    "ZeniPay accounting",
  ],
  openGraph: {
    title: "Accounting integrations — QuickBooks, Xero, Wave, FreshBooks | ZeniPay",
    description:
      "Sync every transaction to your accounting software, with Leo (your AI accountant) handling classification and period closes.",
    url: "https://zenipay.ca/accounting",
    images: [{ url: "/zenipay-logo.png", width: 1200, height: 1200, alt: "ZeniPay Accounting" }],
  },
  alternates: {
    canonical: "https://zenipay.ca/accounting",
  },
};

export default function AccountingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
