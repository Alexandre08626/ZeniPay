// Root / — ZeniPay marketing homepage.
//
// Business accounts & payments (cyan accent) and Orvel, the built-in AI
// operator (violet accent). Uses the shared zenipay-brand tokens.

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  CreditCard, FileText, BarChart2, Lock,
  Zap, Shield, BookOpen, Sparkles,
  UserPlus, ArrowDownLeft,
  User, Building2, Wallet, Target, PieChart, Users, ShieldCheck, Check,
  type LucideIcon,
} from "lucide-react";
import { MarketingNav, MarketingFooter } from "@/app/components/marketing/MarketingNav";
import zp from "@/lib/design-system/zenipay-brand";

export const metadata: Metadata = {
  title: { absolute: "ZeniPay — Payment links, online invoicing and installments for Canadian businesses" },
  description:
    "Canadian payment platform for small businesses and online stores: payment links, invoices with a pay button, deposits and installments, card and bank transfer payments. Cards processed by Finix (PCI DSS Level 1). Made in Québec.",
  alternates: {
    canonical: "https://zenipay.ca",
    languages: { "en-CA": "https://zenipay.ca", "fr-CA": "https://zenipay.ca/fr", "x-default": "https://zenipay.ca" },
  },
  openGraph: {
    title: "ZeniPay — Payment links, online invoicing and installments",
    description:
      "Send a link or an invoice, get paid by card or bank transfer, split big jobs into installments. Made in Québec.",
    url: "https://zenipay.ca",
    siteName: "ZeniPay",
  },
};

export default function LandingPage() {
  return (
    <div style={{ background: "#fff", color: zp.text.primary, fontFamily: zp.font.sans, minHeight: "100vh" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }} />
      <MarketingNav />
      <Hero />
      <PartnerStrip />
      <SectionA />
      <SectionB />
      <HowItWorks />
      <StatsRow />
      <ForEveryone />
      <FAQSection />
      <FinalCTA />
      <MarketingFooter />
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section style={{ position: "relative", overflow: "hidden" }}>
      <span aria-hidden style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `radial-gradient(circle at 10% 0%, rgba(16,185,129,0.08) 0%, transparent 60%),
                     radial-gradient(circle at 90% 20%, rgba(123,79,191,0.08) 0%, transparent 55%)`,
      }} />
      <div style={{ position: "relative", maxWidth: 1160, margin: "0 auto", padding: "72px 24px 72px", textAlign: "center" }}>
        {/* Logo — anchors the brand at the top of the hero. The
            MarketingNav also has a small logo top-left, but a larger
            mark above the headline reads as a banking-grade
            statement on first paint. */}
        <Image
          src="/zenipay-logo-nobg.png"
          alt="ZeniPay logo"
          width={120}
          height={120}
          priority
          style={{
            width: 120, height: 120,
            objectFit: "contain",
            margin: "0 auto 18px",
            display: "block",
          }}
        />

        <div style={{
          display: "inline-block", padding: "5px 12px",
          borderRadius: zp.radius.pill, background: zp.surface.bg2,
          border: `1px solid ${zp.surface.border}`, marginBottom: 24,
        }}>
          <span className="zp-brand-text" style={{ fontSize: 11, fontWeight: zp.weight.bold, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Payment platform · Made in Québec
          </span>
        </div>

        <h1 style={{
          margin: 0, fontFamily: zp.font.display,
          fontSize: "clamp(40px, 6vw, 72px)", fontWeight: zp.weight.semibold,
          letterSpacing: "-0.035em", lineHeight: 1.02, color: zp.text.primary,
        }}>
          Get paid online.
          <br />
          <span className="zp-brand-text">Links, invoices, installments.</span>
        </h1>

        <p style={{ margin: "22px auto 0", maxWidth: 640, fontSize: 17, lineHeight: 1.55, color: zp.text.muted }}>
          ZeniPay is a Canadian payment platform for small businesses and
          online stores. Send a payment link or an invoice, let customers pay
          by card or bank transfer, split big jobs into a deposit and
          installments — and let Orvel, the built-in AI assistant, handle the
          paperwork and the reminders.
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 32, flexWrap: "wrap" }}>
          <Link href="/register?type=business" style={primaryCta}>Open a business account</Link>
          <Link href="/contact" style={ghostCta}>Talk to our team</Link>
        </div>

        <div style={{ marginTop: 14, fontSize: 13, color: zp.text.muted }}>
          Vous préférez le français ?{" "}
          <Link href="/fr" hrefLang="fr-CA" style={{ color: zp.brand.pink, textDecoration: "underline", fontWeight: zp.weight.semibold }}>
            Version française →
          </Link>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 22, marginTop: 28, flexWrap: "wrap", fontSize: 12, color: zp.text.dim }}>
          <TrustItem>Cards processed by Finix, a PCI DSS Level 1 processor</TrustItem>
          <TrustItem>CAD and USD</TrustItem>
          <TrustItem>French and English</TrustItem>
        </div>

        <HeroMockup />
      </div>
    </section>
  );
}

