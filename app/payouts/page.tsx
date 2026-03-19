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

export default function PayoutsPage() {
  return (
    <div style={{ background: DARK, color: "#fff", minHeight: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Nav */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(10,15,30,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 5%", height: 64 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
          <Image src="/zenipay-logo-nobg.png" alt="ZeniPay" width={140} height={40} style={{ objectFit: "contain" }} />
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          {[{ label: "Payments", href: "/payments" }, { label: "Payouts", href: "/payouts" }, { label: "Tools", href: "/tools" }, { label: "Docs", href: "/docs" }].map(item => (
            <Link key={item.label} href={item.href} style={{ color: item.label === "Payouts" ? "#fff" : "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: 14, fontWeight: item.label === "Payouts" ? 700 : 500 }}>{item.label}</Link>
          ))}
          <Link href="/login" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", textDecoration: "none", padding: "8px 20px", borderRadius: 24, fontSize: 14, fontWeight: 700 }}>Sign In</Link>
          <Link href="/login" style={{ background: ZP_GRAD, color: "#fff", textDecoration: "none", padding: "8px 20px", borderRadius: 24, fontSize: 14, fontWeight: 700 }}>Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ paddingTop: 120, paddingBottom: 80, paddingLeft: "5%", paddingRight: "5%", background: `radial-gradient(ellipse 70% 50% at 50% 0%, rgba(21,184,201,0.1) 0%, transparent 70%)` }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: GLASS, border: "1px solid rgba(21,184,201,0.3)", borderRadius: 24, padding: "6px 16px", marginBottom: 24 }}>
            <span style={{ fontSize: 11, color: ZP_CYAN, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Payouts</span>
          </div>
          <h1 style={{ fontSize: "clamp(36px, 5vw, 64px)", fontWeight: 900, lineHeight: 1.1, margin: "0 0 24px", letterSpacing: "-2px" }}>
            Pay anyone,<br /><span style={{ background: ZP_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>instantly</span>
          </h1>
          <p style={{ fontSize: 18, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, margin: "0 auto 40px", maxWidth: 560 }}>
            ACH transfers, wire payments, real-time payouts. Send money to employees, contractors, and partners — with full audit trail and automated reconciliation.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            <Link href="/login" style={{ background: ZP_GRAD, color: "#fff", textDecoration: "none", padding: "14px 32px", borderRadius: 12, fontSize: 15, fontWeight: 700 }}>Start sending payouts</Link>
            <Link href="/docs" style={{ background: GLASS, color: "#fff", textDecoration: "none", padding: "14px 32px", borderRadius: 12, fontSize: 15, fontWeight: 600, border: "1px solid rgba(255,255,255,0.15)" }}>View API docs</Link>
          </div>
        </div>
      </section>

      {/* Payout types */}
      <section style={{ padding: "80px 5%", maxWidth: 1100, margin: "0 auto" }}>
        <h2 style={{ fontSize: 36, fontWeight: 900, textAlign: "center", marginBottom: 48 }}>All payout methods, one API</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
          {[
            { icon: "🏦", title: "ACH Transfers", desc: "Standard and same-day ACH. Batch payouts to hundreds of recipients in a single API call.", color: ZP_GREEN, time: "1–2 business days" },
            { icon: "⚡", title: "Real-time Payouts", desc: "Instant payouts via RTP and FedNow networks. Money moves in seconds, 24/7/365.", color: ZP_CYAN, time: "< 30 seconds" },
            { icon: "🌐", title: "Wire Transfers", desc: "Domestic and international wire transfers. SWIFT support for cross-border payouts.", color: ZP_BLUE, time: "Same day / 1–3 days" },
            { icon: "💼", title: "Mass Payouts", desc: "Pay thousands of recipients at once. Upload a CSV or use the bulk API endpoint.", color: ZP_PURPLE, time: "Batch processing" },
            { icon: "🔁", title: "Recurring Payouts", desc: "Schedule weekly, bi-weekly, or monthly payouts automatically. No manual work.", color: "#F5A623", time: "Scheduled" },
            { icon: "📊", title: "Payout Analytics", desc: "Real-time dashboard showing payout status, failure rates, and reconciliation reports.", color: "#E5247B", time: "Real-time" },
          ].map(f => (
            <div key={f.title} style={{ background: GLASS, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 28 }}>
              <div style={{ fontSize: 28, marginBottom: 14 }}>{f.icon}</div>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 8px", color: f.color }}>{f.title}</h3>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.6, margin: "0 0 12px" }}>{f.desc}</p>
              <div style={{ display: "inline-block", background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: "4px 10px", fontSize: 12, color: f.color, fontWeight: 600 }}>⏱ {f.time}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Use cases */}
      <section style={{ padding: "60px 5%", background: `radial-gradient(ellipse 60% 40% at 50% 50%, rgba(21,184,201,0.05) 0%, transparent 70%)` }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: 32, fontWeight: 900, marginBottom: 48 }}>Built for every industry</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
            {["Travel agencies", "Gig platforms", "Marketplaces", "SaaS companies", "E-commerce", "Fintech startups"].map(uc => (
              <div key={uc} style={{ background: GLASS, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "20px 16px", fontSize: 15, fontWeight: 600 }}>{uc}</div>
            ))}
          </div>
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
