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

export default function ZeniPayLanding() {
  return (
    <div style={{ background: DARK, color: "#fff", minHeight: "100vh", overflowX: "hidden" }}>
      {/* Nav */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: "rgba(10,15,30,0.85)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 5%", height: 64,
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <Image src="/zenipay-logo-nobg.png" alt="ZeniPay" width={280} height={80} style={{ objectFit: "contain" }} priority />
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          {[
            { label: "Payments", href: "/payments" },
            { label: "Payouts", href: "/payouts" },
            { label: "Tools", href: "/tools" },
            { label: "Docs", href: "/docs" },
          ].map(item => (
            <Link key={item.label} href={item.href} style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: 14, fontWeight: 500 }}
               onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
               onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}>
              {item.label}
            </Link>
          ))}
          <Link href="/login" style={{ marginRight: 8, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", textDecoration: "none", padding: "8px 20px", borderRadius: 24, fontSize: 14, fontWeight: 700 }}>Sign In</Link>
          <Link href="/signup" style={{ background: ZP_GRAD, color: "#fff", textDecoration: "none", padding: "8px 20px", borderRadius: 24, fontSize: 14, fontWeight: 700 }}>Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        textAlign: "center", padding: "120px 5% 80px",
        background: `radial-gradient(ellipse 80% 60% at 50% -10%, rgba(45,190,96,0.12) 0%, transparent 70%), ${DARK}`,
      }}>
        <div style={{ maxWidth: 860 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 40 }}>
            <Image src="/zenipay-logo-nobg.png" alt="ZeniPay" width={920} height={255} style={{ objectFit: "contain", maxWidth: "100%" }} priority />
          </div>

          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: GLASS, border: "1px solid rgba(45,190,96,0.3)",
            borderRadius: 24, padding: "6px 16px", marginBottom: 32,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: ZP_GREEN, display: "inline-block" }} />
            <span style={{ fontSize: 11, background: ZP_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Accept payments · Bank like a pro · All in one
            </span>
          </div>

          <h1 style={{ fontSize: "clamp(40px, 6vw, 74px)", fontWeight: 900, lineHeight: 1.08, margin: "0 0 24px", letterSpacing: "-2px" }}>
            Accept Visa, Mastercard & more.<br />
            Every dollar lands in your<br />
            <span style={{ background: ZP_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              ZeniCard — instantly.
            </span>
          </h1>

          <p style={{ fontSize: "clamp(16px, 2vw, 20px)", color: "rgba(255,255,255,0.65)", lineHeight: 1.65, margin: "0 auto 20px", maxWidth: 640 }}>
            ZeniPay is a <strong style={{ color: "#fff" }}>payment processor</strong> and a <strong style={{ color: "#fff" }}>business bank account</strong> in one. Accept card payments from your customers — funds go straight into your <strong style={{ color: ZP_CYAN }}>ZeniCard</strong>, a real business chequing or savings account. Then manage everything from a single dashboard.
          </p>

          {/* The flow — visual pill chain */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap", margin: "0 auto 40px", maxWidth: 700 }}>
            {[
              { label: "Customer pays", sub: "Visa · MC · Amex", color: ZP_GREEN },
              { label: "→", sub: "", color: "rgba(255,255,255,0.2)" },
              { label: "ZeniPay processes", sub: "< 200ms · PCI L1", color: ZP_CYAN },
              { label: "→", sub: "", color: "rgba(255,255,255,0.2)" },
              { label: "Funds in ZeniCard", sub: "Instant · 0-day hold", color: ZP_PURPLE },
              { label: "→", sub: "", color: "rgba(255,255,255,0.2)" },
              { label: "You manage it all", sub: "Dashboard · Tools", color: ZP_BLUE },
            ].map((s, i) => s.sub ? (
              <div key={i} style={{ background: s.color + "18", border: `1px solid ${s.color}44`, borderRadius: 12, padding: "8px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.label}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{s.sub}</div>
              </div>
            ) : (
              <div key={i} style={{ fontSize: 18, color: s.color, fontWeight: 700 }}>→</div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/signup" style={{ background: ZP_GRAD, color: "#fff", textDecoration: "none", borderRadius: 12, padding: "14px 36px", fontSize: 15, fontWeight: 800, boxShadow: "0 8px 32px rgba(45,190,96,0.25)" }}>
              Open your ZeniCard free →
            </Link>
            <a href="mailto:info@zenipay.ca" style={{ background: GLASS, color: "#fff", textDecoration: "none", borderRadius: 12, padding: "14px 32px", fontSize: 15, fontWeight: 600, border: "1px solid rgba(255,255,255,0.15)" }}>
              Talk to Sales
            </a>
          </div>

          <p style={{ marginTop: 24, fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
            Trusted by travel, e-commerce and SaaS businesses · No setup fees · PCI DSS Level 1
          </p>
        </div>
      </section>

      {/* Stats bar */}
      <section style={{
        background: GLASS, borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "40px 5%",
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 32, textAlign: "center",
      }}>
        {[
          { num: "99.99%", label: "Uptime SLA" },
          { num: "<200ms", label: "Processing time" },
          { num: "135+", label: "Currencies accepted" },
          { num: "0 days", label: "Hold on your funds" },
          { num: "PCI DSS", label: "Level 1 certified" },
        ].map(s => (
          <div key={s.label}>
            <div style={{ fontSize: 28, fontWeight: 900, background: ZP_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.num}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </section>

      {/* What is ZeniCard */}
      <section style={{ padding: "100px 5%", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(21,184,201,0.1)", border: "1px solid rgba(21,184,201,0.3)", borderRadius: 24, padding: "6px 16px", marginBottom: 20 }}>
            <span style={{ fontSize: 12, color: ZP_CYAN, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>ZeniCard — Your Business Account</span>
          </div>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 900, margin: "0 0 16px", letterSpacing: "-1px" }}>
            One account. The complete picture.
          </h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 17, maxWidth: 600, margin: "0 auto" }}>
            When you use ZeniPay, you get two things working together: a world-class payment processor that accepts any card — and a real business bank account (ZeniCard) where every dollar lands instantly.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
          {[
            { icon: "💳", title: "Accept all card payments", desc: "Accept Visa, Mastercard, Amex, Discover and 135+ currencies from your customers worldwide. Your checkout, our infrastructure.", color: ZP_GREEN, href: "/payments" },
            { icon: "🏦", title: "ZeniCard — your business account", desc: "Every payment you accept lands instantly in your ZeniCard — a real business chequing or savings account. No intermediary. No delay.", color: ZP_CYAN, href: "/tools" },
            { icon: "⚡", title: "Zero-day hold on funds", desc: "Funds are available in your ZeniCard the moment a payment succeeds. Use them immediately — no waiting periods.", color: ZP_PURPLE, href: "/payouts" },
            { icon: "🃏", title: "ZeniCard debit card", desc: "Spend directly from your ZeniCard balance with Visa & Mastercard debit cards (pending verification). Physical and virtual cards available.", color: ZP_BLUE, href: "/tools" },
            { icon: "📒", title: "Built-in accounting suite", desc: "Invoicing, reconciliation, double-entry bookkeeping, QuickBooks & Xero export. Everything you need to run clean books.", color: "#F5A623", href: "/tools" },
            { icon: "👥", title: "Pay suppliers & employees", desc: "Use your ZeniCard balance to pay vendors, contractors, and employees via ACH, RTP, wire, or SWIFT — all from the dashboard.", color: "#E5247B", href: "/payouts" },
          ].map(f => (
            <Link key={f.title} href={f.href} style={{ textDecoration: "none" }}>
              <div style={{
                background: GLASS, border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 20, padding: 32, cursor: "pointer",
                transition: "border-color 0.2s, transform 0.2s",
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = f.color + "44"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLDivElement).style.transform = "none"; }}>
                <div style={{ fontSize: 32, marginBottom: 16 }}>{f.icon}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 12px", color: f.color }}>{f.title}</h3>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{
        padding: "80px 5%",
        background: `radial-gradient(ellipse 60% 40% at 50% 50%, rgba(42,143,224,0.08) 0%, transparent 70%)`,
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(24px, 3.5vw, 42px)", fontWeight: 900, margin: "0 0 16px", letterSpacing: "-1px" }}>
            From signup to first payment in 3 steps
          </h2>
          <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: 64, fontSize: 16 }}>
            One account. Accept payments and bank — all in one place.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 32 }}>
            {[
              { step: "01", icon: "🏦", title: "Open your ZeniCard", desc: "Sign up, verify your business, and get your ZeniCard business account + API keys instantly." },
              { step: "02", icon: "🔌", title: "Integrate payments", desc: "Drop in our SDK or use the REST API. Start accepting Visa, Mastercard and more the same day." },
              { step: "03", icon: "⚡", title: "Funds hit your ZeniCard", desc: "Every payment clears directly into your ZeniCard. Spend, transfer, or pay people — immediately." },
            ].map(s => (
              <div key={s.step} style={{ background: GLASS, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "32px 24px" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: ZP_GREEN, letterSpacing: "0.15em", marginBottom: 12 }}>STEP {s.step}</div>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{s.icon}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 12px" }}>{s.title}</h3>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        padding: "100px 5%", textAlign: "center",
        background: `linear-gradient(135deg, rgba(45,190,96,0.08) 0%, rgba(123,79,191,0.08) 100%)`,
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}>
        <h2 style={{ fontSize: "clamp(28px, 4vw, 52px)", fontWeight: 900, margin: "0 0 16px", letterSpacing: "-1.5px" }}>
          Your payments. Your bank. One dashboard.
        </h2>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 18, margin: "0 auto 40px", maxWidth: 480 }}>
          Open your ZeniCard today — accept card payments and bank your money in the same place. Free to start.
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/signup" style={{ background: ZP_GRAD, color: "#fff", textDecoration: "none", padding: "16px 40px", borderRadius: 14, fontSize: 16, fontWeight: 700 }}>
            Open your ZeniCard free →
          </Link>
          <a href="mailto:info@zenipay.ca" style={{ background: GLASS, color: "#fff", textDecoration: "none", padding: "16px 40px", borderRadius: 14, fontSize: 16, fontWeight: 700, border: "1px solid rgba(255,255,255,0.15)" }}>
            Talk to Sales
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        background: DARK2, borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "48px 5%", display: "flex", justifyContent: "space-between",
        alignItems: "center", flexWrap: "wrap", gap: 24,
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
          <Image src="/zenipay-logo-nobg.png" alt="ZeniPay" width={110} height={32} style={{ objectFit: "contain" }} />
        </Link>
        <div style={{ display: "flex", gap: 24 }}>
          {[
            { label: "Payments", href: "/payments" },
            { label: "Payouts", href: "/payouts" },
            { label: "Tools", href: "/tools" },
            { label: "Docs", href: "/docs" },
          ].map(item => (
            <Link key={item.label} href={item.href} style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none", fontSize: 13 }}>{item.label}</Link>
          ))}
        </div>
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, margin: 0 }}>
          © 2026 ZeniPay Inc. · zenipay.ca
        </p>
      </footer>
    </div>
  );
}
