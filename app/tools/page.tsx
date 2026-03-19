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

export default function ToolsPage() {
  return (
    <div style={{ background: DARK, color: "#fff", minHeight: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Nav */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(10,15,30,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 5%", height: 64 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
          <Image src="/zenipay-logo-nobg.png" alt="ZeniPay" width={140} height={40} style={{ objectFit: "contain" }} />
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          {[{ label: "Payments", href: "/payments" }, { label: "Payouts", href: "/payouts" }, { label: "Tools", href: "/tools" }, { label: "Docs", href: "/docs" }].map(item => (
            <Link key={item.label} href={item.href} style={{ color: item.label === "Tools" ? "#fff" : "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: 14, fontWeight: item.label === "Tools" ? 700 : 500 }}>{item.label}</Link>
          ))}
          <Link href="/login" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", textDecoration: "none", padding: "8px 20px", borderRadius: 24, fontSize: 14, fontWeight: 700 }}>Sign In</Link>
          <Link href="/login" style={{ background: ZP_GRAD, color: "#fff", textDecoration: "none", padding: "8px 20px", borderRadius: 24, fontSize: 14, fontWeight: 700 }}>Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ paddingTop: 120, paddingBottom: 80, paddingLeft: "5%", paddingRight: "5%", background: `radial-gradient(ellipse 70% 50% at 50% 0%, rgba(123,79,191,0.1) 0%, transparent 70%)` }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: GLASS, border: "1px solid rgba(123,79,191,0.3)", borderRadius: 24, padding: "6px 16px", marginBottom: 24 }}>
            <span style={{ fontSize: 11, color: ZP_PURPLE, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Financial Tools</span>
          </div>
          <h1 style={{ fontSize: "clamp(36px, 5vw, 64px)", fontWeight: 900, lineHeight: 1.1, margin: "0 0 24px", letterSpacing: "-2px" }}>
            Your complete<br /><span style={{ background: ZP_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>financial toolkit</span>
          </h1>
          <p style={{ fontSize: 18, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, margin: "0 auto 40px", maxWidth: 560 }}>
            Multi-wallet architecture, real-time analytics, automated invoicing, and QuickBooks-compatible exports — all in one place.
          </p>
          <Link href="/login" style={{ display: "inline-block", background: ZP_GRAD, color: "#fff", textDecoration: "none", padding: "14px 32px", borderRadius: 12, fontSize: 15, fontWeight: 700 }}>Access your dashboard</Link>
        </div>
      </section>

      {/* Tools grid */}
      <section style={{ padding: "80px 5%", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
          {[
            { icon: "📊", title: "Real-time Dashboard", desc: "Live revenue charts, transaction feeds, and KPIs. See your business health at a glance.", color: ZP_GREEN },
            { icon: "👛", title: "Multi-wallet Architecture", desc: "Separate wallets for different products, clients, or business units. Full isolation and audit trail.", color: ZP_CYAN },
            { icon: "🧾", title: "Automated Invoicing", desc: "Generate professional invoices automatically. Send via email, track payment status, auto-remind.", color: ZP_BLUE },
            { icon: "✂️", title: "Commission Splits", desc: "Automatically split revenue between agents, partners, and platforms. Configurable rules engine.", color: ZP_PURPLE },
            { icon: "📁", title: "QuickBooks Export", desc: "One-click export to QuickBooks-compatible format. Save hours on bookkeeping every month.", color: "#F5A623" },
            { icon: "🔍", title: "Transaction Search", desc: "Search and filter millions of transactions instantly. Advanced filters by date, amount, status, merchant.", color: "#E5247B" },
            { icon: "🔔", title: "Smart Alerts", desc: "Get notified for large transactions, failed payments, suspicious activity, and balance thresholds.", color: ZP_GREEN },
            { icon: "🧮", title: "Reconciliation Engine", desc: "Double-entry bookkeeping with automated reconciliation. Zero manual work at month end.", color: ZP_CYAN },
            { icon: "📈", title: "Revenue Analytics", desc: "Cohort analysis, conversion funnels, revenue forecasting, and churn metrics — all built-in.", color: ZP_BLUE },
          ].map(f => (
            <div key={f.title} style={{ background: GLASS, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 28 }}>
              <div style={{ fontSize: 28, marginBottom: 14 }}>{f.icon}</div>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 10px", color: f.color }}>{f.title}</h3>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "80px 5%", textAlign: "center", background: `linear-gradient(135deg, rgba(123,79,191,0.08) 0%, rgba(45,190,96,0.08) 100%)`, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <h2 style={{ fontSize: 36, fontWeight: 900, margin: "0 0 16px" }}>Ready to take control of your finances?</h2>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 17, margin: "0 0 36px" }}>All tools included with every ZeniPay plan.</p>
        <Link href="/login" style={{ display: "inline-block", background: ZP_GRAD, color: "#fff", textDecoration: "none", padding: "16px 40px", borderRadius: 14, fontSize: 16, fontWeight: 700 }}>Get started free →</Link>
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
