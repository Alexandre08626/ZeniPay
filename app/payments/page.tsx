"use client";
import Image from "next/image";
import Link from "next/link";

const ZP_GREEN = "#2DBE60"; const ZP_CYAN = "#15B8C9"; const ZP_BLUE = "#2A8FE0"; const ZP_PURPLE = "#7B4FBF";
const ZP_GRAD = `linear-gradient(135deg, ${ZP_GREEN} 0%, ${ZP_CYAN} 45%, ${ZP_PURPLE} 100%)`;
const DARK = "#0A0F1E"; const DARK2 = "#111827"; const GLASS = "rgba(255,255,255,0.05)";

const NAV_LINKS = [{ label: "Payments", href: "/payments" }, { label: "Payouts", href: "/payouts" }, { label: "Tools", href: "/tools" }, { label: "Docs", href: "/docs" }];

function Nav({ active }: { active: string }) {
  return (
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(10,15,30,0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 5%", height: 64 }}>
      <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
        <Image src="/zenipay-logo-nobg.png" alt="ZeniPay" width={140} height={40} style={{ objectFit: "contain" }} />
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
        {NAV_LINKS.map(item => (
          <Link key={item.label} href={item.href} style={{ color: item.label === active ? "#fff" : "rgba(255,255,255,0.55)", textDecoration: "none", fontSize: 14, fontWeight: item.label === active ? 700 : 500, borderBottom: item.label === active ? `2px solid ${ZP_GREEN}` : "2px solid transparent", paddingBottom: 2 }}>{item.label}</Link>
        ))}
        <Link href="/login" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", textDecoration: "none", padding: "8px 20px", borderRadius: 24, fontSize: 14, fontWeight: 700 }}>Sign In</Link>
        <Link href="/signup" style={{ background: ZP_GRAD, color: "#fff", textDecoration: "none", padding: "8px 20px", borderRadius: 24, fontSize: 14, fontWeight: 700 }}>Get Started</Link>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer style={{ background: DARK2, borderTop: "1px solid rgba(255,255,255,0.06)", padding: "48px 5%", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 24 }}>
      <Link href="/" style={{ textDecoration: "none" }}><Image src="/zenipay-logo-nobg.png" alt="ZeniPay" width={110} height={32} style={{ objectFit: "contain" }} /></Link>
      <div style={{ display: "flex", gap: 24 }}>
        {NAV_LINKS.map(item => <Link key={item.label} href={item.href} style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none", fontSize: 13 }}>{item.label}</Link>)}
      </div>
      <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, margin: 0 }}>© 2026 ZeniPay Inc.</p>
    </footer>
  );
}

export default function PaymentsPage() {
  return (
    <div style={{ background: DARK, color: "#fff", minHeight: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <Nav active="Payments" />

      {/* Hero */}
      <section style={{ paddingTop: 120, paddingBottom: 80, paddingLeft: "5%", paddingRight: "5%", background: `radial-gradient(ellipse 80% 60% at 50% -10%, rgba(45,190,96,0.13) 0%, transparent 70%)`, textAlign: "center" }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(45,190,96,0.1)", border: "1px solid rgba(45,190,96,0.3)", borderRadius: 24, padding: "6px 16px", marginBottom: 24 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: ZP_GREEN, display: "inline-block" }} />
            <span style={{ fontSize: 12, color: ZP_GREEN, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Card Payments</span>
          </div>
          <h1 style={{ fontSize: "clamp(40px, 5.5vw, 68px)", fontWeight: 900, lineHeight: 1.08, margin: "0 0 24px", letterSpacing: "-2px" }}>
            Accept every payment.<br /><span style={{ background: ZP_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Everywhere it happens.</span>
          </h1>
          <p style={{ fontSize: 19, color: "rgba(255,255,255,0.65)", lineHeight: 1.65, margin: "0 auto 44px", maxWidth: 580 }}>
            Visa, Mastercard, Amex, Discover — processed in seconds. PCI DSS Level 1, 3DS2, intelligent retry logic, and real-time webhooks built in from day one.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/signup" style={{ background: ZP_GRAD, color: "#fff", textDecoration: "none", padding: "15px 36px", borderRadius: 14, fontSize: 15, fontWeight: 800, boxShadow: "0 8px 32px rgba(45,190,96,0.3)" }}>Start free in sandbox →</Link>
            <Link href="/docs" style={{ background: GLASS, color: "#fff", textDecoration: "none", padding: "15px 36px", borderRadius: 14, fontSize: 15, fontWeight: 600, border: "1px solid rgba(255,255,255,0.15)" }}>Read the API docs</Link>
          </div>
          <p style={{ marginTop: 20, fontSize: 12, color: "rgba(255,255,255,0.3)" }}>No credit card required · PCI DSS Level 1 · 99.99% uptime SLA</p>
        </div>
      </section>

      {/* Stats */}
      <section style={{ background: "rgba(255,255,255,0.03)", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "36px 5%", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 24, textAlign: "center" }}>
        {[
          { num: "135+", label: "Currencies accepted" },
          { num: "<200ms", label: "Authorization time" },
          { num: "99.99%", label: "Uptime SLA" },
          { num: "2.9% + $0.30", label: "Standard rate" },
          { num: "0", label: "Monthly fees" },
        ].map(s => (
          <div key={s.label}>
            <div style={{ fontSize: 28, fontWeight: 900, background: ZP_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.num}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </section>

      {/* How it works */}
      <section style={{ padding: "90px 5%", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <h2 style={{ fontSize: "clamp(28px, 3.5vw, 46px)", fontWeight: 900, margin: "0 0 14px", letterSpacing: "-1px" }}>How a payment flows</h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 16, maxWidth: 480, margin: "0 auto" }}>From card swipe to bank deposit — fully automated.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 0, position: "relative" }}>
          {[
            { step: "01", icon: "💳", title: "Card tokenized", desc: "Sensitive card data is tokenized client-side. Never touches your servers." },
            { step: "02", icon: "🔐", title: "3DS2 check", desc: "SCA authentication in milliseconds. Fraud blocked before authorization." },
            { step: "03", icon: "⚡", title: "Authorized", desc: "Routed to optimal network. Intelligent retry on soft declines." },
            { step: "04", icon: "📡", title: "Webhook fired", desc: "Your server gets HMAC-signed event in real time. Act on it instantly." },
            { step: "05", icon: "🏦", title: "Settled", desc: "Funds land in your ZeniPay balance T+1. Payout on your schedule." },
          ].map((s, i) => (
            <div key={s.step} style={{ background: GLASS, border: "1px solid rgba(255,255,255,0.08)", borderRadius: i === 0 ? "20px 0 0 20px" : i === 4 ? "0 20px 20px 0" : 0, padding: "28px 20px", position: "relative", borderRight: i < 4 ? "none" : "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: ZP_GREEN, letterSpacing: "0.15em", marginBottom: 12 }}>STEP {s.step}</div>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{s.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.55 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section style={{ padding: "0 5% 90px", maxWidth: 1100, margin: "0 auto" }}>
        <h2 style={{ fontSize: "clamp(26px, 3vw, 40px)", fontWeight: 900, textAlign: "center", marginBottom: 48, letterSpacing: "-1px" }}>Everything included, no add-ons</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
          {[
            { icon: "💳", color: ZP_GREEN, title: "All major cards", desc: "Visa, Mastercard, Amex, Discover, UnionPay, JCB. Debit and credit. Prepaid and corporate." },
            { icon: "🔒", color: ZP_CYAN, title: "PCI DSS Level 1", desc: "The highest level of PCI compliance. Card data fully tokenized — your servers stay out of scope." },
            { icon: "🛡️", color: ZP_BLUE, title: "3DS2 & SCA", desc: "Strong Customer Authentication built-in. Meets EU PSD2 requirements. Reduce fraud by 80%." },
            { icon: "🔄", color: ZP_PURPLE, title: "Smart retry logic", desc: "Automatically retries soft declines with optimal timing. Recovers up to 30% of failed charges." },
            { icon: "🌍", color: ZP_GREEN, title: "135+ currencies", desc: "Charge in the customer's local currency. Dynamic currency conversion at checkout." },
            { icon: "📡", color: ZP_CYAN, title: "Signed webhooks", desc: "HMAC-SHA256 signed webhook events. Idempotency keys to prevent double-processing." },
            { icon: "🧾", color: ZP_BLUE, title: "Receipts & invoices", desc: "Auto-generated email receipts. Branded PDF invoices. Tax-compliant across jurisdictions." },
            { icon: "📊", color: ZP_PURPLE, title: "Real-time reporting", desc: "Live transaction feeds, revenue charts, decline analysis, and chargeback tracking." },
            { icon: "🔌", color: ZP_GREEN, title: "One-line integration", desc: "Drop in our JavaScript SDK. Or use the REST API directly. Both work out of the box." },
          ].map(f => (
            <div key={f.title} style={{ background: GLASS, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "28px 26px" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: f.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 14 }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px", color: f.color }}>{f.title}</h3>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Code snippet */}
      <section style={{ padding: "0 5% 90px", maxWidth: 860, margin: "0 auto" }}>
        <h2 style={{ fontSize: 32, fontWeight: 900, textAlign: "center", marginBottom: 32 }}>Live in minutes</h2>
        <div style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18, overflow: "hidden" }}>
          <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
            <span style={{ marginLeft: 12, color: "rgba(255,255,255,0.3)", fontSize: 12 }}>payment.js</span>
          </div>
          <div style={{ padding: "24px 28px", fontFamily: "monospace", fontSize: 13, lineHeight: 1.9, overflowX: "auto" }}>
            <div style={{ color: "#8b949e" }}>// 1. Install: npm install @zenipay/sdk</div>
            <div style={{ marginTop: 8 }}><span style={{ color: "#ff7b72" }}>import</span> <span style={{ color: "#e6edf3" }}>ZeniPay</span> <span style={{ color: "#ff7b72" }}>from</span> <span style={{ color: "#a5d6ff" }}>&quot;@zenipay/sdk&quot;</span>;</div>
            <div style={{ marginTop: 8 }}><span style={{ color: "#ff7b72" }}>const</span> <span style={{ color: "#e6edf3" }}>zp</span> <span style={{ color: "#ff7b72" }}>=</span> <span style={{ color: "#ff7b72" }}>new</span> <span style={{ color: "#d2a8ff" }}>ZeniPay</span><span style={{ color: "#e6edf3" }}>(</span><span style={{ color: "#a5d6ff" }}>&quot;zpk_sb_your_key&quot;</span><span style={{ color: "#e6edf3" }}>);</span></div>
            <div style={{ marginTop: 16, color: "#8b949e" }}>// 2. Create a payment</div>
            <div><span style={{ color: "#ff7b72" }}>const</span> <span style={{ color: "#e6edf3" }}>payment</span> <span style={{ color: "#ff7b72" }}>=</span> <span style={{ color: "#d2a8ff" }}>await</span> <span style={{ color: "#e6edf3" }}>zp.payments.create</span>{"({"}</div>
            <div style={{ paddingLeft: 24 }}><span style={{ color: "#79c0ff" }}>amount</span>: <span style={{ color: "#a5d6ff" }}>4999</span>,  <span style={{ color: "#8b949e" }}>// $49.99 in cents</span></div>
            <div style={{ paddingLeft: 24 }}><span style={{ color: "#79c0ff" }}>currency</span>: <span style={{ color: "#a5d6ff" }}>&quot;usd&quot;</span>,</div>
            <div style={{ paddingLeft: 24 }}><span style={{ color: "#79c0ff" }}>card_token</span>: <span style={{ color: "#a5d6ff" }}>token</span>,</div>
            <div style={{ paddingLeft: 24 }}><span style={{ color: "#79c0ff" }}>idempotency_key</span>: <span style={{ color: "#a5d6ff" }}>&quot;order-789&quot;</span>,</div>
            <div style={{ paddingLeft: 24 }}><span style={{ color: "#79c0ff" }}>description</span>: <span style={{ color: "#a5d6ff" }}>&quot;Premium subscription&quot;</span>,</div>
            <div>{"});"}</div>
            <div style={{ marginTop: 16, color: "#8b949e" }}>// ✅ Response in &lt;200ms</div>
            <div style={{ color: "#a5d6ff" }}>{`// { id: "pay_3xK9m", status: "succeeded", amount: 4999 }`}</div>
          </div>
        </div>
        <div style={{ textAlign: "center", marginTop: 28 }}>
          <Link href="/signup" style={{ display: "inline-block", background: ZP_GRAD, color: "#fff", textDecoration: "none", padding: "14px 36px", borderRadius: 12, fontSize: 15, fontWeight: 800 }}>Get your sandbox API keys →</Link>
        </div>
      </section>

      {/* Pricing */}
      <section style={{ padding: "0 5% 90px", maxWidth: 900, margin: "0 auto" }}>
        <h2 style={{ fontSize: 36, fontWeight: 900, textAlign: "center", marginBottom: 12 }}>Simple, transparent pricing</h2>
        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", marginBottom: 44 }}>No monthly fees. No setup fees. No hidden costs.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
          {[
            { title: "Standard", price: "2.9% + $0.30", per: "per successful charge", color: ZP_GREEN, features: ["Visa, Mastercard, Discover", "3DS2 included", "Real-time webhooks", "Basic reporting", "Email receipts"] },
            { title: "Business", price: "2.5% + $0.25", per: "per successful charge", color: ZP_CYAN, badge: "Most popular", features: ["Everything in Standard", "Amex & international cards", "Priority routing", "Advanced analytics", "Phone support", "Custom webhook retry"] },
            { title: "Complete", price: "2% + $0.20", per: "per successful charge", color: ZP_PURPLE, badge: "All-in-one", features: ["Instant funds — 0-day hold", "Business chequing account included", "Visa debit card (pending verification)", "Mastercard debit card (pending verification)", "Credit card available as add-on", "Full accounting suite", "Pay suppliers & employees", "Everything in Business"] },
          ].map(p => (
            <div key={p.title} style={{ background: GLASS, border: `1px solid ${p.color}33`, borderRadius: 22, padding: "32px 28px", position: "relative" }}>
              {p.badge && <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: ZP_GRAD, color: "#fff", fontSize: 10, fontWeight: 800, padding: "4px 14px", borderRadius: 20, whiteSpace: "nowrap" }}>{p.badge}</div>}
              <div style={{ fontSize: 16, fontWeight: 800, color: p.color, marginBottom: 8 }}>{p.title}</div>
              <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 4 }}>{p.price}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>{p.per}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
                {p.features.map(f => <div key={f} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}><span style={{ color: p.color }}>✓</span><span style={{ color: "rgba(255,255,255,0.75)" }}>{f}</span></div>)}
              </div>
              <Link href="/signup" style={{ display: "block", textAlign: "center", background: ZP_GRAD, color: "#fff", textDecoration: "none", padding: "12px", borderRadius: 12, fontSize: 14, fontWeight: 700 }}>
                Get started free
              </Link>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
