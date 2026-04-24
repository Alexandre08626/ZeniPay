// Root / — ZeniPay marketing homepage.
//
// One page, two halves: Corporate Banking (cyan accent) and AI Agent
// Wallets (violet accent), bridged by the ZeniCore treasury narrative.
// Uses the shared zenipay-brand tokens + DiceBear avatars fetched into
// /public/agents/* at build time.

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  CreditCard, FileText, BarChart2, Lock,
  Bot, Zap, Shield, BookOpen,
  UserPlus, ArrowDownLeft, Play,
  type LucideIcon,
} from "lucide-react";
import { MarketingNav, MarketingFooter } from "@/app/components/marketing/MarketingNav";
import zp from "@/lib/design-system/zenipay-brand";

export const metadata: Metadata = {
  title: "ZeniPay — The Bank for AI-Powered Enterprises",
  description:
    "Corporate treasury + AI agent wallets in one platform. No Visa required.",
  openGraph: {
    title: "ZeniPay — The Bank for AI-Powered Enterprises",
    description:
      "Corporate treasury + AI agent wallets in one platform. No Visa required.",
    url: "https://zenipay.ca",
    siteName: "ZeniPay",
  },
};

export default function LandingPage() {
  return (
    <div style={{ background: "#fff", color: zp.text.primary, fontFamily: zp.font.sans, minHeight: "100vh" }}>
      <MarketingNav />
      <Hero />
      <PartnerStrip />
      <SectionA />
      <SectionB />
      <BridgeSection />
      <HowItWorks />
      <StatsRow />
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
        <div style={{
          display: "inline-block", padding: "5px 12px",
          borderRadius: zp.radius.pill, background: zp.surface.bg2,
          border: `1px solid ${zp.surface.border}`, marginBottom: 24,
        }}>
          <span className="zp-brand-text" style={{ fontSize: 11, fontWeight: zp.weight.bold, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            The Future of Business Banking
          </span>
        </div>

        <h1 style={{
          margin: 0, fontFamily: zp.font.display,
          fontSize: "clamp(40px, 6vw, 72px)", fontWeight: zp.weight.semibold,
          letterSpacing: "-0.035em", lineHeight: 1.02, color: zp.text.primary,
        }}>
          Your company&rsquo;s bank.
          <br />
          <span className="zp-brand-text">Your AI agents&rsquo; wallet.</span>
        </h1>

        <p style={{ margin: "22px auto 0", maxWidth: 640, fontSize: 17, lineHeight: 1.55, color: zp.text.muted }}>
          ZeniPay is the first banking platform built for businesses running AI
          agents. Corporate treasury for your team, autonomous wallets for your
          agents — unified under one roof.
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 32, flexWrap: "wrap" }}>
          <Link href="/register" style={primaryCta}>Get started free</Link>
          <Link href="/#demo" style={ghostCta}>
            <Play size={14} style={{ marginRight: 6 }} /> Watch demo
          </Link>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 22, marginTop: 28, flexWrap: "wrap", fontSize: 12, color: zp.text.dim }}>
          <TrustItem>No credit card required</TrustItem>
          <TrustItem>PCI-compliant (Finix-powered)</TrustItem>
          <TrustItem>Chain-hash audit trail</TrustItem>
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
            <div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.8, fontWeight: zp.weight.semibold }}>Merchant · Total balance</div>
            <div style={{ ...zp.amountStyle.hero, fontSize: 42, color: "#fff" }}>$47,283.12</div>
            <div style={{ fontSize: 11, opacity: 0.75 }}>2 accounts · CAD</div>
          </div>
          <div style={{ padding: "20px 22px", background: zp.gradient.heroAgents, color: zp.text.inverse, minHeight: 180, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.8, fontWeight: zp.weight.semibold }}>Agents · Treasury</div>
            <div style={{ ...zp.amountStyle.hero, fontSize: 42, color: "#fff" }}>$12,400.00</div>
            <div style={{ fontSize: 11, opacity: 0.75 }}>11 agents · ZeniCore verified</div>
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
          Enterprise-grade infrastructure, from day one.
        </div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 48, flexWrap: "wrap", color: zp.text.dim, fontWeight: zp.weight.semibold, fontSize: 18 }}>
          <span>Finix</span><span>Stripe</span><span>Supabase</span><span>Vercel</span>
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
          <Eyebrow color={zp.brand.cyan}>Corporate Banking</Eyebrow>
          <H2>A real bank account for your business.</H2>
          <p style={bodyStyle}>
            Send, receive, and manage money like Mercury — but built for the AI
            era. Multi-account treasury, payment links, automatic invoicing, and
            full accounting integration.
          </p>
          <FeatureList
            accent={zp.brand.cyan}
            items={[
              { Icon: CreditCard, title: "Virtual cards for every department" },
              { Icon: FileText,   title: "Automatic invoicing & payment links" },
              { Icon: BarChart2,  title: "GL categorization & QuickBooks export" },
              { Icon: Lock,       title: "SOC2-ready audit trail" },
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
          <div style={{ fontSize: 10, fontWeight: zp.weight.semibold, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.8 }}>Total balance · USD</div>
          <div style={{ ...zp.amountStyle.hero, fontSize: 44, color: "#fff", marginTop: 6 }}>$47,283.12</div>
          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>2 accounts · +6.2% this month</div>
        </div>
        <div style={{ padding: "14px 16px" }}>
          {[
            { name: "Business Checking",    last4: "5847", bal: "$31,420.40" },
            { name: "Savings · 4.2% APY",   last4: "9712", bal: "$15,862.72" },
          ].map((r) => (
            <div key={r.last4} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${zp.surface.border}` }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: zp.weight.semibold, color: zp.text.primary }}>{r.name}</div>
                <div style={{ fontSize: 11, color: zp.text.muted, fontFamily: zp.font.mono }}>•••• {r.last4}</div>
              </div>
              <div style={{ ...zp.amountStyle.base, fontSize: 15, color: zp.text.primary, fontWeight: zp.weight.semibold }}>{r.bal}</div>
            </div>
          ))}
          <div style={{ marginTop: 8, fontSize: 11, color: zp.text.muted }}>
            Auto-invoicing · Payment links · QuickBooks export
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionB() {
  return (
    <section style={{ padding: "96px 24px", background: zp.surface.bg2, borderTop: `1px solid ${zp.surface.border}`, borderBottom: `1px solid ${zp.surface.border}` }}>
      <div style={{ maxWidth: 1160, margin: "0 auto", display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 60, alignItems: "center" }} className="mk-twocol">
        <VisualAgents />
        <div>
          <Eyebrow color={zp.brand.violet}>AI Agent Wallets</Eyebrow>
          <H2>Give your AI agents their own wallets.</H2>
          <p style={bodyStyle}>
            Stop hard-coding API keys and credit cards into your AI agents. Give
            each agent a real wallet, a spending limit, and a full audit trail —
            with one API call.
          </p>
          <FeatureList
            accent={zp.brand.violet}
            items={[
              { Icon: Bot,      title: "Autonomous wallet per agent" },
              { Icon: Zap,      title: "Instant distribution from treasury" },
              { Icon: Shield,   title: "Real-time approval & fraud detection" },
              { Icon: BookOpen, title: "Immutable ZeniCore ledger" },
            ]}
          />
          <Link href="/agents/overview" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 24, fontSize: 13, fontWeight: zp.weight.semibold, color: zp.brand.violet, textDecoration: "none" }}>
            Explore the Agent Wallet platform →
          </Link>
        </div>
      </div>
    </section>
  );
}

function VisualAgents() {
  const AGENTS = [
    { name: "Zara",   role: "Banker",            bal: "$2,400.00", status: "active" },
    { name: "Victor", role: "Accountant",        bal: "$1,800.00", status: "active" },
    { name: "Eva",    role: "Financial Advisor", bal: "$3,100.00", status: "active" },
    { name: "Ben",    role: "Finance Agent",     bal: "$4,200.00", status: "active" },
  ];
  return (
    <div style={{
      padding: 16, borderRadius: zp.radius.xl,
      background: `linear-gradient(180deg, rgba(123,79,191,0.07) 0%, rgba(123,79,191,0) 100%)`,
      boxShadow: "0 20px 48px rgba(15,23,42,0.08), 0 0 0 1px rgba(15,23,42,0.06)",
    }}>
      <div style={{ background: "#fff", borderRadius: zp.radius.lg, border: `1px solid ${zp.surface.border}`, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${zp.surface.border}`, background: zp.surface.bg2 }}>
          <span style={{ fontSize: 13, fontWeight: zp.weight.semibold, color: zp.text.primary }}>Your Agent Fleet</span>
          <span style={{ fontSize: 10, fontWeight: zp.weight.semibold, padding: "3px 10px", borderRadius: 999, background: "rgba(123,79,191,0.12)", color: zp.brand.violet, letterSpacing: "0.06em", textTransform: "uppercase" }}>Live</span>
        </div>
        {AGENTS.map((a) => (
          <AgentRow key={a.name} name={a.name} role={a.role} bal={a.bal} status={a.status} />
        ))}
        <div style={{ padding: "14px 18px", borderTop: `2px solid ${zp.surface.border}`, background: zp.surface.bg2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: zp.text.muted, fontWeight: zp.weight.semibold, letterSpacing: "0.1em", textTransform: "uppercase" }}>Total fleet balance</span>
          <span style={{ ...zp.amountStyle.large, fontSize: 18, color: zp.brand.cyan }}>$11,500.00 USD</span>
        </div>
      </div>
    </div>
  );
}

function AgentRow({ name, role, bal, status }: { name: string; role: string; bal: string; status: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderTop: `1px solid ${zp.surface.border}` }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden", background: zp.surface.bg2, flexShrink: 0, boxShadow: `0 0 0 2px rgba(123,79,191,0.20)` }}>
        <Image src={`/agents/${name.toLowerCase()}.png`} alt={`${name} avatar`} width={36} height={36} style={{ width: 36, height: 36, objectFit: "cover" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: zp.weight.semibold, color: zp.text.primary }}>{name}</div>
        <div style={{ fontSize: 11, color: zp.text.muted }}>{role}</div>
      </div>
      <div style={{ ...zp.amountStyle.base, fontFamily: zp.font.mono, fontSize: 13, color: zp.brand.violet, fontWeight: zp.weight.semibold }}>{bal}</div>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: status === "active" ? zp.semantic.success : zp.surface.bg3, flexShrink: 0 }} />
    </div>
  );
}

