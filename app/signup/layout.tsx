import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get Started — Create Your ZeniPay Account",
  description:
    "Sign up for ZeniPay and start accepting payments in minutes. No setup fees, no monthly fees. Pay only per transaction. The modern payment platform for Canadian and American businesses.",
  keywords: [
    "sign up payment gateway",
    "create payment account",
    "ZeniPay signup",
    "accept payments free",
    "ouvrir compte paiement",
    "payment gateway sign up Canada",
  ],
  openGraph: {
    title: "Get Started with ZeniPay — Free Account",
    description:
      "Create your ZeniPay account and accept payments in minutes. No setup fees.",
    url: "https://zenipay.ca/signup",
  },
  alternates: {
    canonical: "https://zenipay.ca/signup",
  },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