function TrustItem({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ color: zp.brand.green, fontWeight: zp.weight.bold }}>✓</span>
      {children}
    </span>
  );
}

function HeroMockup() {
  return (
    <div style={{ marginTop: 54, padding: "20px 20px 0", maxWidth: 980, marginLeft: "auto", marginRight: "auto" }}>
      <div style={{
        borderRadius: zp.radius.xl,
        background: `linear-gradient(180deg, rgba(15,23,42,0.03) 0%, rgba(15,23,42,0) 100%)`,
        padding: 16,
        boxShadow: "0 30px 60px rgba(15,23,42,0.12), 0 0 0 1px rgba(15,23,42,0.08)",
        transform: "perspective(1400px) rotateX(3deg)",
        transformOrigin: "center top",
      }}>
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: 12, borderRadius: zp.radius.lg, overflow: "hidden",
          background: "#fff",
        }} className="mk-hero-mock">
          <div style={{ padding: "20px 22px", background: zp.gradient.heroMerchant, color: zp.text.inverse, minHeight: 180, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.8, fontWeight: zp.weight.semibold }}>Example · Paid this month</div>
            <div style={{ ...zp.amountStyle.hero, fontSize: 42, color: "#fff" }}>$8,450.00</div>
            <div style={{ fontSize: 11, opacity: 0.75 }}>Payment links · invoices · CAD</div>
          </div>
          <div style={{ padding: "20px 22px", background: zp.gradient.heroAgents, color: zp.text.inverse, minHeight: 180, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.8, fontWeight: zp.weight.semibold }}>Example · Orvel receivables</div>
            <div style={{ ...zp.amountStyle.hero, fontSize: 42, color: "#fff" }}>$12,400.00</div>
            <div style={{ fontSize: 11, opacity: 0.75 }}>6 invoices · deposits sent automatically</div>
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 680px) {
          .mk-hero-mock { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function PartnerStrip() {
  return (
    <section style={{ borderTop: `1px solid ${zp.surface.border}`, background: zp.surface.bg2 }}>
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "40px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 11, color: zp.text.dim, fontWeight: zp.weight.semibold, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 18 }}>
          Built on proven infrastructure
        </div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 48, flexWrap: "wrap", color: zp.text.dim, fontWeight: zp.weight.semibold, fontSize: 18 }}>
          <span>Finix</span><span>Supabase</span><span>Vercel</span>
        </div>
      </div>
    </section>
  );
}

