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

export const metadata = {
  title: "API Docs — ZeniPay",
  description: "ZeniPay API documentation. Integrate payments and payouts in minutes.",
};

const DOC_SECTIONS = [
  {
    category: "Getting Started",
    color: ZP_GREEN,
    items: [
      { title: "Quickstart", desc: "Accept your first payment in under 10 minutes." },
      { title: "Authentication", desc: "API keys, Bearer tokens, and security best practices." },
      { title: "Sandbox environment", desc: "Test everything without touching real money." },
      { title: "Error handling", desc: "Standard error codes and how to handle them." },
    ],
  },
  {
    category: "Payments API",
    color: ZP_CYAN,
    items: [
      { title: "Create a payment", desc: "POST /v1/payments — charge a card token." },
      { title: "Retrieve a payment", desc: "GET /v1/payments/:id — get payment details." },
      { title: "Refunds", desc: "POST /v1/refunds — full or partial refunds." },
      { title: "Webhooks", desc: "Real-time event notifications for payment state changes." },
    ],
  },
  {
    category: "Payouts API",
    color: ZP_BLUE,
    items: [
      { title: "Create a payout", desc: "POST /v1/payouts — send money to a bank account." },
      { title: "Batch payouts", desc: "POST /v1/payouts/batch — pay multiple recipients at once." },
      { title: "Payout status", desc: "GET /v1/payouts/:id — track payout delivery." },
      { title: "Recipients", desc: "Manage saved bank accounts for recurring payouts." },
    ],
  },
  {
    category: "Wallets & Balances",
    color: ZP_PURPLE,
    items: [
      { title: "Get balance", desc: "GET /v1/wallets/:id/balance — real-time balance." },
      { title: "Transactions", desc: "GET /v1/wallets/:id/transactions — full ledger history." },
      { title: "Multi-wallet", desc: "Create and manage multiple wallets per account." },
      { title: "Transfers", desc: "Move funds between your own wallets instantly." },
    ],
  },
];

