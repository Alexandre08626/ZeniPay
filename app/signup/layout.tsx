import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get Started — Create Your ZeniPay Account",
  description:
    "Create your ZeniPay business account: payment links, online invoicing and installments for Canadian businesses. Cards processed by Finix, a PCI DSS Level 1 processor.",
  keywords: [
    "sign up payment gateway",
    "create payment account",
    "ZeniPay signup",
    
    "ouvrir compte paiement",
    "payment gateway sign up Canada",
  ],
  openGraph: {
    title: "Get Started with ZeniPay",
    description:
      "Create your ZeniPay account: payment links, invoicing and installments.",
    url: "https://zenipay.ca/signup",
  },
  alternates: {
    canonical: "https://zenipay.ca/signup",
  },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
