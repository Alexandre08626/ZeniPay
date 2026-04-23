import type { Metadata } from "next";
import { Inter, Fraunces, JetBrains_Mono } from "next/font/google";
import LangWrapper from "./components/LangWrapper";
import "@/lib/design-system/globals.css";

// Self-hosted via next/font — no runtime CDN, no layout shift.
// `variable` exposes them as CSS custom props consumed by globals.css /
// tailwind.config.ts / tokens.ts / zenipay-brand.ts.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  weight: ["400", "500", "600", "700", "800"],
});

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  weight: ["400", "500", "600", "700"],
});

// JetBrains Mono — used for amounts, IDs, and hash previews in the
// product dashboard (introduced by PR 20).
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://zenipay.ca"),
  title: {
    default: "ZeniPay Agents — The bank for AI agents at enterprise scale.",
    template: "%s | ZeniPay",
  },
  description:
    "ZeniPay Agents gives CFOs a complete banking stack for fleets of AI agents — virtual cards, multi-currency treasury, expense categorization, approval workflows, fraud detection, and a SOC2-grade signed audit trail.",
  keywords: [
    "payment gateway Canada",
    "payment processing Canada",
    "passerelle de paiement Canada",
    "accept credit card payments",
    "online payment platform",
    "Stripe alternative Canada",
    "alternative à Stripe Québec",
    "payout platform",
    "ACH payments",
    "business payments Canada",
    "payment API",
    "fintech Canada",
    "payment infrastructure",
    "accept payments online",
    "merchant services Canada",
    "paiement en ligne Canada",
    "ZeniPay",
    "payment gateway Quebec",
    "traitement de paiement",
    "send payouts Canada",
    "business banking Canada",
    "invoicing platform",
    "payment processing USA",
    "payment gateway United States",
  ],
  authors: [{ name: "ZeniPay Inc." }],
  creator: "ZeniPay Inc.",
  publisher: "ZeniPay Inc.",
  applicationName: "ZeniPay",
  category: "Finance",
  classification: "Payment Processing",
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "ZeniPay — Payment Infrastructure for Businesses",
    description:
      "Accept payments, issue payouts, and manage your business finances with ZeniPay. The modern payment platform for Canadian & American businesses.",
    url: "https://zenipay.ca",
    siteName: "ZeniPay",
    type: "website",
    locale: "en_CA",
    alternateLocale: ["fr_CA", "en_US"],
    images: [
      {
        url: "https://zenipay.ca/opengraph-image",
        width: 1200,
        height: 630,
        alt: "ZeniPay — Modern Payment Infrastructure",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ZeniPay — Accept Payments. Move Money. Scale Your Business.",
    description:
      "The modern payment platform for Canadian & American businesses. Accept cards, ACH, send payouts, manage invoices.",
    images: ["https://zenipay.ca/opengraph-image"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "64x64" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/zenipay-logo.png",
  },
  manifest: "/manifest.json",
  alternates: {
    canonical: "https://zenipay.ca",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

// JSON-LD Structured Data
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://zenipay.ca/#organization",
      name: "ZeniPay",
      url: "https://zenipay.ca",
      logo: {
        "@type": "ImageObject",
        url: "https://zenipay.ca/zenipay-logo.png",
        width: 1200,
        height: 1200,
      },
      description:
        "Modern payment and financial infrastructure for businesses. Accept cards, move money, issue payouts — all in one platform.",
      foundingDate: "2026",
      areaServed: [
        { "@type": "Country", name: "Canada" },
        { "@type": "Country", name: "United States" },
        { "@type": "AdministrativeArea", name: "Quebec" },
      ],
      sameAs: [],
    },
    {
      "@type": "WebSite",
      "@id": "https://zenipay.ca/#website",
      url: "https://zenipay.ca",
      name: "ZeniPay",
      publisher: { "@id": "https://zenipay.ca/#organization" },
      inLanguage: ["en-CA", "fr-CA", "en-US"],
    },
    {
      "@type": "SoftwareApplication",
      name: "ZeniPay",
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      url: "https://zenipay.ca",
      description:
        "Payment gateway and financial infrastructure platform for Canadian and American businesses. Accept credit cards, debit, ACH, process instant payouts, and manage invoicing.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "CAD",
        description: "Free to get started — pay only per transaction",
      },
      featureList: [
        "Accept credit card payments",
        "Accept debit payments",
        "ACH bank transfers",
        "Instant payouts (RTP/FedNow)",
        "Wire transfers",
        "Payment links",
        "Invoicing",
        "Multi-wallet architecture",
        "Real-time analytics dashboard",
        "QuickBooks integration",
        "PCI DSS Level 1 compliant",
        "135+ currencies supported",
      ],
      provider: { "@id": "https://zenipay.ca/#organization" },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is ZeniPay?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "ZeniPay is a modern payment and financial infrastructure platform for Canadian and American businesses. It allows you to accept credit card payments, debit, ACH transfers, send instant payouts, manage invoices, and handle your business finances — all in one platform.",
          },
        },
        {
          "@type": "Question",
          name: "Is ZeniPay available in Canada?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes! ZeniPay is built for Canadian businesses, with special focus on Quebec. We support Canadian payment methods, CAD processing, and comply with Canadian financial regulations.",
          },
        },
        {
          "@type": "Question",
          name: "How does ZeniPay compare to Stripe?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "ZeniPay is a modern alternative to Stripe designed specifically for Canadian and American businesses. We offer competitive transaction fees, instant payouts via RTP/FedNow, built-in invoicing, multi-wallet architecture, and dedicated support — features that Stripe charges extra for or doesn't offer.",
          },
        },
        {
          "@type": "Question",
          name: "What payment methods does ZeniPay support?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "ZeniPay supports credit cards (Visa, Mastercard, Amex), debit cards, ACH bank transfers, wire transfers, and 135+ currencies. We process payments with 99.99% uptime and under 200ms latency.",
          },
        },
        {
          "@type": "Question",
          name: "Can I send payouts with ZeniPay?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. ZeniPay supports instant payouts via ACH, real-time payments (RTP/FedNow), and wire transfers. You can pay employees, contractors, and partners individually or batch thousands of payouts at once via our API.",
          },
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-CA" className={`${inter.variable} ${fraunces.variable} ${jetbrainsMono.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          // Global body font-family now flows from globals.css :root
          // --zp-font-sans (which resolves to Inter). We set it inline
          // too for a belt-and-suspenders default.
          fontFamily: "var(--zp-font-sans)",
        }}
      >
        <LangWrapper>{children}</LangWrapper>
      </body>
    </html>
  );
}