export default function DocsPage() {
  return (
    <div style={{ background: DARK, color: "#fff", minHeight: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Nav */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(10,15,30,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 5%", height: 64 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
          <Image src="/zenipay-logo-nobg.png" alt="ZeniPay" width={140} height={40} style={{ objectFit: "contain" }} />
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          {[{ label: "Payments", href: "/payments" }, { label: "Payouts", href: "/payouts" }, { label: "Tools", href: "/tools" }, { label: "Docs", href: "/docs" }].map(item => (
            <Link key={item.label} href={item.href} style={{ color: item.label === "Docs" ? "#fff" : "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: 14, fontWeight: item.label === "Docs" ? 700 : 500 }}>{item.label}</Link>
          ))}
          <Link href="/login" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", textDecoration: "none", padding: "8px 20px", borderRadius: 24, fontSize: 14, fontWeight: 700 }}>Sign In</Link>
          <Link href="/login" style={{ background: ZP_GRAD, color: "#fff", textDecoration: "none", padding: "8px 20px", borderRadius: 24, fontSize: 14, fontWeight: 700 }}>Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ paddingTop: 120, paddingBottom: 60, paddingLeft: "5%", paddingRight: "5%", background: `radial-gradient(ellipse 70% 50% at 50% 0%, rgba(42,143,224,0.1) 0%, transparent 70%)` }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: GLASS, border: "1px solid rgba(42,143,224,0.3)", borderRadius: 24, padding: "6px 16px", marginBottom: 24 }}>
            <span style={{ fontSize: 11, color: ZP_BLUE, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>API Documentation</span>
          </div>
          <h1 style={{ fontSize: "clamp(36px, 5vw, 64px)", fontWeight: 900, lineHeight: 1.1, margin: "0 0 24px", letterSpacing: "-2px" }}>
            Build with<br /><span style={{ background: ZP_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>ZeniPay API</span>
          </h1>
          <p style={{ fontSize: 18, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, margin: "0 auto 40px", maxWidth: 560 }}>
            Everything you need to integrate payments, payouts, and financial tools. Clean RESTful API with comprehensive docs and sandbox environment.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            <Link href="/login" style={{ background: ZP_GRAD, color: "#fff", textDecoration: "none", padding: "14px 32px", borderRadius: 12, fontSize: 15, fontWeight: 700 }}>Get API keys</Link>
            <Link href="/sandbox" style={{ background: GLASS, color: "#fff", textDecoration: "none", padding: "14px 32px", borderRadius: 12, fontSize: 15, fontWeight: 600, border: "1px solid rgba(255,255,255,0.15)" }}>Try sandbox</Link>
          </div>
        </div>
      </section>

      {/* Base URL */}
      <section style={{ padding: "0 5% 60px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "20px 28px", fontFamily: "monospace", fontSize: 14 }}>
          <div style={{ color: "#8b949e", fontSize: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>Base URL</div>
          <div><span style={{ color: ZP_GREEN }}>https://</span><span style={{ color: "#e6edf3" }}>api.zenipay.ca/v1</span></div>
          <div style={{ marginTop: 12, color: "#8b949e", fontSize: 12 }}>All requests must include: <span style={{ color: ZP_CYAN }}>Authorization: Bearer YOUR_API_KEY</span></div>
        </div>
      </section>

      {/* Doc sections */}
      <section style={{ padding: "20px 5% 80px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(460px, 1fr))", gap: 32 }}>
          {DOC_SECTIONS.map(section => (
            <div key={section.category}>
              <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 16, color: section.color }}>{section.category}</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {section.items.map(item => (
                  <div key={item.title} style={{ background: GLASS, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "18px 20px", cursor: "pointer", transition: "border-color 0.2s" }}
                    onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.borderColor = section.color + "44")}
                    onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.08)")}>
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{item.title}</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick example */}
      <section style={{ padding: "60px 5%", maxWidth: 900, margin: "0 auto" }}>
        <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 28, textAlign: "center" }}>Quick example</h2>
        <div style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "28px 32px", fontFamily: "monospace", fontSize: 13, lineHeight: 1.9, overflowX: "auto" }}>
          <div style={{ color: "#8b949e" }}># Create a payment</div>
          <div><span style={{ color: "#ff7b72" }}>curl</span> -X POST https://api.zenipay.ca/v1/payments \</div>
          <div style={{ paddingLeft: 24 }}>-H <span style={{ color: "#a5d6ff" }}>&quot;Authorization: Bearer zp_live_xxxxxxxxxxxx&quot;</span> \</div>
          <div style={{ paddingLeft: 24 }}>-H <span style={{ color: "#a5d6ff" }}>&quot;Content-Type: application/json&quot;</span> \</div>
          <div style={{ paddingLeft: 24 }}>-d <span style={{ color: "#a5d6ff" }}>{`'{"amount":5000,"currency":"usd","card_token":"tok_xxx"}'`}</span></div>
          <div style={{ marginTop: 20, color: "#8b949e" }}># Response</div>
          <div style={{ color: "#a5d6ff" }}>{`{`}</div>
          <div style={{ paddingLeft: 24, color: "#79c0ff" }}>&quot;id&quot;: <span style={{ color: "#a5d6ff" }}>&quot;pay_3xK9mNpqr&quot;</span>,</div>
          <div style={{ paddingLeft: 24, color: "#79c0ff" }}>&quot;status&quot;: <span style={{ color: ZP_GREEN }}>&quot;succeeded&quot;</span>,</div>
          <div style={{ paddingLeft: 24, color: "#79c0ff" }}>&quot;amount&quot;: <span style={{ color: "#a5d6ff" }}>5000</span>,</div>
          <div style={{ paddingLeft: 24, color: "#79c0ff" }}>&quot;currency&quot;: <span style={{ color: "#a5d6ff" }}>&quot;usd&quot;</span></div>
          <div style={{ color: "#a5d6ff" }}>{`}`}</div>
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
