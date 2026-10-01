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

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1633" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL("https://zenipay.ca"),
  title: {
    default: "ZeniPay — Payment links, online invoicing and installments for Canadian businesses",
    template: "%s | ZeniPay",
  },
  description:
    "ZeniPay is a Canadian payment platform for small businesses and online stores: payment links, online invoicing, deposits and installments, card and bank transfer payments. Cards processed by Finix, a PCI DSS Level 1 processor. CAD and USD. Made in Québec.",
  keywords: [
    "payment links Canada",
    "lien de paiement",
    "lien de paiement Québec",
    "online invoicing Canada",
    "facturation en ligne",
    "logiciel de facturation PME Québec",
    "installment payments small business",
    "paiement en versements",
    "dépôt facture entrepreneur",
    "payment processor Canada",
    "processeur de paiement Canada",
    "accept credit card payments Canada",
    "accepter les cartes de crédit PME",
    "QR code payment Canada",
    "ZeniPay",
  ],
  authors: [{ name: "ZeniPay Inc." }],
  creator: "ZeniPay Inc.",
  publisher: "ZeniPay Inc.",
  applicationName: "ZeniPay",
  category: "Finance",
  classification: "Payment platform",
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "ZeniPay — Payment links, online invoicing and installments",
    description:
      "Send a link or an invoice, get paid by card or bank transfer, split big jobs into installments. Cards processed by Finix (PCI DSS Level 1). Made in Québec.",
    url: "https://zenipay.ca",
    siteName: "ZeniPay",
    type: "website",
    locale: "en_CA",
    alternateLocale: ["fr_CA"],
    images: [
      {
        url: "https://zenipay.ca/opengraph-image",
        width: 1200,
        height: 630,
        alt: "ZeniPay — payment links, invoicing and installments",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ZeniPay — Payment links, online invoicing and installments",
    description:
      "Canadian payment platform: payment links, invoices with a pay button, deposits and installments. Made in Québec.",
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
      // Umbrella entity — same @id is declared on zenivatravel.com, zeniva.ca and zenitech.dev
      // so AI engines resolve ZeniPay to the right parent (and not to ZenPay / Zen.com lookalikes).
      "@type": "Organization",
      "@id": "https://www.zeniva.ca/#group",
      name: "Zeniva Group",
      alternateName: ["Groupe Zeniva"],
      url: "https://www.zeniva.ca/groupe",
      description:
        "Zeniva Group (Groupe Zeniva) is the parent group founded by Alexandre Blais. It operates Zeniva Travel (travel agency), ZeniPay (payment technology platform, Canada & USA), ZeniCorp (construction and renovation platform, Quebec) and Zenitech (web, app and AI agency).",
      founder: { "@id": "https://www.zenivatravel.com/alexandre-blais#person" },
      subOrganization: [
        { "@id": "https://www.zenivatravel.com/#organization" },
        { "@id": "https://zenipay.ca/#organization" },
        { "@id": "https://www.zeniva.ca/#organization" },
        { "@id": "https://zenitech.dev/#organization" },
      ],
    },
    {
      "@type": "Organization",
      "@id": "https://zenipay.ca/#organization",
      name: "ZeniPay",
      // Disambiguation: ZeniPay is frequently confused with ZenPay, Zen.com and Zenus Bank.
      alternateName: ["ZeniPay Inc.", "Zeni Pay"],
      legalName: "ZeniPay Inc.",
      url: "https://zenipay.ca",
      parentOrganization: { "@id": "https://www.zeniva.ca/#group" },
      founder: { "@id": "https://www.zenivatravel.com/alexandre-blais#person" },
      email: "info@zeniva.ca",
      logo: {
        "@type": "ImageObject",
        url: "https://zenipay.ca/zenipay-logo.png",
        width: 1200,
        height: 1200,
      },
      description:
        "ZeniPay is a Canadian payment platform for small businesses and online stores: payment links, online invoicing, deposits and installments, card and bank transfer payments. Cards processed by Finix, a PCI DSS Level 1 processor. CAD and USD. Made in Québec. ZeniPay is not a bank.",
      foundingDate: "2026",
      areaServed: [
        { "@type": "Country", name: "Canada" },
        { "@type": "Country", name: "United States" },
        { "@type": "AdministrativeArea", name: "Quebec" },
      ],
      knowsLanguage: ["fr", "en"],
      // TODO(Alexandre): add ZeniPay's own LinkedIn / X / Crunchbase profiles once created.
      // Until then the founder page is the only external anchor that disambiguates the brand.
      sameAs: [
        "https://www.zenivatravel.com/alexandre-blais",
        "https://www.zeniva.ca/alexandre-blais",
      ],
    },
    {
      "@type": "WebSite",
      "@id": "https://zenipay.ca/#website",
      url: "https://zenipay.ca",
      name: "ZeniPay",
      publisher: { "@id": "https://zenipay.ca/#organization" },
      inLanguage: ["en-CA", "fr-CA"],
    },
    {
      "@type": "FinancialService",
      "@id": "https://zenipay.ca/#financial-service",
      name: "ZeniPay — payment platform for small businesses",
      url: "https://zenipay.ca",
      description:
        "Payment links, online invoicing, deposits and 2 to 12 installments, card and bank transfer (EFT) payments for Canadian businesses. Card payments processed by Finix, a PCI DSS Level 1 processor. Includes Orvel, an AI assistant that drafts invoices and sends payment links on request.",
      provider: { "@id": "https://zenipay.ca/#organization" },
      areaServed: [
        { "@type": "Country", name: "Canada" },
        { "@type": "Country", name: "United States" },
      ],
      currenciesAccepted: "CAD, USD",
      paymentAccepted: "Credit Card, Debit Card, Bank transfer (EFT)",
      serviceType: [
        "Payment links",
        "Online invoicing",
        "Installment payments",
        "Payment processing",
      ],
    },
    {
      "@type": "SoftwareApplication",
      name: "ZeniPay",
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      url: "https://zenipay.ca",
      description:
        "Web app for Canadian businesses to send payment links and invoices, split invoices into installments and accept card and bank transfer payments.",
      featureList: [
        "Payment links with QR code and optional expiry date",
        "Invoices emailed with a pay button",
        "Deposits and 2 to 12 installments per invoice",
        "Automatic reminders 3 and 7 days after an unpaid installment",
        "Card payments processed by Finix, a PCI DSS Level 1 processor",
        "Bank transfer (EFT) payments up to $2,500 per transaction",
        "Invoices and links in CAD or USD",
        "Orvel AI assistant (French and English)",
        "Tamper-evident audit trail",
      ],
      provider: { "@id": "https://zenipay.ca/#organization" },
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
        {/* Pont natif des apps iOS/Android — inerte dans un navigateur normal */}
        <script
          dangerouslySetInnerHTML={{ __html: 'window.ZENIVA_APP={name:"ZeniPay",accent:"#2563EB"}' }}
        />
        <script src="/native-app.js" defer />
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
