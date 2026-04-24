// /pricing — public pricing page. Two plans side-by-side: Starter (free)
// and Enterprise (custom). Mirrors the PR 20 brand (white page, gradient
// as signifier only).

"use client";

import Link from "next/link";
import { MarketingNav, MarketingFooter } from "@/app/components/marketing/MarketingNav";
import zp from "@/lib/design-system/zenipay-brand";

export default function PricingPage() {
  return (
    <div style={{ background: zp.surface.bg1, minHeight: "100vh" }}>
      <MarketingNav />

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 28px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <p style={{
            margin: 0, fontSize: 11, fontWeight: zp.weight.bold, color: zp.brand.violet,
            letterSpacing: "0.14em", textTransform: "uppercase",
          }}>
            Pricing
          </p>
          <h1 style={{
            margin: "10px 0 12px", fontFamily: zp.font.display,
            fontSize: 44, fontWeight: zp.weight.semibold, color: zp.text.primary,
            letterSpacing: "-0.03em", lineHeight: 1.05,
          }}>
            Start free. Scale when the agents start spending.
          </h1>
          <p style={{ margin: 0, fontSize: 16, color: zp.text.muted, maxWidth: 620, marginLeft: "auto", marginRight: "auto" }}>
            Modern banking rails for AI agents and the humans who run them. One wallet per agent, a central treasury, and a signed audit trail of every cent.
          </p>
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 20, marginBottom: 72, alignItems: "stretch",
        }}>
          <StarterCard />
          <EnterpriseCard />
        </div>

        <FaqSection />
      </main>

      <MarketingFooter />
    </div>
  );
}

function StarterCard() {
  return (
    <div style={{
      background: "#fff", border: `1px solid ${zp.surface.border}`,
      borderRadius: 20, padding: 32,
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontSize: 11, fontWeight: zp.weight.bold, color: zp.text.muted,
          letterSpacing: "0.12em", textTransform: "uppercase",
        }}>
          Starter
        </div>
        <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{
            fontFamily: zp.font.display, fontSize: 48, fontWeight: zp.weight.semibold,
            color: zp.text.primary, letterSpacing: "-0.03em",
          }}>$0</span>
          <span style={{ fontSize: 14, color: zp.text.muted, fontWeight: zp.weight.medium }}>/ month</span>
        </div>
        <p style={{ margin: "10px 0 0", fontSize: 13, color: zp.text.muted }}>
          Free to start. Pay only when you move money.
        </p>
      </div>

      <FeatureList features={[
        "1 business account (CAD or USD)",
        "Up to 5 AI agents",
        "Payment links + checkout",
        "Basic invoicing",
        "1 virtual ZeniPay card",
        "Standard email support",
      ]} />

      <Link
        href="/register"
        style={{
          display: "block", textAlign: "center", marginTop: "auto",
          background: zp.gradient.main, color: "#fff",
          padding: "14px 20px", borderRadius: 12,
          fontSize: 14, fontWeight: zp.weight.semibold, textDecoration: "none",
          boxShadow: "0 8px 24px rgba(15,184,201,0.28)",
        }}
      >
        Get started →
      </Link>
    </div>
  );
}

