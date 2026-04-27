import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Working capital + invoice financing for online businesses",
  description:
    "Get working-capital advances and invoice financing without leaving your bank. ZeniPay's revenue-based financing is underwritten on your real ZeniPay activity — no paperwork, no personal guarantees, repaid as a fixed slice of incoming payments.",
  keywords: [
    "business financing Canada",
    "working capital Canada",
    "invoice financing Canada",
    "revenue-based financing",
    "merchant cash advance Canada",
    "financement entreprise Québec",
    "avance de fonds entreprise",
    "factoring Canada",
    "online business loan Canada",
    "fintech financing Quebec",
    "ZeniPay financing",
    "fast business funding Canada",
    "no-paperwork business funding",
    "financement chiffre d'affaires",
  ],
  openGraph: {
    title: "Working capital + invoice financing for online businesses | ZeniPay",
    description:
      "Revenue-based financing underwritten on your live ZeniPay activity. No paperwork, no personal guarantees.",
    url: "https://zenipay.ca/financing",
    images: [{ url: "/zenipay-logo.png", width: 1200, height: 1200, alt: "ZeniPay Financing" }],
  },
  alternates: {
    canonical: "https://zenipay.ca/financing",
  },
};

export default function FinancingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
