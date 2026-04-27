"use client";

import Link from "next/link";
import { MarketingNav, MarketingFooter } from "@/app/components/marketing/MarketingNav";
import zp from "@/lib/design-system/zenipay-brand";
import { Building2, Wallet, Bot, ShieldCheck, Banknote, ArrowRight } from "lucide-react";

export default function BankingPage() {
  return (
    <div style={{ background: "#fff", color: zp.text.primary, minHeight: "100vh", fontFamily: zp.font.sans }}>
      <MarketingNav />

      <Hero />
      <FeatureGrid />
      <FleetStrip />
      <FinalCTA />

      <MarketingFooter />
    </div>
  );
}

function Hero() {
  return (
    <section style={{ position: "relative", overflow: "hidden" }}>
      <span aria-hidden style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `radial-gradient(circle at 12% 0%, rgba(16,185,129,0.07) 0%, transparent 55%),
                     radial-gradient(circle at 88% 30%, rgba(123,79,191,0.07) 0%, transparent 50%)`,
      }} />
      <div style={{ position: "relative", maxWidth: 1080, margin: "0 auto", padding: "72px 24px 56px", textAlign: "center" }}>
        <span style={{
          display: "inline-block", padding: "5px 12px", borderRadius: zp.radius.pill,
          background: zp.surface.bg2, border: `1px solid ${zp.surface.border}`, marginBottom: 22,
          fontSize: 11, fontWeight: zp.weight.bold, letterSpacing: "0.12em",
          textTransform: "uppercase", color: zp.brand.violet,
        }}>
          Online business banking · Canada & US
        </span>

        <h1 style={{
          margin: 0, fontFamily: zp.font.display,
          fontSize: "clamp(40px, 6vw, 68px)", fontWeight: zp.weight.semibold,
          letterSpacing: "-0.035em", lineHeight: 1.04, color: zp.text.primary,
        }}>
          Open a real bank account.
          <br />
          <span className="zp-brand-text">With AI built in.</span>
        </h1>

        <p style={{ margin: "22px auto 0", maxWidth: 640, fontSize: 17, lineHeight: 1.55, color: zp.text.muted }}>
          ZeniPay is the first online bank to ship every account with a fleet
          of AI specialists — accounting, finance, security, compliance,
          revenue. Get a real routing number, multi-wallet architecture, ACH
          and wire, instant payouts (RTP / FedNow), and a built-in
          accountant who actually reads your books.
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 30, flexWrap: "wrap" }}>
          <Link href="/register" style={primaryCta}>Open a business account</Link>
          <Link href="/pricing" style={ghostCta}>See pricing →</Link>
        </div>

        <div style={{ marginTop: 14, fontSize: 13, color: zp.text.muted }}>
          Looking for a personal account?{" "}
          <Link href="/register?type=personal" style={{ color: zp.brand.pink, textDecoration: "underline", fontWeight: zp.weight.semibold }}>
            Open one free →
          </Link>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 22, marginTop: 28, flexWrap: "wrap", fontSize: 12, color: zp.text.dim }}>
          <Trust>PCI DSS Level 1</Trust>
          <Trust>FINTRAC + FinCEN aligned</Trust>
          <Trust>Encrypted at rest</Trust>
        </div>
      </div>
    </section>
  );
}

function Trust({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ color: zp.brand.green, fontWeight: zp.weight.bold }}>✓</span>
      {children}
    </span>
  );
}

