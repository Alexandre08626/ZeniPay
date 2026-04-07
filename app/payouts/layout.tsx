import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Instant Payouts — ACH, RTP, FedNow, Wire Transfers",
  description:
    "Send instant payouts to employees, contractors, and partners via ACH, real-time payments (RTP/FedNow), and wire transfers. Batch thousands of payouts with a single API call. The fastest payout platform in Canada and the US.",
  keywords: [
    "instant payouts Canada",
    "send payouts",
    "ACH payouts",
    "RTP real-time payments",
    "FedNow payments",
    "wire transfer API",
    "mass payouts",
    "batch payouts",
    "payout platform Canada",
    "pay contractors Canada",
    "paiement instantané",
    "virement bancaire API",
    "employee payouts",
    "marketplace payouts",
    "payout API",
  ],
  openGraph: {
    title: "Instant Payouts — ACH, RTP, FedNow, Wire | ZeniPay",
    description:
      "Send instant payouts via ACH, RTP/FedNow, and wire. Batch thousands at once. The fastest payout platform for Canadian & American businesses.",
    url: "https://zenipay.ca/payouts",
    images: [{ url: "/zenipay-logo.png", width: 1200, height: 1200, alt: "ZeniPay Payouts" }],
  },
  alternates: {
    canonical: "https://zenipay.ca/payouts",
  },
};

export default function PayoutsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
