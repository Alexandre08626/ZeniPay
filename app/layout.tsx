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
    default: "ZeniPay — The first online bank with AI-intelligent wallets",
    template: "%s | ZeniPay",
  },
  description:
    "ZeniPay is the first online bank where every account ships with a fleet of AI specialists. Personal and business banking in Canada and the US — with built-in agents for accounting, finance, security, compliance, and revenue intelligence. Move money, run your books, get answers — instantly.",
  keywords: [
    // Core positioning — online bank with AI
    "online bank Canada",
    "online bank with AI",
    "AI banking",
    "AI bank Canada",
    "AI wallet",
    "intelligent banking",
    "AI-powered bank",
    "neobank Canada",
    "neobank Quebec",
    "first online bank with AI agents",
    "AI financial assistant",
    "personal banking AI",
    "business banking AI",
    // FR
    "banque en ligne Canada",
    "banque en ligne Québec",
    "banque IA",
    "première banque IA",
    "wallet intelligent",
    "néobanque Québec",
    "néobanque Canada",
    "banque numérique Québec",
    "compte bancaire en ligne",
    "compte bancaire entreprise en ligne",
    "agents IA financiers",
    // Core product surfaces (still relevant for keyword breadth)
    "online business banking Canada",
    "personal account online Canada",
    "best online bank Canada",
    "fintech Canada",
    "fintech Quebec",
    "Stripe alternative Canada",
    "alternative à Stripe Québec",
    "payment gateway Canada",
    "passerelle de paiement Canada",
    "accept credit card payments",
    "ACH payments Canada",
    "instant payouts Canada",
    "send payouts Canada",
    "invoicing platform Canada",
    "merchant services Canada",
    "ZeniPay",
  ],
  authors: [{ name: "ZeniPay Inc." }],
  creator: "ZeniPay Inc.",
  publisher: "ZeniPay Inc.",
  applicationName: "ZeniPay",
  category: "Banking",
  classification: "Online Banking",
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "ZeniPay — The first online bank with AI-intelligent wallets",
    description:
      "Personal and business banking in Canada and the US — with a built-in fleet of AI specialists for accounting, finance, security, compliance, and revenue. Move money, run your books, get answers — instantly.",
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
        alt: "ZeniPay — The first online bank with AI-intelligent wallets",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ZeniPay — The first online bank with AI wallets",
    description:
      "Banking that thinks. Personal and business accounts with a fleet of AI specialists built in — accounting, finance, security, compliance, revenue.",
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
    languages: {
      "en-CA": "https://zenipay.ca",
      "fr-CA": "https://zenipay.ca",
      "en-US": "https://zenipay.ca",
    },
  },
  robots: {
    index: true,
    follow: true,
    "max-video-preview": -1,
    "max-image-preview": "large",
    "max-snippet": -1,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

// JSON-LD Structured Data — Organization + WebSite + FinancialService +
// SoftwareApplication + FAQPage. This is what AI search engines
// (ChatGPT, Perplexity, Claude.ai, Bing AI) and Google rich results
// pull verbatim, so the copy here IS the SEO surface.

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://zenipay.ca/#organization",
      name: "ZeniPay",
      legalName: "ZeniPay Inc.",
      url: "https://zenipay.ca",
      logo: {
        "@type": "ImageObject",
        url: "https://zenipay.ca/zenipay-logo.png",
        width: 1200,
        height: 1200,
      },
      description:
        "ZeniPay is the first online bank with AI-intelligent wallets. Personal and business banking in Canada and the US, with a built-in fleet of AI specialists for accounting, finance, security, compliance, and revenue intelligence.",
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
      "@type": "FinancialService",
      "@id": "https://zenipay.ca/#financial-service",
      name: "ZeniPay — Online bank with AI wallets",
      url: "https://zenipay.ca",
      description:
        "Online bank for personal and business accounts in Canada and the US. Every account ships with a fleet of AI specialists (Leo accountant, Ben finance, Atlas security, Vera compliance, Kai revenue) that read live account data and answer in plain language.",
      provider: { "@id": "https://zenipay.ca/#organization" },
      areaServed: [
        { "@type": "Country", name: "Canada" },
        { "@type": "Country", name: "United States" },
      ],
      currenciesAccepted: "CAD, USD",
      paymentAccepted: "Credit Card, Debit Card, ACH, Wire Transfer, RTP, FedNow",
      serviceType: [
        "Personal banking",
        "Business banking",
        "Payment processing",
        "Payouts",
        "AI financial assistance",
      ],
    },
    {
      "@type": "SoftwareApplication",
      name: "ZeniPay",
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      url: "https://zenipay.ca",
      description:
        "The first online bank with AI-intelligent wallets. Personal and business banking with a fleet of AI specialists for accounting, finance, security, compliance, and revenue intelligence — built into every account.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "CAD",
        description: "Free to open — personal accounts include 5 AI agents at no cost",
      },
      featureList: [
        "Online personal accounts (Canada & US)",
        "Online business accounts (Canada & US)",
        "5 AI specialists per personal account (Leo, Ben, Atlas, Vera, Kai)",
        "Up to 9 AI specialists per business account",
        "AI agents read live account data via tool calls",
        "Persistent chat history per agent",
        "Accept credit card and debit payments",
        "ACH bank transfers + wire transfers",
        "Instant payouts (RTP / FedNow)",
        "Payment links + invoicing",
        "Multi-wallet architecture",
        "Real-time activity feed",
        "QuickBooks / Xero / Wave / FreshBooks integration",
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
            text: "ZeniPay is the first online bank with AI-intelligent wallets. Every personal and business account ships with a fleet of specialized AI agents — accountant, finance, security, compliance, revenue — that read your live account data and answer your questions in plain language. ZeniPay also handles full banking operations: payments, payouts, ACH, wire transfers, invoicing, and 135+ currencies for Canadian and American customers.",
          },
        },
        {
          "@type": "Question",
          name: "What makes ZeniPay different from a regular online bank?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "ZeniPay is the first online bank to build AI specialists directly into every account. Instead of searching FAQs or waiting for a human agent, you talk to Leo about your bookkeeping, Ben about cashflow, Atlas about security, Vera about compliance, and Kai about revenue — and they answer using your real account data. Personal accounts come with 5 agents at no extra cost; business accounts can scale up to 9 specialists.",
          },
        },
        {
          "@type": "Question",
          name: "Is ZeniPay available in Canada?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. ZeniPay is built first for Canada, with special focus on Quebec — bilingual (English / French) interface, CAD processing, FINTRAC-aligned compliance, Interac and ACH support. We also serve American businesses with USD processing, FedNow / RTP, and FinCEN-aligned compliance.",
          },
        },
        {
          "@type": "Question",
          name: "How does ZeniPay compare to Stripe or Wise?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Stripe is a payment processor; Wise is a money-transfer service. ZeniPay is an actual online bank — you open a real account with a routing number, hold balances, send and receive money, and access AI specialists who understand your account. Where Stripe charges extra for invoicing or analytics, ZeniPay includes them; where Wise stops at currency conversion, ZeniPay gives you a full banking surface plus AI agents that interpret your numbers.",
          },
        },
        {
          "@type": "Question",
          name: "What can the AI agents actually do?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Each agent has a specialty and can read your live ZeniPay data. Leo (accountant) classifies expenses, prepares period closes, and helps with tax-prep readiness. Ben (finance) tracks cashflow, balances, and savings strategy. Atlas (security) flags fraud signals and walks you through incident response. Vera (compliance) answers KYC and regulatory questions. Kai (revenue intelligence) forecasts income and savings targets. They detect French or English from your first message and reply in that language.",
          },
        },
        {
          "@type": "Question",
          name: "Is my money safe with ZeniPay?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. ZeniPay is PCI DSS Level 1 compliant, encrypts data in transit and at rest, enforces SOC2-grade signed audit trails, and uses HMAC-signed sessions plus Supabase Auth for account access. Every API endpoint is session-bound — no merchant can read another tenant's data, ever. AI agents only read data scoped to your own account, never anyone else's.",
          },
        },
        {
          "@type": "Question",
          name: "How do I open a personal account?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Visit zenipay.ca/register?type=personal and complete the 2-step signup — email, password, name, country (Canada or US), age confirmation, then your DOB, phone, address, and SIN/SSN tail for identity verification. The account is live in under 2 minutes and ships with 5 AI specialists ready to help.",
          },
        },
        {
          "@type": "Question",
          name: "How do I open a business account?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Visit zenipay.ca/register and complete the 3-step business signup — account, business details (legal name, EIN/BN, address, industry), and identity verification. Your account is created with a real ZeniPay routing number, both Test and Live API keys, and full access to invoicing, payouts, and the AI agent fleet.",
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
