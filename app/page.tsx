"use client";
import Image from "next/image";
import Link from "next/link";
import Nav from "./components/Nav";
import { useT } from "../modules/zenipay/i18n";

const ZP_GREEN = "#2DBE60";
const ZP_CYAN = "#15B8C9";
const ZP_BLUE = "#2A8FE0";
const ZP_PURPLE = "#7B4FBF";
const ZP_GRAD = `linear-gradient(135deg, ${ZP_GREEN} 0%, ${ZP_CYAN} 45%, ${ZP_PURPLE} 100%)`;
const DARK = "#0A0F1E";
const DARK2 = "#111827";
const GLASS = "rgba(255,255,255,0.05)";

export default function ZeniPayLanding() {
  const { t } = useT();
  return (
    <div style={{ background: DARK, color: "#fff", minHeight: "100vh", overflowX: "hidden" }}>
      <Nav />

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
              {t("landing.heroBadge")}
            </span>
          </div>

          <h1 style={{ fontSize: "clamp(40px, 6vw, 74px)", fontWeight: 900, lineHeight: 1.08, margin: "0 0 24px", letterSpacing: "-2px" }}>
            {t("landing.heroTitle1")}<br />
            {t("landing.heroTitle2")}<br />
            <span style={{ background: ZP_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {t("landing.heroTitle3")}
            </span>
          </h1>

          <p style={{ fontSize: "clamp(16px, 2vw, 20px)", color: "rgba(255,255,255,0.65)", lineHeight: 1.65, margin: "0 auto 20px", maxWidth: 640 }}>
            {t("landing.heroDesc1")} <strong style={{ color: "#fff" }}>{t("landing.heroDescProcessor")}</strong> {t("landing.heroDescAnd")} <strong style={{ color: "#fff" }}>{t("landing.heroDescBank")}</strong> {t("landing.heroDescRest")} <strong style={{ color: ZP_CYAN }}>{t("landing.heroDescZeniCard")}</strong>{t("landing.heroDescEnd")}
          </p>

          {/* The flow — visual pill chain */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap", margin: "0 auto 40px", maxWidth: 700 }}>
            {[
              { label: t("landing.flowCustomerPays"), sub: t("landing.flowCustomerPaysSub"), color: ZP_GREEN },
              { label: "→", sub: "", color: "rgba(255,255,255,0.2)" },
              { label: t("landing.flowProcesses"), sub: t("landing.flowProcessesSub"), color: ZP_CYAN },
              { label: "→", sub: "", color: "rgba(255,255,255,0.2)" },
              { label: t("landing.flowFunds"), sub: t("landing.flowFundsSub"), color: ZP_PURPLE },
              { label: "→", sub: "", color: "rgba(255,255,255,0.2)" },
              { label: t("landing.flowManage"), sub: t("landing.flowManageSub"), color: ZP_BLUE },
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
              {t("landing.ctaGetStarted")}
            </Link>
            <a href="mailto:info@zenipay.ca" style={{ background: GLASS, color: "#fff", textDecoration: "none", borderRadius: 12, padding: "14px 32px", fontSize: 15, fontWeight: 600, border: "1px solid rgba(255,255,255,0.15)" }}>
              {t("landing.ctaTalkToSales")}
            </a>
          </div>

          <p style={{ marginTop: 24, fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
            {t("landing.trustLine")}
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
          { num: "99.99%", label: t("landing.statUptime") },
          { num: "<200ms", label: t("landing.statProcessing") },
          { num: "135+", label: t("landing.statCurrencies") },
          { num: "0 days", label: t("landing.statHold") },
          { num: "PCI DSS", label: t("landing.statPCI") },
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
            <span style={{ fontSize: 12, color: ZP_CYAN, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>{t("landing.zeniCardBadge")}</span>
          </div>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 900, margin: "0 0 16px", letterSpacing: "-1px" }}>
            {t("landing.zeniCardTitle")}
          </h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 17, maxWidth: 600, margin: "0 auto" }}>
            {t("landing.zeniCardDesc")}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
          {[
            { icon: "💳", title: t("landing.featurePaymentsTitle"), desc: t("landing.featurePaymentsDesc"), color: ZP_GREEN, href: "/payments" },
            { icon: "🏦", title: t("landing.featureBankTitle"), desc: t("landing.featureBankDesc"), color: ZP_CYAN, href: "/tools" },
            { icon: "⚡", title: t("landing.featureZeroTitle"), desc: t("landing.featureZeroDesc"), color: ZP_PURPLE, href: "/payouts" },
            { icon: "🃏", title: t("landing.featureDebitTitle"), desc: t("landing.featureDebitDesc"), color: ZP_BLUE, href: "/tools" },
            { icon: "📒", title: t("landing.featureAccountingTitle"), desc: t("landing.featureAccountingDesc"), color: "#F5A623", href: "/tools" },
            { icon: "👥", title: t("landing.featurePaySuppliersTitle"), desc: t("landing.featurePaySuppliersDesc"), color: "#E5247B", href: "/payouts" },
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
            {t("landing.howItWorksTitle")}
          </h2>
          <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: 64, fontSize: 16 }}>
            {t("landing.howItWorksDesc")}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 32 }}>
            {[
              { step: "01", icon: "🏦", title: t("landing.step01Title"), desc: t("landing.step01Desc") },
              { step: "02", icon: "🔌", title: t("landing.step02Title"), desc: t("landing.step02Desc") },
              { step: "03", icon: "⚡", title: t("landing.step03Title"), desc: t("landing.step03Desc") },
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
          {t("landing.ctaSectionTitle")}
        </h2>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 18, margin: "0 auto 40px", maxWidth: 480 }}>
          {t("landing.ctaSectionDesc")}
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/signup" style={{ background: ZP_GRAD, color: "#fff", textDecoration: "none", padding: "16px 40px", borderRadius: 14, fontSize: 16, fontWeight: 700 }}>
            {t("landing.ctaSectionBtn")}
          </Link>
          <a href="mailto:info@zenipay.ca" style={{ background: GLASS, color: "#fff", textDecoration: "none", padding: "16px 40px", borderRadius: 14, fontSize: 16, fontWeight: 700, border: "1px solid rgba(255,255,255,0.15)" }}>
            {t("landing.ctaTalkToSales")}
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
            { label: t("landing.footerPayments"), href: "/payments" },
            { label: t("landing.footerPayouts"), href: "/payouts" },
            { label: t("landing.footerTools"), href: "/tools" },
            { label: t("landing.footerDocs"), href: "/docs" },
            { label: t("landing.footerTerms"), href: "/terms" },
            { label: t("landing.footerPrivacy"), href: "/privacy" },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none", fontSize: 13 }}>{item.label}</Link>
          ))}
        </div>
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, margin: 0 }}>
          {t("common.copyrightLong")}
        </p>
      </footer>
    </div>
  );
}
