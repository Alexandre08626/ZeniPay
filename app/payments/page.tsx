"use client";
import Image from "next/image";
import Link from "next/link";

const ZP_GREEN = "#2DBE60";
const ZP_CYAN = "#15B8C9";
const ZP_BLUE = "#2A8FE0";
const ZP_PURPLE = "#7B4FBF";
const ZP_GRAD = `linear-gradient(135deg, ${ZP_GREEN} 0%, ${ZP_CYAN} 45%, ${ZP_PURPLE} 100%)`;
const DARK = "#0A0F1E";
const DARK2 = "#111827";
const GLASS = "rgba(255,255,255,0.05)";

export default function PaymentsPage() {
  return (
    <div style={{ background: DARK, color: "#fff", minHeight: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Nav */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(10,15,30,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 5%", height: 64 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
          <Image src="/zenipay-logo-nobg.png" alt="ZeniPay" width={140} height={40} style={{ objectFit: "contain" }} />
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          {[{ label: "Payments", href: "/payments" }, { label: "Payouts", href: "/payouts" }, { label: "Tools", href: "/tools" }, { label: "Docs", href: "/docs" }].map(item => (
            <Link key={item.label} href={item.href} style={{ color: item.label === "Payments" ? "#fff" : "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: 14, fontWeight: item.label === "Payments" ? 700 : 500 }}>{item.label}</Link>
          ))}
          <Link href="/login" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", textDecoration: "none", padding: "8px 20px", borderRadius: 24, fontSize: 14, fontWeight: 700 }}>Sign In</Link>
          <Link href="/login" style={{ background: ZP_GRAD, color: "#fff", textDecoration: "none", padding: "8px 20px", borderRadius: 24, fontSize: 14, fontWeight: 700 }}>Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ paddingTop: 120, paddingBottom: 80, paddingLeft: "5%", paddingRight: "5%", background: `radial-gradient(ellipse 70% 50% at 50% 0%, rgba(45,190,96,0.1) 0%, transparent 70%)` }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: GLASS, border: "1px solid rgba(45,190,96,0.3)", borderRadius: 24, padding: "6px 16px", marginBottom: 24 }}>
            <span style={{ fontSize: 11, color: ZP_GREEN, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Payments</span>
          </div>
          <h1 style={{ fontSize: "clamp(36px, 5vw, 64px)", fontWeight: 900, lineHeight: 1.1, margin: "0 0 24px", letterSpacing: "-2px" }}>
            Accept payments<br /><span style={{ background: ZP_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>from anywhere</span>
          </h1>
          <p style={{ fontSize: 18, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, margin: "0 auto 40px", maxWidth: 560 }}>
            Visa, Mastercard, Amex, and more. Server-side tokenization, 3DS2, intelligent retry logic — everything you need to capture every sale.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            <Link href="/login" style={{ background: ZP_GRAD, color: "#fff", textDecoration: "none", padding: "14px 32px", borderRadius: 12, fontSize: 15, fontWeight: 700 }}>Start accepting payments</Link>
            <Link href="/docs" style={{ background: GLASS, color: "#fff", textDecoration: "none", padding: "14px 32px", borderRadius: 12, fontSize: 15, fontWeight: 600, border: "1px solid rgba(255,255,255,0.15)" }}>View API docs</Link>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section style={{ padding: "80px 5%", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
          {[
            { icon: "💳", title: "Card Acceptance", desc: "Visa, Mastercard, Amex, Discover. Domestic and international cards supported out of the box.", color: ZP_GREEN },
            { icon: "🔒", title: "PCI DSS Level 1", desc: "Full PCI DSS Level 1 compliance. Card data never touches your servers — fully tokenized.", color: ZP_CYAN },
            { icon: "🛡️", title: "3DS2 Authentication", desc: "Strong Customer Authentication (SCA) built-in. Reduce fraud while maintaining conversion.", color: ZP_BLUE },
            { icon: "🔄", title: "Smart Retry Logic", desc: "Intelligent payment retry reduces failed transactions by up to 30% automatically.", color: ZP_PURPLE },
            { icon: "🌍", title: "135+ Currencies", desc: "Accept payments in any currency. Dynamic currency conversion at checkout.", color: "#F5A623" },
            { icon: "⚡", title: "Real-time Webhooks", desc: "HMAC-SHA256 signed webhook events for every payment state change. Sub-second delivery.", color: "#E5247B" },
          ].map(f => (
            <div key={f.title} style={{ background: GLASS, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 28 }}>
              <div style={{ fontSize: 28, marginBottom: 14 }}>{f.icon}</div>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 10px", color: f.color }}>{f.title}</h3>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Code snippet */}
      <section style={{ padding: "60px 5%", maxWidth: 900, margin: "0 auto" }}>
        <h2 style={{ fontSize: 32, fontWeight: 900, marginBottom: 32, textAlign: "center" }}>Integrate in minutes</h2>
        <div style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "28px 32px", fontFamily: "monospace", fontSize: 14, lineHeight: 1.8, overflowX: "auto" }}>
          <div style={{ color: "#8b949e" }}>// Create a payment intent</div>
          <div><span style={{ color: "#ff7b72" }}>const</span> <span style={{ color: "#79c0ff" }}>payment</span> <span style={{ color: "#ff7b72" }}>=</span> <span style={{ color: "#d2a8ff" }}>await</span> zenipay.payments.create{"({"}</div>
          <div style={{ paddingLeft: 24 }}><span style={{ color: "#79c0ff" }}>amount</span>: <span style={{ color: "#a5d6ff" }}>1000</span>,  <span style={{ color: "#8b949e" }}>// $10.00</span></div>
          <div style={{ paddingLeft: 24 }}><span style={{ color: "#79c0ff" }}>currency</span>: <span style={{ color: "#a5d6ff" }}>&quot;usd&quot;</span>,</div>
          <div style={{ paddingLeft: 24 }}><span style={{ color: "#79c0ff" }}>card_token</span>: <span style={{ color: "#a5d6ff" }}>&quot;tok_xxxxxxxxxxxx&quot;</span>,</div>
          <div style={{ paddingLeft: 24 }}><span style={{ color: "#79c0ff" }}>idempotency_key</span>: <span style={{ color: "#a5d6ff" }}>&quot;order_123&quot;</span>,</div>
          <div>{"});"}</div>
          <div style={{ marginTop: 16, color: "#8b949e" }}>// Response</div>
          <div><span style={{ color: "#a5d6ff" }}>{`{ id: "pay_xxx", status: "succeeded", amount: 1000 }`}</span></div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: DARK2, borderTop: "1px solid rgba(255,255,255,0.06)", padding: "40px 5%", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 24 }}>
        <Link href="/" style={{ textDecoration: "none" }}><Image src="/zenipay-logo-nobg.png" alt="ZeniPay" width={110} height={32} style={{ objectFit: "contain" }} /></Link>
        <div style={{ display: "flex", gap: 24 }}>
          {[{ label: "Payments", href: "/payments" }, { label: "Payouts", href: "/payouts" }, { label: "Tools", href: "/tools" }, { label: "Docs", href: "/docs" }].map(item => (
            <Link key={item.label} href={item.href} style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none", fontSize: 13 }}>{item.label}</Link>
          ))}
        </div>
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, margin: 0 }}>© 2026 ZeniPay.</p>
      </footer>
    </div>
  );
}