function FeatureGrid() {
  const features = [
    {
      Icon: Building2,
      title: "Real account, real routing number",
      body: "Open in minutes with full ZeniPay routing + account numbers. Send and receive ACH, wire transfers, and Interac. Hold balances in CAD and USD.",
    },
    {
      Icon: Wallet,
      title: "Multi-wallet architecture",
      body: "Spin up sub-accounts for operations, treasury, payroll, taxes — anywhere your finances split. Move money internally with zero fees, instantly.",
    },
    {
      Icon: Bot,
      title: "Built-in AI specialists",
      body: "Up to 9 agents per business account read your live data via tool calls. Ask Leo to close the books, Ben to check cashflow, Atlas to flag a fraud signal.",
    },
    {
      Icon: Banknote,
      title: "Instant payouts",
      body: "RTP and FedNow send funds in seconds. ACH for batches, wire for high-value. Payouts and inbound funding live in the same dashboard.",
    },
    {
      Icon: ShieldCheck,
      title: "Banking-grade security",
      body: "PCI DSS Level 1, SOC 2 controls, encrypted at rest, HMAC-signed sessions, Ed25519-signed agent payloads, immutable audit chain.",
    },
  ];
  return (
    <section style={{ padding: "56px 24px 72px", background: zp.surface.bg2 }}>
      <div style={{ maxWidth: 1160, margin: "0 auto" }}>
        <h2 style={{
          margin: 0, fontFamily: zp.font.display, fontSize: "clamp(28px, 3.5vw, 40px)",
          fontWeight: zp.weight.semibold, letterSpacing: "-0.025em", color: zp.text.primary,
          textAlign: "center" as const,
        }}>
          Banking that thinks.
        </h2>
        <p style={{ margin: "10px auto 36px", textAlign: "center" as const, maxWidth: 640, fontSize: 15, color: zp.text.muted }}>
          Every feature you'd expect from an online bank, plus a fleet of AI
          agents that actually read your account data and answer in plain
          language — French or English.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {features.map((f) => (
            <div key={f.title} style={{
              background: "#fff", borderRadius: zp.radius.lg,
              border: `1px solid ${zp.surface.border}`,
              padding: 22,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: zp.radius.md,
                background: zp.gradient.tintCyan, color: zp.brand.cyan,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                marginBottom: 12,
              }}>
                <f.Icon size={20} />
              </div>
              <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: zp.weight.semibold, color: zp.text.primary, letterSpacing: "-0.01em" }}>
                {f.title}
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: zp.text.muted, lineHeight: 1.55 }}>
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FleetStrip() {
  const fleet = ["Leo · Accountant", "Ben · Finance", "Atlas · Security", "Vera · Compliance", "Kai · Revenue"];
  return (
    <section style={{ padding: "56px 24px", textAlign: "center" as const }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <p style={{
          margin: 0, fontSize: 11, fontWeight: zp.weight.bold,
          letterSpacing: "0.14em", textTransform: "uppercase", color: zp.brand.violet,
        }}>
          Your AI fleet, included
        </p>
        <h2 style={{
          margin: "10px 0 16px", fontFamily: zp.font.display,
          fontSize: "clamp(24px, 3vw, 34px)", fontWeight: zp.weight.semibold,
          letterSpacing: "-0.02em", color: zp.text.primary,
        }}>
          Five agents on every personal account. Up to nine on business.
        </h2>
        <div style={{
          display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, marginTop: 20,
        }}>
          {fleet.map((n) => (
            <span key={n} style={{
              padding: "8px 14px", borderRadius: 999,
              background: zp.surface.bg2, border: `1px solid ${zp.surface.border}`,
              fontSize: 13, fontWeight: zp.weight.semibold, color: zp.text.primary,
            }}>{n}</span>
          ))}
        </div>
        <p style={{ margin: "22px auto 0", maxWidth: 600, fontSize: 14, color: zp.text.muted, lineHeight: 1.55 }}>
          Each agent has a specialty and reads your live account data. Ask in
          French or English — they reply in your language. The conversation
          persists across visits.
        </p>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section style={{ padding: "64px 24px 88px", background: zp.surface.heroInk, color: zp.text.inverse }}>
      <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" as const }}>
        <h2 style={{
          margin: 0, fontFamily: zp.font.display,
          fontSize: "clamp(28px, 4vw, 44px)", fontWeight: zp.weight.semibold,
          letterSpacing: "-0.03em", color: "#fff", lineHeight: 1.1,
        }}>
          Ready to bank with AI?
        </h2>
        <p style={{ margin: "16px auto 26px", maxWidth: 540, fontSize: 16, lineHeight: 1.55, color: "#cbd5e1" }}>
          Free to open. Personal accounts include 5 AI specialists. Business
          accounts pay only per transaction.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
          <Link href="/register" style={{
            ...primaryCta, background: "#fff", color: zp.text.primary,
            boxShadow: "none",
          }}>
            Open a business account <ArrowRight size={14} style={{ marginLeft: 6 }} />
          </Link>
          <Link href="/contact" style={{
            ...ghostCta, color: "#fff", border: `1px solid rgba(255,255,255,0.25)`,
          }}>Talk to sales</Link>
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
