"use client";

import Link from "next/link";
import { MarketingNav, MarketingFooter } from "@/app/components/marketing/MarketingNav";
import zp from "@/lib/design-system/zenipay-brand";
import { Bot, Wallet, ShieldCheck, Globe } from "lucide-react";

export default function AboutPage() {
  return (
    <div style={{ background: "#fff", color: zp.text.primary, minHeight: "100vh", fontFamily: zp.font.sans }}>
      <MarketingNav />

      <Hero />
      <Mission />
      <Beliefs />
      <CTA />

      <MarketingFooter />
    </div>
  );
}

function Hero() {
  return (
    <section style={{ position: "relative", overflow: "hidden" }}>
      <span aria-hidden style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `radial-gradient(circle at 15% 0%, rgba(123,79,191,0.08) 0%, transparent 55%),
                     radial-gradient(circle at 85% 30%, rgba(16,185,129,0.07) 0%, transparent 50%)`,
      }} />
      <div style={{ position: "relative", maxWidth: 880, margin: "0 auto", padding: "84px 24px 56px", textAlign: "center" }}>
        <span style={{
          display: "inline-block", padding: "5px 12px", borderRadius: zp.radius.pill,
          background: zp.surface.bg2, border: `1px solid ${zp.surface.border}`, marginBottom: 22,
          fontSize: 11, fontWeight: zp.weight.bold, letterSpacing: "0.12em",
          textTransform: "uppercase", color: zp.brand.violet,
        }}>
          About ZeniPay
        </span>

        <h1 style={{
          margin: 0, fontFamily: zp.font.display,
          fontSize: "clamp(40px, 6vw, 64px)", fontWeight: zp.weight.semibold,
          letterSpacing: "-0.035em", lineHeight: 1.05, color: zp.text.primary,
        }}>
          A Canadian payment platform,
          <br />
          <span className="zp-brand-text">built in Québec.</span>
        </h1>

        <p style={{ margin: "22px auto 0", maxWidth: 680, fontSize: 17, lineHeight: 1.6, color: zp.text.muted }}>
          ZeniPay Inc. is a Canadian payment technology company founded in
          2026 by Alexandre Blais in Québec City. Small businesses and online
          stores use ZeniPay to send payment links and invoices, split an
          invoice into a deposit and installments, and accept card and bank
          transfer payments. ZeniPay is not a bank: card payments are
          processed by Finix, a PCI DSS Level 1 processor.
        </p>
      </div>
    </section>
  );
}

function Mission() {
  return (
    <section style={{ padding: "48px 24px 64px", background: zp.surface.bg2, borderTop: `1px solid ${zp.surface.border}` }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <p style={{
          margin: 0, fontSize: 11, fontWeight: zp.weight.bold,
          letterSpacing: "0.14em", textTransform: "uppercase", color: zp.brand.cyan,
          textAlign: "center" as const,
        }}>
          Mission
        </p>
        <h2 style={{
          margin: "10px auto 18px", fontFamily: zp.font.display,
          fontSize: "clamp(26px, 3.5vw, 36px)", fontWeight: zp.weight.semibold,
          letterSpacing: "-0.025em", color: zp.text.primary, lineHeight: 1.15,
          textAlign: "center" as const, maxWidth: 720,
        }}>
          Help small businesses get paid on time, without chasing.
        </h2>
        <p style={{
          margin: "0 auto", fontSize: 15, lineHeight: 1.7, color: zp.text.muted,
          maxWidth: 720, textAlign: "center" as const,
        }}>
          Every invoice that waits is cash a small business does not have.
          ZeniPay puts the payment button inside the invoice, sends each
          installment on its date, reminds the customer when it is late and
          marks the invoice paid when the money comes in. Orvel, the AI
          assistant built into the dashboard, does the paperwork when you ask
          in plain French or English. We are part of Zeniva Group and serve
          businesses in Canada and the United States, in CAD and USD.
        </p>
      </div>
    </section>
  );
}

function Beliefs() {
  const beliefs = [
    {
      Icon: Bot,
      title: "Get paid faster",
      body: "Payment links, invoices with a pay button, deposits and 2 to 12 installments, each with its own link and automatic reminders.",
    },
    {
      Icon: Wallet,
      title: "AI that asks before it acts",
      body: "Orvel only acts within the permissions you give it. Every action is logged, and reversible actions can be undone.",
    },
    {
      Icon: ShieldCheck,
      title: "Security first",
      body: "Card processing through Finix, a PCI DSS Level 1 processor, with tokenized card fields. Data encrypted at rest, HMAC-signed sessions and a signed, tamper-evident audit trail.",
    },
    {
      Icon: Globe,
      title: "Bilingual is the default, not a feature",
      body: "Built in Québec. Invoice and installment emails are written in French with an English line, Orvel answers in the language you write in, and our team answers in both.",
    },
  ];
  return (
    <section style={{ padding: "72px 24px" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div style={{ textAlign: "center" as const, marginBottom: 36 }}>
          <p style={{
            margin: 0, fontSize: 11, fontWeight: zp.weight.bold,
            letterSpacing: "0.14em", textTransform: "uppercase", color: zp.brand.violet,
          }}>
            What we believe
          </p>
          <h2 style={{
            margin: "10px 0 0", fontFamily: zp.font.display,
            fontSize: "clamp(26px, 3.5vw, 38px)", fontWeight: zp.weight.semibold,
            letterSpacing: "-0.025em", color: zp.text.primary,
          }}>
            Four ideas behind every decision we ship.
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {beliefs.map((b) => (
            <div key={b.title} style={{
              padding: 22, background: zp.surface.bg2,
              borderRadius: zp.radius.lg, border: `1px solid ${zp.surface.border}`,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: zp.radius.md,
                background: "#fff", color: zp.brand.violet,
                border: `1px solid ${zp.surface.border}`,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                marginBottom: 12,
              }}>
                <b.Icon size={18} />
              </div>
              <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: zp.weight.semibold, color: zp.text.primary }}>
                {b.title}
              </h3>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: zp.text.muted }}>
                {b.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section style={{ padding: "64px 24px 88px", textAlign: "center" as const }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <h2 style={{
          margin: 0, fontFamily: zp.font.display,
          fontSize: "clamp(26px, 3.5vw, 36px)", fontWeight: zp.weight.semibold,
          letterSpacing: "-0.025em", color: zp.text.primary, lineHeight: 1.15,
        }}>
          Want to talk?
        </h2>
        <p style={{ margin: "12px auto 22px", fontSize: 15, color: zp.text.muted, maxWidth: 540 }}>
          Sales, pricing, partnerships or press: write to info@zeniva.ca,
          in French or English.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
          <Link href="/contact" style={primaryCta}>Contact us</Link>
          <Link href="/register?type=business" style={ghostCta}>Open an account →</Link>
        </div>
      </div>
    </section>
  );
}

const primaryCta: React.CSSProperties = {
  display: "inline-flex", alignItems: "center",
  padding: "12px 22px", borderRadius: zp.radius.md,
  background: zp.gradient.main, color: "#fff",
  fontSize: 14, fontWeight: zp.weight.semibold,
  textDecoration: "none", letterSpacing: "-0.005em",
  boxShadow: "0 4px 12px rgba(45,190,96,0.25)",
};

const ghostCta: React.CSSProperties = {
  display: "inline-flex", alignItems: "center",
  padding: "12px 18px", borderRadius: zp.radius.md,
  background: "transparent", color: zp.text.primary,
  fontSize: 14, fontWeight: zp.weight.semibold,
  textDecoration: "none", letterSpacing: "-0.005em",
  border: `1px solid ${zp.surface.border}`,
};