function EnterpriseCard() {
  return (
    <div style={{
      position: "relative",
      background: zp.gradient.main,
      borderRadius: 20,
      padding: 2,
      display: "flex", flexDirection: "column",
    }}>
      <div style={{
        position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
        background: "#fff", color: zp.brand.violet,
        padding: "4px 14px", borderRadius: 999,
        fontSize: 10, fontWeight: zp.weight.bold,
        letterSpacing: "0.12em", textTransform: "uppercase",
        border: `1px solid ${zp.brand.violet}40`,
      }}>
        Most popular
      </div>

      <div style={{
        background: "#fff", borderRadius: 19, padding: 32,
        display: "flex", flexDirection: "column", flex: 1,
      }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 11, fontWeight: zp.weight.bold, color: zp.brand.violet,
            letterSpacing: "0.12em", textTransform: "uppercase",
          }}>
            Enterprise
          </div>
          <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{
              fontFamily: zp.font.display, fontSize: 42, fontWeight: zp.weight.semibold,
              color: zp.text.primary, letterSpacing: "-0.03em",
              background: zp.gradient.main, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>Custom</span>
          </div>
          <p style={{ margin: "10px 0 0", fontSize: 13, color: zp.text.muted }}>
            Built for fleets of 20+ agents and money-movement at scale.
          </p>
        </div>

        <FeatureList features={[
          "Everything in Starter, plus:",
          "Unlimited accounts + agents",
          "ACH, wire & Interac (Canada) payouts",
          "Custom approval workflows",
          "Full API access",
          "SOC2 audit trail + tamper-evident ledger",
          "White-label options",
          "Priority support · 24h SLA",
          "Dedicated account manager",
        ]} emphasizeFirst />

        <a
          href="mailto:info@zeniva.ca?subject=ZeniPay%20Enterprise%20inquiry"
          style={{
            display: "block", textAlign: "center", marginTop: "auto",
            background: zp.gradient.main, color: "#fff",
            padding: "14px 20px", borderRadius: 12,
            fontSize: 14, fontWeight: zp.weight.semibold, textDecoration: "none",
            boxShadow: "0 8px 24px rgba(123,79,191,0.32)",
          }}
        >
          Contact us →
        </a>
      </div>
    </div>
  );
}

function FeatureList({ features, emphasizeFirst }: { features: string[]; emphasizeFirst?: boolean }) {
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px" }}>
      {features.map((f, i) => (
        <li key={i} style={{
          display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0",
          fontSize: 13, color: zp.text.primary,
          fontWeight: emphasizeFirst && i === 0 ? zp.weight.semibold : zp.weight.regular,
        }}>
          <span style={{
            flexShrink: 0, width: 18, height: 18, borderRadius: "50%",
            background: zp.semantic.successBg, color: zp.semantic.success,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: zp.weight.bold,
          }}>✓</span>
          <span>{f}</span>
        </li>
      ))}
    </ul>
  );
}

function FaqSection() {
  const faqs = [
    { q: "Is there a setup fee?", a: "No. You can open your first account and issue your first agent card for free." },
    { q: "Can I upgrade later?", a: "Yes — anytime. Starter → Enterprise takes minutes, no data migration." },
    { q: "Is my money safe?", a: "Funds are held with our banking partner Finix (PCI DSS Level 1). Every ledger entry is hash-chained and independently verifiable." },
    { q: "What currencies are supported?", a: "CAD and USD today. EUR and GBP are on the roadmap." },
    { q: "Do agents need a card to spend?", a: "Every AI agent wallet supports virtual cards + direct API spends. Cards are optional." },
    { q: "How do I get support?", a: "Email info@zeniva.ca. Enterprise customers get a 24-hour SLA and a dedicated account manager." },
  ];
  return (
    <section style={{ maxWidth: 760, margin: "0 auto" }}>
      <h2 style={{
        margin: "0 0 24px", fontFamily: zp.font.display,
        fontSize: 28, fontWeight: zp.weight.semibold, color: zp.text.primary,
        letterSpacing: "-0.02em", textAlign: "center",
      }}>
        Frequently asked
      </h2>
      <div style={{ display: "grid", gap: 12 }}>
        {faqs.map((f, i) => (
          <div key={i} style={{
            padding: "18px 22px",
            background: "#fff", border: `1px solid ${zp.surface.border}`,
            borderRadius: 14,
          }}>
            <div style={{ fontSize: 14, fontWeight: zp.weight.semibold, color: zp.text.primary, marginBottom: 4 }}>
              {f.q}
            </div>
            <div style={{ fontSize: 13, color: zp.text.muted, lineHeight: 1.55 }}>
              {f.a}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
