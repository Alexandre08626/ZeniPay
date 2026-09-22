// Google Ads landing page — business banking + payments, CA/US audience.
// Noindexed and left out of the sitemap on purpose (paid traffic only, so it
// never competes with the SEO pages). No MarketingNav: a single goal per
// visit — open an account or request a walkthrough.
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  CreditCard, Landmark, FileText, Bot, ShieldCheck, Zap, Check,
  type LucideIcon,
} from "lucide-react";
import zp from "@/lib/design-system/zenipay-brand";
import LeadForm from "./LeadForm.client";

export const metadata: Metadata = {
  title: "Business Banking + Payments with AI Built In | ZeniPay",
  description:
    "Accept card payments, pay suppliers, and keep your books current — from one account with AI specialists built in. Canada & US. Open in 5 minutes, no credit card required.",
  robots: { index: false, follow: true },
  alternates: { canonical: "https://zenipay.ca/lp/business-banking" },
  openGraph: {
    title: "Business Banking + Payments with AI Built In | ZeniPay",
    description: "One account for payments, payouts and accounting — with a fleet of AI specialists. Canada & US.",
    url: "https://zenipay.ca/lp/business-banking",
    siteName: "ZeniPay",
  },
};

const FEATURES: { icon: LucideIcon; title: string; desc: string; tint: string }[] = [
  { icon: CreditCard, title: "Accept payments anywhere", desc: "Cards, pay links, invoices and hosted checkout. Funds settle to your ZeniPay account, PCI handled for you.", tint: zp.brand.cyan },
  { icon: Landmark, title: "Bank and pay out from one place", desc: "Send payouts to contractors, suppliers or partners in CAD and USD. Split revenue automatically between parties.", tint: zp.brand.green },
  { icon: Bot, title: "AI specialists on every account", desc: "Accounting, finance, security, compliance and revenue agents work 24/7. Ask a question, get an answer with the numbers.", tint: zp.brand.violet },
  { icon: FileText, title: "Books that stay current", desc: "Every transaction is categorized and reconciled as it happens. Export to your accountant in one click.", tint: zp.brand.cyanSoft },
  { icon: ShieldCheck, title: "Built for trust", desc: "PCI-compliant processing, chain-hash audit trail on every transaction, and a real team based in Quebec.", tint: zp.brand.violetSoft },
  { icon: Zap, title: "Live in minutes", desc: "Open your account online, connect your business, and take your first payment the same day.", tint: zp.brand.orange },
];

const STEPS = [
  { n: "01", title: "Open your account", desc: "Five minutes online. No credit card, no monthly minimum." },
  { n: "02", title: "Connect your business", desc: "Add your team, your suppliers and the way you get paid." },
  { n: "03", title: "Let the agents run", desc: "Payments come in, books stay current, questions get answered." },
];

const FAQS = [
  { q: "Who can open a ZeniPay business account?", a: "Businesses incorporated in Canada or the United States, including sole proprietors. Onboarding is fully online and usually takes a few minutes." },
  { q: "Does it cost anything to get started?", a: "No. Opening an account is free and there is no monthly minimum. You pay transparent per-transaction pricing when you accept payments — see zenipay.ca/pricing." },
  { q: "Can I accept both CAD and USD?", a: "Yes. ZeniPay is built for businesses that operate in Canada and the US, with card processing and payouts in both currencies." },
  { q: "What do the AI specialists actually do?", a: "They are agents attached to your account: an accounting agent that categorizes and reconciles, a finance agent that forecasts cash, a security agent that flags anomalies, a compliance agent, and a revenue agent that answers questions about your numbers." },
  { q: "Is my money safe?", a: "Card processing runs on PCI-compliant infrastructure (Finix), every transaction carries a chain-hash audit trail, and access is protected by two-factor authentication." },
];