function SectionA() {
  return (
    <section id="features" style={{ padding: "96px 24px" }}>
      <div style={{ maxWidth: 1160, margin: "0 auto", display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 60, alignItems: "center" }} className="mk-twocol">
        <div>
          <Eyebrow color={zp.brand.cyan}>Payments</Eyebrow>
          <H2>Payment links and invoices that get paid.</H2>
          <p style={bodyStyle}>
            Create a payment link in seconds and share it by email, text or QR
            code. Send invoices with a pay button. Customers pay by card or by
            bank transfer (EFT, up to $2,500 per transaction), and every
            payment shows up in your dashboard.
          </p>
          <FeatureList
            accent={zp.brand.cyan}
            items={[
              { Icon: CreditCard, title: "Payment links with QR code and expiry date" },
              { Icon: FileText,   title: "Invoices emailed with a pay button" },
              { Icon: BarChart2,  title: "Deposits and 2 to 12 installments" },
              { Icon: Lock,       title: "Tamper-evident audit trail" },
            ]}
          />
        </div>
        <VisualMerchant />
      </div>
      <style>{`
        @media (max-width: 820px) {
          .mk-twocol { grid-template-columns: 1fr !important; gap: 36px !important; }
        }
      `}</style>
    </section>
  );
}

function VisualMerchant() {
  return (
    <div style={{
      padding: 16, borderRadius: zp.radius.xl,
      background: `linear-gradient(180deg, rgba(21,184,201,0.07) 0%, rgba(21,184,201,0) 100%)`,
      boxShadow: "0 20px 48px rgba(15,23,42,0.08), 0 0 0 1px rgba(15,23,42,0.06)",
    }}>
      <div style={{ background: "#fff", borderRadius: zp.radius.lg, overflow: "hidden", border: `1px solid ${zp.surface.border}` }}>
        <div style={{ background: zp.gradient.heroMerchant, color: zp.text.inverse, padding: "20px 22px" }}>
          <div style={{ fontSize: 10, fontWeight: zp.weight.semibold, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.8 }}>Example · Invoice INV-2026-0014</div>
          <div style={{ ...zp.amountStyle.hero, fontSize: 44, color: "#fff", marginTop: 6 }}>$2,299.50</div>
          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>3 installments · CAD</div>
        </div>
        <div style={{ padding: "14px 16px" }}>
          {[
            { name: "Deposit 1 · paid",        last4: "30 %", bal: "$689.85" },
            { name: "Installment 2 · due next month", last4: "30 % ", bal: "$689.85" },
            { name: "Balance · in two months", last4: "40 %", bal: "$919.80" },
          ].map((r) => (
            <div key={r.last4} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${zp.surface.border}` }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: zp.weight.semibold, color: zp.text.primary }}>{r.name}</div>
                <div style={{ fontSize: 11, color: zp.text.muted, fontFamily: zp.font.mono }}>{r.last4}</div>
              </div>
              <div style={{ ...zp.amountStyle.base, fontSize: 15, color: zp.text.primary, fontWeight: zp.weight.semibold }}>{r.bal}</div>
            </div>
          ))}
          <div style={{ marginTop: 8, fontSize: 11, color: zp.text.muted }}>
            Each installment has its own payment link
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionB() {
  return (
    <section id="orvel" style={{ padding: "96px 24px", background: zp.surface.bg2, borderTop: `1px solid ${zp.surface.border}`, borderBottom: `1px solid ${zp.surface.border}` }}>
      <div style={{ maxWidth: 1160, margin: "0 auto", display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 60, alignItems: "center" }} className="mk-twocol">
        <VisualOrvel />
        <div>
          <Eyebrow color={zp.brand.violet}>Orvel AI</Eyebrow>
          <H2>Tell Orvel what to do. It does it.</H2>
          <p style={bodyStyle}>
            Orvel is the AI operator built into your ZeniPay dashboard. Ask in plain
            words and it creates the invoice, splits it into deposits, emails the
            payment links, follows up late payers and answers questions about your
            numbers. You decide what it is allowed to do, one switch per capability.
          </p>
          <FeatureList
            accent={zp.brand.violet}
            items={[
              { Icon: FileText, title: "Invoices in full or in deposits, sent automatically" },
              { Icon: Zap,      title: "Payment links and reminders on the due date" },
              { Icon: Shield,   title: "Permissions you control, per capability" },
              { Icon: BookOpen, title: "Every action logged, with undo when reversible" },
            ]}
          />
          <Link href="/register?type=business" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 24, fontSize: 13, fontWeight: zp.weight.semibold, color: zp.brand.violet, textDecoration: "none" }}>
            Open an account and try Orvel →
          </Link>
        </div>
      </div>
    </section>
  );
}

function VisualOrvel() {
  const bubble = (mine: boolean): React.CSSProperties => ({
    alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "86%", padding: "9px 12px", borderRadius: zp.radius.md,
    fontSize: 12.5, lineHeight: 1.45, background: mine ? zp.brand.cyan : zp.surface.bg2, color: mine ? "#04111d" : zp.text.primary,
  });
  return (
    <div style={{
      padding: 16, borderRadius: zp.radius.xl,
      background: `linear-gradient(180deg, rgba(123,79,191,0.07) 0%, rgba(123,79,191,0) 100%)`,
      boxShadow: "0 20px 48px rgba(15,23,42,0.08), 0 0 0 1px rgba(15,23,42,0.06)",
    }}>
      <Image
        src="/orvel/orvel-logo-600.webp"
        alt="Orvel AI — Intelligence sans limites"
        width={600}
        height={600}
        style={{ width: "100%", height: "auto", maxWidth: 360, display: "block", margin: "0 auto 14px", borderRadius: zp.radius.lg }}
      />
      <div style={{ background: "#fff", borderRadius: zp.radius.lg, border: `1px solid ${zp.surface.border}`, overflow: "hidden" }}>
        <div style={{ padding: "10px 16px", borderBottom: `1px solid ${zp.surface.border}`, background: zp.surface.bg2, fontSize: 13, fontWeight: zp.weight.semibold, color: zp.text.primary, display: "flex", alignItems: "center", gap: 8 }}>
          <Image src="/orvel/orvel-mark-64.webp" alt="" width={24} height={24} style={{ borderRadius: "50%", background: "#000" }} />
          Orvel
        </div>
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={bubble(true)}>Invoice Jean Tremblay $2,000 + tax, in 3 payments: 30% today, 30% next month, balance in two months.</div>
          <div style={bubble(false)}>Done — INV-2026-0014, $2,299.50. Deposit 1 ($689.85) was just emailed to Jean with its payment link; the next two go out on their due dates.</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: zp.semantic.success }}>
            <Check size={12} /> Invoice INV-2026-0014 — 3 installments
          </div>
        </div>
      </div>
    </div>
  );
}

function HowItWorks() {
  return (
    <section style={{ padding: "96px 24px", background: zp.surface.bg2, borderTop: `1px solid ${zp.surface.border}`, borderBottom: `1px solid ${zp.surface.border}` }}>
      <div style={{ maxWidth: 1160, margin: "0 auto", textAlign: "center" }}>
        <H2>Up and running in minutes.</H2>
        <div style={{ marginTop: 48, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          {[
            { Icon: UserPlus,      title: "Open your account",   body: "Sign up online, then complete the business verification required before accepting payments." },
            { Icon: ArrowDownLeft, title: "Send a link or invoice", body: "Customers pay by card or bank transfer — no account needed on their side." },
            { Icon: Sparkles,      title: "Let Orvel run it",      body: "Invoices, deposits and reminders — just ask Orvel." },
          ].map((s, i) => (
            <div key={s.title} style={{ padding: "24px 22px", borderRadius: zp.radius.lg, background: "#fff", border: `1px solid ${zp.surface.border}`, textAlign: "left" as const }}>
              <div style={{ width: 44, height: 44, borderRadius: zp.radius.md, background: zp.gradient.main, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                <s.Icon size={18} />
              </div>
              <div style={{ fontSize: 11, fontWeight: zp.weight.semibold, color: zp.text.dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>
                Step {i + 1}
              </div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: zp.weight.semibold, color: zp.text.primary, letterSpacing: "-0.2px" }}>{s.title}</h3>
              <p style={{ margin: "8px 0 0", fontSize: 13, color: zp.text.muted, lineHeight: 1.55 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatsRow() {
  return (
    <section id="pricing" style={{ padding: "72px 24px", background: zp.surface.heroInk, color: zp.text.inverse }}>
      <div style={{ maxWidth: 1160, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 32 }}>
        {[
          { v: "2–12",     l: "Installments per invoice, sent automatically" },
          { v: "3 + 7",    l: "Days after due date: automatic reminders" },
          { v: "CAD · USD", l: "Invoice and payment-link currencies" },
          { v: "FR · EN",  l: "Invoices, Orvel and support" },
        ].map((s) => (
          <div key={s.l}>
            <div style={{ ...zp.amountStyle.hero, fontFamily: zp.font.mono, fontSize: 40, color: "#fff", fontWeight: zp.weight.semibold, lineHeight: 1.05 }}>{s.v}</div>
            <div style={{ marginTop: 10, fontSize: 12, color: zp.text.inverseMuted, fontWeight: zp.weight.medium, letterSpacing: "0.04em" }}>{s.l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ZeniPay for Everyone — Personal vs Business signup section.
function ForEveryone() {
  return (
    <section style={{ padding: "96px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
        <H2>Who uses ZeniPay</H2>
        <p style={{ ...bodyStyle, margin: "16px auto 48px", maxWidth: 640 }}>
          For service businesses that bill in several payments, and for online sellers who want to get paid without a complex integration.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18, textAlign: "left" as const }}>
          <SignupCard
            Icon={User}
            accent={zp.brand.pink}
            title="Service businesses"
            body="Contractors, consultants, event and group organizers: ask for a deposit, bill in installments, stop chasing."
            badge="Deposits"
            features={[
              { Icon: Wallet, label: "Invoices with a pay button" },
              { Icon: CreditCard, label: "Deposit + installments" },
              { Icon: Target, label: "Automatic reminders" },
              { Icon: PieChart, label: "Paid / partially paid status" },
            ]}
            cta={{ label: "See installment payments", href: "/installments" }}
          />
          <SignupCard
            Icon={Building2}
            accent={zp.brand.cyan}
            title="Online stores and sellers"
            body="Sell without a complicated integration: payment links, QR codes, or the API on your own site."
            badge="Links + API"
            features={[
              { Icon: Building2, label: "Payment links and QR codes" },
              { Icon: Sparkles, label: "Orvel AI assistant" },
              { Icon: Users, label: "Card and bank transfer payments" },
              { Icon: ShieldCheck, label: "Finix (PCI DSS Level 1) card processing" },
            ]}
            cta={{ label: "See payment links", href: "/paylinks" }}
          />
        </div>
      </div>
    </section>
  );
}

function SignupCard({ Icon, accent, title, body, badge, features, cta }: {
  Icon: LucideIcon;
  accent: string;
  title: string;
  body: string;
  badge: string;
  features: Array<{ Icon: LucideIcon; label: string }>;
  cta: { label: string; href: string };
}) {
  return (
    <div style={{
      padding: 28,
      borderRadius: zp.radius.lg,
      background: "#fff",
      border: `1px solid ${zp.surface.border}`,
      borderTop: `3px solid ${accent}`,
      boxShadow: zp.elevation.sm,
      display: "flex",
      flexDirection: "column" as const,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <div style={{
          width: 44, height: 44, borderRadius: zp.radius.md,
          background: `${accent}18`, color: accent,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: zp.weight.semibold, color: zp.text.primary, letterSpacing: "-0.01em" }}>{title}</h3>
        </div>
        <span style={{
          fontSize: 10, fontWeight: zp.weight.semibold,
          padding: "3px 10px", borderRadius: 999,
          background: `${accent}14`, color: accent,
          letterSpacing: "0.06em", textTransform: "uppercase" as const,
        }}>{badge}</span>
      </div>
      <p style={{ margin: "10px 0 18px", fontSize: 14, color: zp.text.muted, lineHeight: 1.55 }}>{body}</p>

      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" as const, gap: 8 }}>
        {features.map((f) => (
          <li key={f.label} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: zp.text.primary }}>
            <Check size={14} color={accent} />
            <span>{f.label}</span>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: 22 }}>
        <Link href={cta.href} style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          padding: "12px 22px", borderRadius: zp.radius.sm,
          background: `linear-gradient(135deg, ${accent} 0%, ${zp.brand.violet} 100%)`,
          color: "#fff", fontWeight: zp.weight.semibold, fontSize: 14,
          textDecoration: "none", letterSpacing: "0.01em",
        }}>
          {cta.label}
        </Link>
      </div>
    </div>
  );
}

// FAQ — visible mirror of the JSON-LD FAQPage in app/layout.tsx.
// Google rewards keeping the rendered UI in sync with the structured
// data, and AI search engines (ChatGPT, Perplexity, Claude.ai) prefer
// citing pages where the answer is actually visible. Native
// <details>/<summary> = accessible + zero JS.

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: "What is ZeniPay?",
    a: "ZeniPay is a Canadian payment platform for small businesses and online stores. It lets you send payment links and invoices, split an invoice into a deposit and installments, and accept card and bank transfer payments. Card payments are processed by Finix, a PCI DSS Level 1 processor. ZeniPay Inc. was founded in 2026 in Québec and serves Canada and the United States.",
  },
  {
    q: "Is ZeniPay a bank?",
    a: "No. ZeniPay is a payment technology platform, not a bank or a deposit-taking institution. It helps you collect payments from your customers and track them.",
  },
  {
    q: "How do I create a payment link?",
    a: "Open a business account, complete the business verification, then create a link with an amount, a currency (CAD or USD), a description and an optional expiry date. Share the URL by email or text, or show the QR code. Your customer pays by card or bank transfer without creating an account.",
  },
  {
    q: "Can my customers pay in installments?",
    a: "Yes. Split any invoice into 2 to 12 installments, by amount or percentage. Each installment has its own payment link, is emailed on its due date, and unpaid ones get reminders 3 and 7 days later. ZeniPay does not lend money or charge your customer interest.",
  },
  {
    q: "What is Orvel?",
    a: "Orvel is the AI assistant built into the ZeniPay dashboard. You ask in plain English or French, for example: Invoice Jean Tremblay $2,000 + tax in 3 payments. It creates the invoice, splits it and sends the links. It only acts within the permissions you give it, and every action is logged.",
  },
  {
    q: "How much does ZeniPay cost?",
    a: "Processing fees depend on your business and the payment type. We do not publish generic rates: email info@zeniva.ca and we send you the pricing that applies before you accept your first payment.",
  },
  {
    q: "Is my customers' card data safe?",
    a: "Card numbers are entered in secure fields provided by Finix, a PCI DSS Level 1 processor, so they never pass through your email or servers. ZeniPay encrypts data in transit and at rest, uses signed sessions and keeps a tamper-evident audit trail.",
  },
  {
    q: "Which currencies does ZeniPay support?",
    a: "Invoices and payment links can be in Canadian or US dollars. Cards are charged in Canadian dollars; for a USD amount, the customer sees the CAD equivalent before paying.",
  },
];

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
};

function FAQSection() {
  return (
    <section id="faq" style={{ padding: "96px 24px", background: zp.surface.bg2, borderTop: `1px solid ${zp.surface.border}` }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <div style={{ textAlign: "center" as const, marginBottom: 36 }}>
          <p style={{
            margin: 0, fontSize: 11, fontWeight: zp.weight.bold,
            letterSpacing: "0.14em", textTransform: "uppercase", color: zp.brand.violet,
          }}>
            Frequently asked
          </p>
          <h2 style={{
            margin: "10px 0 8px", fontFamily: zp.font.display,
            fontSize: "clamp(28px, 4vw, 40px)", fontWeight: zp.weight.semibold,
            letterSpacing: "-0.025em", color: zp.text.primary, lineHeight: 1.1,
          }}>
            Questions business owners ask us.
          </h2>
          <p style={{ margin: 0, fontSize: 15, color: zp.text.muted, maxWidth: 560, marginInline: "auto" }}>
            Not here? Write to info@zeniva.ca — a person on our Québec team
            answers, in English or French.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
          {FAQS.map((f) => (
            <details
              key={f.q}
              style={{
                background: "#fff",
                border: `1px solid ${zp.surface.border}`,
                borderRadius: zp.radius.lg,
                padding: "14px 18px",
              }}
            >
              <summary style={{
                cursor: "pointer", fontSize: 15, fontWeight: zp.weight.semibold,
                color: zp.text.primary, listStyle: "none",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                gap: 12,
              }}>
                {f.q}
                <span aria-hidden style={{ color: zp.text.dim, fontSize: 18, lineHeight: 1 }}>+</span>
              </summary>
              <p style={{
                margin: "10px 0 4px",
                fontSize: 14, lineHeight: 1.6, color: zp.text.muted,
              }}>
                {f.a}
              </p>
            </details>
          ))}
        </div>

        <p style={{ margin: "26px auto 0", textAlign: "center" as const, fontSize: 13, color: zp.text.muted }}>
          Still have questions?{" "}
          <a href="/contact" style={{ color: zp.brand.cyan, fontWeight: zp.weight.semibold, textDecoration: "underline" }}>
            Contact our team →
          </a>
        </p>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section style={{ padding: "96px 24px", textAlign: "center" as const }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <H2>Start getting paid online.</H2>
        <p style={{ ...bodyStyle, marginTop: 14 }}>Open your business account in a few minutes, or ask us a question first.</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
          <Link href="/register?type=business" style={primaryCta}>Open a business account</Link>
          <a href="mailto:info@zeniva.ca" style={ghostCta}>info@zeniva.ca</a>
        </div>
      </div>
    </section>
  );
}

function Eyebrow({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: zp.weight.semibold, color, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 12 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
      {children}
    </div>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ margin: 0, fontFamily: zp.font.display, fontSize: "clamp(28px, 3.4vw, 40px)", fontWeight: zp.weight.semibold, letterSpacing: "-0.03em", lineHeight: 1.1, color: zp.text.primary }}>
      {children}
    </h2>
  );
}

function FeatureList({ items, accent }: { items: Array<{ Icon: LucideIcon; title: string }>; accent: string }) {
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: "28px 0 0", display: "flex", flexDirection: "column", gap: 14 }}>
      {items.map((f) => (
        <li key={f.title} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 32, height: 32, borderRadius: zp.radius.sm, background: accent + "18", color: accent, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <f.Icon size={15} />
          </span>
          <span style={{ fontSize: 14, color: zp.text.primary, fontWeight: zp.weight.medium }}>{f.title}</span>
        </li>
      ))}
    </ul>
  );
}

const bodyStyle: React.CSSProperties = {
  margin: "18px 0 0", fontSize: 16, lineHeight: 1.55, color: zp.text.muted,
};
const primaryCta: React.CSSProperties = {
  background: zp.gradient.main, color: "#fff",
  padding: "14px 24px", borderRadius: zp.radius.sm,
  fontSize: 15, fontWeight: zp.weight.semibold,
  textDecoration: "none", boxShadow: "0 6px 20px rgba(21,184,201,0.35)",
  letterSpacing: "0.01em", display: "inline-flex", alignItems: "center", justifyContent: "center",
};
const ghostCta: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 8,
  background: "transparent", color: zp.text.primary,
  border: `1px solid ${zp.surface.border}`,
  padding: "13px 22px", borderRadius: zp.radius.sm,
  fontSize: 15, fontWeight: zp.weight.semibold, textDecoration: "none",
};