function BridgeSection() {
  return (
    <section style={{ padding: "96px 24px" }}>
      <div style={{ maxWidth: 1040, margin: "0 auto", textAlign: "center" }}>
        <H2>One unified treasury.</H2>
        <p style={{ ...bodyStyle, margin: "16px auto 0", maxWidth: 640 }}>
          Fund your corporate account once. Distribute to your entire AI fleet
          instantly. ZeniCore processes every transfer internally — zero Visa,
          zero wire fees, zero delay.
        </p>
        <div style={{ marginTop: 52 }}>
          <div style={{ display: "inline-block", padding: "24px 28px", borderRadius: zp.radius.lg, background: zp.gradient.heroMerchant, color: zp.text.inverse, boxShadow: zp.elevation.heroInk }}>
            <div style={{ fontSize: 10, fontWeight: zp.weight.semibold, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.8 }}>Merchant Treasury</div>
            <div style={{ ...zp.amountStyle.large, fontSize: 28, color: "#fff", marginTop: 6 }}>$12,400.00</div>
          </div>
          <div style={{ margin: "18px auto", width: 2, height: 40, background: `linear-gradient(180deg, ${zp.brand.cyan} 0%, ${zp.brand.violet} 100%)` }} />
          <div style={{ display: "inline-block", padding: "4px 14px", borderRadius: zp.radius.pill, background: zp.surface.bg2, border: `1px solid ${zp.surface.border}`, fontSize: 11, fontWeight: zp.weight.semibold, letterSpacing: "0.08em", textTransform: "uppercase", color: zp.text.muted }}>
            ZeniCore bridge · &lt; 1s
          </div>
          <div style={{ marginTop: 28, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, maxWidth: 840, marginLeft: "auto", marginRight: "auto" }}>
            {[
              { name: "Zara",   bal: "$2,400" },
              { name: "Victor", bal: "$1,800" },
              { name: "Eva",    bal: "$3,100" },
              { name: "Ben",    bal: "$4,200" },
            ].map((a) => (
              <div key={a.name} style={{ padding: "14px 16px", borderRadius: zp.radius.md, background: "#fff", border: `1px solid ${zp.surface.border}`, borderLeft: `3px solid ${zp.brand.violet}`, display: "flex", alignItems: "center", gap: 10, boxShadow: zp.elevation.sm }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", overflow: "hidden", background: zp.surface.bg2, flexShrink: 0 }}>
                  <Image src={`/agents/${a.name.toLowerCase()}.png`} alt="" width={30} height={30} />
                </div>
                <div style={{ textAlign: "left" as const, flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: zp.weight.semibold, color: zp.text.primary }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: zp.brand.violet, fontFamily: zp.font.mono, fontWeight: zp.weight.semibold }}>{a.bal}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section style={{ padding: "96px 24px", background: zp.surface.bg2, borderTop: `1px solid ${zp.surface.border}`, borderBottom: `1px solid ${zp.surface.border}` }}>
      <div style={{ maxWidth: 1160, margin: "0 auto", textAlign: "center" }}>
        <H2>Up and running in minutes.</H2>
        <div style={{ marginTop: 48, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          {[
            { Icon: UserPlus,      title: "Open your account",   body: "Sign up in under 5 minutes. No branch, no paperwork." },
            { Icon: ArrowDownLeft, title: "Fund your treasury",  body: "Add funds via card, ACH, or wire. Instantly available." },
            { Icon: Bot,           title: "Deploy to your agents", body: "Distribute to your AI fleet with one click." },
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
          { v: "$0",       l: "Processing fees between agents" },
          { v: "< 1s",     l: "Internal transfer time" },
          { v: "SHA-256",  l: "Chain hash on every transaction" },
          { v: "11",       l: "AI agents ready to deploy" },
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

function FinalCTA() {
  return (
    <section style={{ padding: "96px 24px", textAlign: "center" as const }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <H2>The bank your AI agents deserve.</H2>
        <p style={{ ...bodyStyle, marginTop: 14 }}>Join the first wave of enterprises using ZeniPay.</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
          <Link href="/register" style={primaryCta}>Get started free</Link>
          <Link href="mailto:info@zeniva.ca" style={ghostCta}>Book a demo</Link>
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