export default function BusinessBankingLandingPage() {
  return (
    <div className="zp-root" style={{ background: "#fff", color: zp.text.primary, fontFamily: zp.font.sans, minHeight: "100vh" }}>
      {/* Minimal top bar — no site nav */}
      <header style={{ maxWidth: 1160, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <Image src="/zenipay-logo-nobg.png" alt="ZeniPay" width={36} height={36} style={{ width: 36, height: 36, objectFit: "contain" }} />
          <span className="zp-brand-text" style={{ fontWeight: zp.weight.bold, fontSize: 20, letterSpacing: "-0.02em" }}>ZeniPay</span>
        </Link>
        <Link href="/register?type=business" style={primaryCta}>Open an account</Link>
      </header>

      {/* Hero + form */}
      <section style={{ position: "relative", overflow: "hidden" }}>
        <span aria-hidden style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: `radial-gradient(circle at 10% 0%, rgba(16,185,129,0.10) 0%, transparent 60%),
                       radial-gradient(circle at 90% 20%, rgba(123,79,191,0.10) 0%, transparent 55%)`,
        }} />
        <div style={{ position: "relative", maxWidth: 1160, margin: "0 auto", padding: "48px 24px 72px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 48, alignItems: "center" }}>
          <div>
            <div style={{ display: "inline-block", padding: "5px 12px", borderRadius: zp.radius.pill, background: zp.surface.bg2, border: `1px solid ${zp.surface.border}`, marginBottom: 22 }}>
              <span className="zp-brand-text" style={{ fontSize: 11, fontWeight: zp.weight.bold, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                Business banking · Canada & US
              </span>
            </div>
            <h1 style={{ margin: 0, fontFamily: zp.font.display, fontSize: "clamp(38px, 5.2vw, 62px)", fontWeight: zp.weight.semibold, letterSpacing: "-0.035em", lineHeight: 1.04 }}>
              Payments, banking and bookkeeping.
              <br />
              <span className="zp-brand-text">One account. AI built in.</span>
            </h1>
            <p style={{ margin: "20px 0 0", maxWidth: 560, fontSize: 17, lineHeight: 1.55, color: zp.text.muted }}>
              Accept card payments, pay suppliers and contractors, and keep your books current — while a fleet of AI specialists handles the busywork. Open in 5 minutes.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: "24px 0 0", display: "grid", gap: 10 }}>
              {["No monthly fee, no credit card required", "CAD and USD, one dashboard", "PCI-compliant processing, audit trail on every transaction"].map((t) => (
                <li key={t} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15, fontWeight: zp.weight.medium }}>
                  <span style={{ width: 22, height: 22, borderRadius: 999, background: zp.gradient.main, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Check size={13} color="#fff" strokeWidth={3} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
            <div style={{ display: "flex", gap: 12, marginTop: 30, flexWrap: "wrap" }}>
              <Link href="/register?type=business" style={primaryCta}>Open a business account — free</Link>
              <Link href="/pricing" style={ghostCta}>See pricing</Link>
            </div>
          </div>
          <div id="top-form"><LeadForm /></div>
        </div>
      </section>

      {/* Trust strip */}
      <section style={{ borderTop: `1px solid ${zp.surface.border}`, borderBottom: `1px solid ${zp.surface.border}`, background: zp.surface.bg2, padding: "16px 24px" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", display: "flex", justifyContent: "center", gap: 28, flexWrap: "wrap", fontSize: 13, color: zp.text.muted, fontWeight: zp.weight.medium }}>
          {["🇨🇦 🇺🇸 Canada & United States", "PCI-compliant (Finix-powered)", "Chain-hash audit trail", "Bilingual support (EN / FR)", "Team based in Quebec"].map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ maxWidth: 1160, margin: "0 auto", padding: "72px 24px" }}>
        <h2 style={{ margin: 0, textAlign: "center", fontFamily: zp.font.display, fontSize: "clamp(30px,4vw,44px)", fontWeight: zp.weight.semibold, letterSpacing: "-0.03em" }}>
          Everything a growing business needs to move money
        </h2>
        <p style={{ textAlign: "center", color: zp.text.muted, fontSize: 16, margin: "14px auto 44px", maxWidth: 560 }}>
          Stop stitching together a processor, a bank and a bookkeeper. ZeniPay is all three — and it thinks.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 20 }}>
          {FEATURES.map(({ icon: Icon, title, desc, tint }) => (
            <div key={title} style={{ background: "#fff", border: `1px solid ${zp.surface.border}`, borderRadius: zp.radius.lg, padding: 24 }}>
              <span style={{ width: 40, height: 40, borderRadius: zp.radius.md, background: `${tint}1f`, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                <Icon size={20} color={tint} />
              </span>
              <div style={{ fontWeight: zp.weight.semibold, fontSize: 17, marginBottom: 6 }}>{title}</div>
              <div style={{ color: zp.text.muted, fontSize: 14.5, lineHeight: 1.6 }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Steps */}
      <section style={{ background: zp.surface.heroInk, color: zp.text.inverse, padding: "72px 24px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <h2 style={{ margin: 0, textAlign: "center", fontFamily: zp.font.display, fontSize: "clamp(30px,4vw,44px)", fontWeight: zp.weight.semibold, letterSpacing: "-0.03em" }}>
            Live the same day
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 22, marginTop: 44 }}>
            {STEPS.map((s) => (
              <div key={s.n} style={{ background: zp.surface.heroInkSoft, border: "1px solid rgba(255,255,255,0.08)", borderRadius: zp.radius.lg, padding: 26 }}>
                <div className="zp-brand-text" style={{ fontFamily: zp.font.mono, fontSize: 13, fontWeight: zp.weight.bold, letterSpacing: "0.1em", marginBottom: 10 }}>{s.n}</div>
                <div style={{ fontWeight: zp.weight.semibold, fontSize: 18, marginBottom: 8 }}>{s.title}</div>
                <div style={{ color: zp.text.inverseMuted, fontSize: 14.5, lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 40 }}>
            <Link href="/register?type=business" style={primaryCta}>Open a business account — free</Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ maxWidth: 820, margin: "0 auto", padding: "72px 24px" }}>
        <h2 style={{ margin: "0 0 32px", textAlign: "center", fontFamily: zp.font.display, fontSize: "clamp(30px,4vw,40px)", fontWeight: zp.weight.semibold, letterSpacing: "-0.03em" }}>
          Frequently asked questions
        </h2>
        <div style={{ display: "grid", gap: 12 }}>
          {FAQS.map((f) => (
            <div key={f.q} style={{ background: zp.surface.bg2, border: `1px solid ${zp.surface.border}`, borderRadius: zp.radius.lg, padding: 22 }}>
              <div style={{ fontWeight: zp.weight.semibold, fontSize: 16, marginBottom: 8 }}>{f.q}</div>
              <div style={{ color: zp.text.muted, fontSize: 14.5, lineHeight: 1.7 }}>{f.a}</div>
            </div>
          ))}
        </div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      }) }} />

      {/* Final CTA */}
      <section style={{ borderTop: `1px solid ${zp.surface.border}`, padding: "64px 24px", textAlign: "center" }}>
        <h2 style={{ margin: 0, fontFamily: zp.font.display, fontSize: "clamp(30px,4vw,44px)", fontWeight: zp.weight.semibold, letterSpacing: "-0.03em" }}>
          Your bank. <span className="zp-brand-text">Now with AI built in.</span>
        </h2>
        <p style={{ color: zp.text.muted, fontSize: 16, margin: "14px auto 28px", maxWidth: 520 }}>
          Open your account in five minutes, or request a free walkthrough with a specialist.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
          <Link href="/register?type=business" style={primaryCta}>Open a business account — free</Link>
          <a href="#top-form" style={ghostCta}>Request a walkthrough</a>
        </div>
      </section>

      <footer style={{ padding: "22px 24px", textAlign: "center", fontSize: 12, color: zp.text.dim, borderTop: `1px solid ${zp.surface.border}` }}>
        © {new Date().getFullYear()} ZeniPay · Quebec, Canada ·{" "}
        <Link href="/privacy" style={{ color: zp.text.dim }}>Privacy</Link> · <Link href="/terms" style={{ color: zp.text.dim }}>Terms</Link> · <Link href="/security" style={{ color: zp.text.dim }}>Security</Link>
      </footer>
    </div>
  );
}

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
