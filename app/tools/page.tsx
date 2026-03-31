"use client";
import Image from "next/image";
import Link from "next/link";
import Nav from "../components/Nav";
import { useT } from "../../modules/zenipay/i18n";

const ZP_GREEN = "#2DBE60"; const ZP_CYAN = "#15B8C9"; const ZP_BLUE = "#2A8FE0"; const ZP_PURPLE = "#7B4FBF";
const ZP_GRAD = `linear-gradient(135deg, ${ZP_GREEN} 0%, ${ZP_CYAN} 45%, ${ZP_PURPLE} 100%)`;
const DARK = "#0A0F1E"; const DARK2 = "#111827"; const GLASS = "rgba(255,255,255,0.05)";

export default function ToolsPage() {
  const { t } = useT();
  return (
    <div style={{ background: DARK, color: "#fff", minHeight: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <style>{`
        @media (max-width: 768px) {
          .zp-tools-dash { grid-template-columns: 1fr !important; }
          .zp-tools-grid { grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)) !important; }
          .zp-tools-section { padding-top: 48px !important; padding-bottom: 48px !important; }
          .zp-tools-cta-btns { flex-direction: column !important; width: 100% !important; }
          .zp-tools-cta-btns a { width: 100% !important; text-align: center !important; box-sizing: border-box !important; }
        }
      `}</style>
      <Nav active="Tools" />

      {/* Hero */}
      <section style={{ paddingTop: 120, paddingBottom: 80, paddingLeft: "5%", paddingRight: "5%", background: `radial-gradient(ellipse 80% 60% at 50% -10%, rgba(123,79,191,0.12) 0%, transparent 70%)`, textAlign: "center" }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(123,79,191,0.1)", border: "1px solid rgba(123,79,191,0.3)", borderRadius: 24, padding: "6px 16px", marginBottom: 24 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: ZP_PURPLE, display: "inline-block" }} />
            <span style={{ fontSize: 12, color: ZP_PURPLE, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>{t("tools_page.badge")}</span>
          </div>
          <h1 style={{ fontSize: "clamp(40px, 5.5vw, 68px)", fontWeight: 900, lineHeight: 1.08, margin: "0 0 24px", letterSpacing: "-2px" }}>
            {t("tools_page.heroTitle1")}<br /><span style={{ background: ZP_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{t("tools_page.heroTitle2")}</span>
          </h1>
          <p style={{ fontSize: 19, color: "rgba(255,255,255,0.65)", lineHeight: 1.65, margin: "0 auto 44px", maxWidth: 580 }}>
            {t("tools_page.heroDesc")}
          </p>
          <Link href="/signup" style={{ display: "inline-block", background: ZP_GRAD, color: "#fff", textDecoration: "none", padding: "15px 36px", borderRadius: 14, fontSize: 15, fontWeight: 800, boxShadow: "0 8px 32px rgba(123,79,191,0.3)" }}>{t("tools_page.ctaDashboard")}</Link>
        </div>
      </section>

      {/* Dashboard preview cards */}
      <section className="zp-tools-section" style={{ padding: "80px 5%", maxWidth: 1100, margin: "0 auto" }}>
        <div className="zp-tools-dash" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 20 }}>
          {/* Big revenue chart card */}
          <div style={{ background: GLASS, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 22, padding: "28px 28px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Revenue this month</div>
                <div style={{ fontSize: 36, fontWeight: 900, marginTop: 4 }}>$0.00</div>
              </div>
              <div style={{ fontSize: 11, color: ZP_GREEN, background: "rgba(45,190,96,0.1)", padding: "5px 12px", borderRadius: 20, fontWeight: 700 }}>Sandbox mode</div>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 80 }}>
              {[20, 35, 28, 45, 38, 60, 42, 55, 48, 70, 58, 75].map((h, i) => (
                <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: "4px 4px 0 0", background: i === 11 ? ZP_GRAD : "rgba(45,190,96,0.25)" }} />
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
              <span>Jan</span><span>Feb</span><span>Mar</span>
            </div>
          </div>
          {/* KPIs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "Active wallets", value: "1", color: ZP_GREEN },
              { label: "Transactions", value: "0", color: ZP_CYAN },
              { label: "Failed charges", value: "0%", color: ZP_PURPLE },
            ].map(k => (
              <div key={k.label} style={{ background: GLASS, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "16px 20px", flex: 1 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{k.label}</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: k.color, marginTop: 4 }}>{k.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tools grid */}
      <section style={{ padding: "0 5% 80px", maxWidth: 1100, margin: "0 auto" }}>
        <h2 style={{ fontSize: "clamp(26px, 3vw, 42px)", fontWeight: 900, textAlign: "center", marginBottom: 12, letterSpacing: "-1px" }}>{t("tools_page.toolsTitle")}</h2>
        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", marginBottom: 48 }}>{t("tools_page.toolsDesc")}</p>
        <div className="zp-tools-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
          {[
            { icon: "📊", color: ZP_GREEN, title: "Real-time Dashboard", desc: "Live revenue charts, transaction feed, decline analysis, and KPI widgets. Update in under 1 second." },
            { icon: "👛", color: ZP_CYAN, title: "Multi-wallet Architecture", desc: "Separate wallets per product, client, or business unit. Full isolation. Transfer between wallets instantly." },
            { icon: "🧾", color: ZP_BLUE, title: "Automated Invoicing", desc: "Generate branded PDF invoices on every transaction. Email delivery, open tracking, auto-reminders." },
            { icon: "✂️", color: ZP_PURPLE, title: "Commission Splits", desc: "Revenue sharing engine. Define % rules per product or client. Auto-split on every transaction. Zero manual work." },
            { icon: "📁", color: ZP_GREEN, title: "QuickBooks Export", desc: "One-click export compatible with QuickBooks, Xero, and Wave. Saves 10+ hours of bookkeeping per month." },
            { icon: "🔍", color: ZP_CYAN, title: "Advanced Search & Filters", desc: "Find any transaction in milliseconds. Filter by date, amount, status, customer, or metadata." },
            { icon: "🔔", color: ZP_BLUE, title: "Smart Alerts", desc: "Configurable alerts for large transactions, suspicious activity, payout failures, and balance thresholds." },
            { icon: "🧮", color: ZP_PURPLE, title: "Reconciliation Engine", desc: "Double-entry bookkeeping with automated reconciliation. Close your books in minutes, not days." },
            { icon: "📈", color: ZP_GREEN, title: "Revenue Analytics", desc: "Cohort analysis, churn metrics, LTV by segment, conversion funnels — all without leaving ZeniPay." },
            { icon: "🔗", color: ZP_CYAN, title: "Payment Links", desc: "Generate a shareable payment link in 10 seconds. No code needed. Expires on your schedule." },
            { icon: "🌐", color: ZP_BLUE, title: "Hosted Checkout", desc: "Beautiful, conversion-optimized checkout page. Your branding. Hosted by ZeniPay — zero PCI scope." },
            { icon: "🔐", color: ZP_PURPLE, title: "Team & Permissions", desc: "Invite team members. Role-based access control — Admin, Finance, Developer, Read-only." },
          ].map(f => (
            <div key={f.title} style={{ background: GLASS, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "26px 24px" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: f.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 14 }}>{f.icon}</div>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 8px", color: f.color }}>{f.title}</h3>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "60px 5% 80px", textAlign: "center", background: `linear-gradient(135deg, rgba(123,79,191,0.08) 0%, rgba(45,190,96,0.08) 100%)`, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <h2 style={{ fontSize: 36, fontWeight: 900, margin: "0 0 14px" }}>{t("tools_page.ctaTitle")}</h2>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 17, margin: "0 0 36px", maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>{t("tools_page.ctaDesc")}</p>
        <div className="zp-tools-cta-btns" style={{ display: "flex", gap: 14, justifyContent: "center" }}>
          <Link href="/signup" style={{ background: ZP_GRAD, color: "#fff", textDecoration: "none", padding: "15px 36px", borderRadius: 14, fontSize: 15, fontWeight: 800 }}>{t("tools_page.ctaGetStarted")}</Link>
          <a href="mailto:info@zenipay.ca" style={{ background: GLASS, color: "#fff", textDecoration: "none", padding: "15px 36px", borderRadius: 14, fontSize: 15, fontWeight: 600, border: "1px solid rgba(255,255,255,0.15)" }}>{t("tools_page.ctaTalkToSales")}</a>
        </div>
      </section>

      <footer style={{ background: DARK2, borderTop: "1px solid rgba(255,255,255,0.06)", padding: "48px 5%", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 24 }}>
        <Link href="/" style={{ textDecoration: "none" }}><Image src="/zenipay-logo-nobg.png" alt="ZeniPay" width={110} height={32} style={{ objectFit: "contain" }} /></Link>
        <div style={{ display: "flex", gap: 24 }}>
          {[{ label: t("nav.payments"), href: "/payments" }, { label: t("nav.payouts"), href: "/payouts" }, { label: t("nav.tools"), href: "/tools" }, { label: t("nav.docs"), href: "/docs" }].map(item => <Link key={item.href} href={item.href} style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none", fontSize: 13 }}>{item.label}</Link>)}
        </div>
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, margin: 0 }}>{t("common.copyright")}</p>
      </footer>
    </div>
  );
}
