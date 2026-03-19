"use client";
import { useState } from "react";
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
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

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
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <Image src="/zenipay-logo-nobg.png" alt="ZeniPay" width={140} height={40} style={{ objectFit: "contain" }} priority />
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
        <div style={{ maxWidth: 820 }}>
          {/* Logo big */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 40 }}>
            <Image src="/zenipay-logo-nobg.png" alt="ZeniPay" width={360} height={100} style={{ objectFit: "contain" }} priority />
          </div>

          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: GLASS, border: "1px solid rgba(45,190,96,0.3)",
            borderRadius: 24, padding: "6px 16px", marginBottom: 32,
          }}>
            <span style={{ fontSize: 11, background: ZP_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Payment Infrastructure
            </span>
          </div>

          <h1 style={{
            fontSize: "clamp(40px, 6vw, 76px)", fontWeight: 900, lineHeight: 1.1,
            margin: "0 0 24px", letterSpacing: "-2px",
          }}>
            Accept payments.<br />
            Move money.<br />
            <span style={{ background: ZP_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Scale your business.
            </span>
          </h1>

          <p style={{
            fontSize: "clamp(16px, 2vw, 20px)", color: "rgba(255,255,255,0.6)",
            lineHeight: 1.6, margin: "0 auto 48px", maxWidth: 560,
          }}>
            ZeniPay is the modern financial infrastructure businesses need to accept card payments,
            issue instant payouts, and manage money — all through a single API.
          </p>

          <div id="get-started" style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            {!submitted ? (
              <form onSubmit={handleSubmit} style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="Enter your business email"
                  required
                  style={{
                    background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
                    color: "#fff", borderRadius: 12, padding: "14px 20px", fontSize: 15,
                    width: 280, outline: "none",
                  }}
                />
                <button type="submit" style={{
                  background: ZP_GRAD, color: "#fff", border: "none",
                  borderRadius: 12, padding: "14px 32px", fontSize: 15, fontWeight: 700,
                  cursor: "pointer",
                }}>
                  Get Started →
                </button>
              </form>
            ) : (
              <div style={{
                background: GLASS, border: "1px solid rgba(45,190,96,0.3)",
                borderRadius: 12, padding: "16px 32px", color: ZP_GREEN, fontWeight: 600,
              }}>
                ✓ Thank you! We&apos;ll be in touch shortly.
              </div>
            )}
          </div>

          <p style={{ marginTop: 32, fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
            Trusted by travel, e-commerce and SaaS businesses
          </p>
        </div>
      </section>

      {/* Stats bar */}
      <section style={{
        background: GLASS, borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "40px 5%",
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 32, textAlign: "center",
      }}>
        {[
          { num: "99.99%", label: "Uptime SLA" },
          { num: "<200ms", label: "Avg response time" },
          { num: "135+", label: "Currencies supported" },
          { num: "PCI DSS", label: "Level 1 compliant" },
        ].map(s => (
          <div key={s.label}>
            <div style={{ fontSize: 32, fontWeight: 900, background: ZP_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.num}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </section>

      {/* Features */}
      <section style={{ padding: "100px 5%", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 900, margin: "0 0 16px", letterSpacing: "-1px" }}>
            Everything you need to process money
          </h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 17, maxWidth: 500, margin: "0 auto" }}>
            A complete financial stack — from card acceptance to automated payouts and real-time reporting.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
          {[
            { icon: "💳", title: "Payments", desc: "Accept Visa, Mastercard, Amex and more. Server-side tokenization, 3DS support, and intelligent retry logic built-in.", color: ZP_GREEN, href: "/payments" },
            { icon: "💸", title: "Payouts", desc: "Send money to anyone, instantly. ACH transfers, wire payments, and real-time payouts to bank accounts worldwide.", color: ZP_CYAN, href: "/payouts" },
            { icon: "📊", title: "Financial Tools", desc: "Dashboard analytics, multi-wallet architecture, commission splits, invoicing, and QuickBooks-compatible accounting exports.", color: ZP_PURPLE, href: "/tools" },
            { icon: "🔐", title: "Security & Compliance", desc: "PCI DSS Level 1, HMAC-SHA256 webhook verification, idempotency keys, and append-only audit ledger.", color: ZP_BLUE, href: "/payments" },
            { icon: "⚡", title: "Instant Reconciliation", desc: "Real-time balance tracking, double-entry bookkeeping, and automated reconciliation across all payment channels.", color: "#F5A623", href: "/tools" },
            { icon: "🧩", title: "Simple API", desc: "RESTful API with client libraries. Get from integration to live in minutes, not weeks. Full sandbox environment included.", color: "#E5247B", href: "/docs" },
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
            Go live in three steps
          </h2>
          <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: 64, fontSize: 16 }}>
            From signup to accepting payments — faster than you think.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 32 }}>
            {[
              { step: "01", title: "Create your account", desc: "Sign up, verify your business, and get your API keys in minutes." },
              { step: "02", title: "Integrate the API", desc: "Simple REST API. Full sandbox environment. Go from zero to integrated in a day." },
              { step: "03", title: "Accept payments live", desc: "Flip to production, accept your first payment, and watch money move." },
            ].map(s => (
              <div key={s.step} style={{ background: GLASS, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "32px 24px" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: ZP_GREEN, letterSpacing: "0.15em", marginBottom: 12 }}>STEP {s.step}</div>
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
          Ready to move money?
        </h2>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 18, margin: "0 0 40px" }}>
          Join businesses that trust ZeniPay for their payment infrastructure.
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/signup" style={{ background: ZP_GRAD, color: "#fff", textDecoration: "none", padding: "16px 40px", borderRadius: 14, fontSize: 16, fontWeight: 700 }}>
            Get Started Free
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
          © 2026 ZeniPay. Payment infrastructure for businesses.
        </p>
      </footer>
    </div>
  );
}
