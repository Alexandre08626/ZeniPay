"use client";
import Image from "next/image";
import Link from "next/link";
import Nav from "../components/Nav";
import { useT } from "../../modules/zenipay/i18n";

const ZP_GREEN = "#2DBE60"; const ZP_CYAN = "#15B8C9"; const ZP_BLUE = "#2A8FE0"; const ZP_PURPLE = "#7B4FBF";
const ZP_GRAD = `linear-gradient(135deg, ${ZP_GREEN} 0%, ${ZP_CYAN} 45%, ${ZP_PURPLE} 100%)`;
const DARK = "#0A0F1E"; const DARK2 = "#111827"; const GLASS = "rgba(255,255,255,0.05)";

export default function PayoutsPage() {
  const { t } = useT();
  return (
    <div style={{ background: DARK, color: "#fff", minHeight: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <style>{`
        @media (max-width: 768px) {
          .zp-po-methods { grid-template-columns: 1fr !important; }
          .zp-po-2col { grid-template-columns: 1fr !important; }
          .zp-po-industries { grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)) !important; }
          .zp-po-hero-btns { flex-direction: column !important; width: 100% !important; }
          .zp-po-hero-btns a { width: 100% !important; text-align: center !important; box-sizing: border-box !important; }
          .zp-po-section { padding-top: 48px !important; padding-bottom: 48px !important; }
        }
      `}</style>
      <Nav active="Payouts" />

      {/* Hero */}
      <section style={{ paddingTop: 120, paddingBottom: 80, paddingLeft: "5%", paddingRight: "5%", background: `radial-gradient(ellipse 80% 60% at 50% -10%, rgba(21,184,201,0.12) 0%, transparent 70%)`, textAlign: "center" }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(21,184,201,0.1)", border: "1px solid rgba(21,184,201,0.3)", borderRadius: 24, padding: "6px 16px", marginBottom: 24 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: ZP_CYAN, display: "inline-block" }} />
            <span style={{ fontSize: 12, color: ZP_CYAN, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>{t("payouts_page.badge")}</span>
          </div>
          <h1 style={{ fontSize: "clamp(40px, 5.5vw, 68px)", fontWeight: 900, lineHeight: 1.08, margin: "0 0 24px", letterSpacing: "-2px" }}>
            {t("payouts_page.heroTitle1")}<br /><span style={{ background: ZP_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{t("payouts_page.heroTitle2")}</span>
          </h1>
          <p style={{ fontSize: 19, color: "rgba(255,255,255,0.65)", lineHeight: 1.65, margin: "0 auto 44px", maxWidth: 580 }}>
            {t("payouts_page.heroDesc")}
          </p>
          <div className="zp-po-hero-btns" style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/signup" style={{ background: ZP_GRAD, color: "#fff", textDecoration: "none", padding: "15px 36px", borderRadius: 14, fontSize: 15, fontWeight: 800, boxShadow: "0 8px 32px rgba(21,184,201,0.3)" }}>{t("payouts_page.ctaStart")}</Link>
            <Link href="/docs" style={{ background: GLASS, color: "#fff", textDecoration: "none", padding: "15px 36px", borderRadius: 14, fontSize: 15, fontWeight: 600, border: "1px solid rgba(255,255,255,0.15)" }}>{t("payouts_page.ctaDocs")}</Link>
          </div>
        </div>
      </section>

      {/* Payout methods */}
      <section className="zp-po-section" style={{ padding: "80px 5%", maxWidth: 1100, margin: "0 auto" }}>
        <h2 style={{ fontSize: "clamp(26px, 3vw, 42px)", fontWeight: 900, textAlign: "center", marginBottom: 12, letterSpacing: "-1px" }}>{t("payouts_page.methodsTitle")}</h2>
        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", marginBottom: 48 }}>{t("payouts_page.methodsDesc")}</p>
        <div className="zp-po-methods" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
          {[
            { icon: "⚡", color: ZP_CYAN, title: "Real-time (RTP / FedNow)", time: "< 30 seconds", availability: "24/7/365", desc: "Instant payouts via RTP and FedNow rails. Recipients see funds in seconds, not days. Ideal for on-demand platforms." },
            { icon: "🏦", color: ZP_GREEN, title: "Same-day ACH", time: "Same business day", availability: "Weekdays by 1PM ET", desc: "Guaranteed same-day settlement via NACHA same-day ACH. Perfect for payroll and contractor payments." },
            { icon: "🔄", color: ZP_BLUE, title: "Standard ACH", time: "1–2 business days", availability: "Weekdays", desc: "Low-cost ACH credit and debit. Best for recurring payouts where speed is less critical." },
            { icon: "🌐", color: ZP_PURPLE, title: "Domestic Wire", time: "Same day", availability: "Weekdays by 5PM ET", desc: "High-value domestic wire transfers via Fedwire. Full IMAD/OMAD tracking. No cap on transfer amount." },
            { icon: "✈️", color: "#F5A623", title: "International Wire (SWIFT)", time: "1–3 business days", availability: "Global", desc: "Cross-border SWIFT transfers to 180+ countries. Multi-currency settlement. Correspondent bank network." },
            { icon: "📦", color: "#E5247B", title: "Mass / Batch Payouts", time: "All of the above", availability: "Upload CSV or API", desc: "Pay thousands of recipients in one call. Upload a CSV or POST a batch. Full status tracking per recipient." },
          ].map(f => (
            <div key={f.title} style={{ background: GLASS, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "28px 26px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: f.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{f.icon}</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: f.color }}>{f.title}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>⏱ {f.time} · {f.availability}</div>
                </div>
              </div>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Recipients management */}
      <section style={{ padding: "0 5% 80px", maxWidth: 1100, margin: "0 auto" }}>
        <div className="zp-po-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: "clamp(26px, 3vw, 40px)", fontWeight: 900, margin: "0 0 16px", letterSpacing: "-1px" }}>{t("payouts_page.recipientsTitle")}</h2>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 16, lineHeight: 1.7, marginBottom: 28 }}>
              Save bank accounts as verified recipients. Reuse them for recurring payouts. Full KYC/KYB validation. ACH micro-deposit verification. Instant bank verification via Plaid.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {["Instant bank account verification (Plaid)", "ACH micro-deposit verification fallback", "Saved recipients with encrypted bank data", "Per-recipient payout limits and rules", "Full audit trail per recipient"].map(f => (
                <div key={f} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14 }}>
                  <span style={{ color: ZP_CYAN, fontSize: 16 }}>✓</span>
                  <span style={{ color: "rgba(255,255,255,0.75)" }}>{f}</span>
                </div>
              ))}
            </div>
            <Link href="/signup" style={{ display: "inline-block", marginTop: 28, background: ZP_GRAD, color: "#fff", textDecoration: "none", padding: "13px 28px", borderRadius: 12, fontSize: 14, fontWeight: 800 }}>Try it in sandbox →</Link>
          </div>
          <div style={{ background: GLASS, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "24px 28px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em" }}>Recipients</div>
            {[
              { name: "Sarah Johnson", bank: "Chase ••••4821", status: "verified", color: ZP_GREEN },
              { name: "Acme Contractors LLC", bank: "BofA ••••7392", status: "verified", color: ZP_GREEN },
              { name: "Miguel Torres", bank: "Wells Fargo ••••1047", status: "pending", color: "#D97706" },
              { name: "Nova Studios Inc.", bank: "Citi ••••9283", status: "verified", color: ZP_GREEN },
            ].map(r => (
              <div key={r.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{r.bank}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: r.color, background: r.color + "18", padding: "3px 10px", borderRadius: 20 }}>{r.status}</span>
              </div>
            ))}
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "12px", textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: ZP_CYAN }}>$0</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>Pending payouts</div>
                </div>
                <Link href="/signup" style={{ flex: 1, background: ZP_GRAD, borderRadius: 10, padding: "12px", textAlign: "center", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff" }}>
                  + Add recipient
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Industries */}
      <section style={{ padding: "0 5% 80px", background: `radial-gradient(ellipse 60% 40% at 50% 50%, rgba(21,184,201,0.05) 0%, transparent 70%)` }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: 32, fontWeight: 900, marginBottom: 12 }}>{t("payouts_page.industriesTitle")}</h2>
          <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: 44 }}>{t("payouts_page.industriesDesc")}</p>
          <div className="zp-po-industries" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            {[
              { icon: "✈️", name: "Travel Agencies", desc: "Commissions to agents & guides" },
              { icon: "🚗", name: "Gig Platforms", desc: "Driver & contractor earnings" },
              { icon: "🛒", name: "Marketplaces", desc: "Seller & vendor payouts" },
              { icon: "💼", name: "HR & Payroll", desc: "Employee salary disbursement" },
              { icon: "🎮", name: "Creator Platforms", desc: "Revenue share to creators" },
              { icon: "🏥", name: "Healthcare", desc: "Provider reimbursements" },
            ].map(ind => (
              <div key={ind.name} style={{ background: GLASS, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "22px 18px", textAlign: "left" }}>
                <div style={{ fontSize: 26, marginBottom: 10 }}>{ind.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{ind.name}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{ind.desc}</div>
              </div>
            ))}
          </div>
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
