"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useT, LangToggle } from "../../modules/zenipay/i18n";

const ZP_GREEN = "#2DBE60";
const ZP_CYAN = "#15B8C9";
const ZP_PURPLE = "#7B4FBF";
const ZP_GRAD = `linear-gradient(135deg, ${ZP_GREEN} 0%, ${ZP_CYAN} 45%, ${ZP_PURPLE} 100%)`;

export default function Nav({ active = "" }: { active?: string }) {
  const [open, setOpen] = useState(false);
  const { t } = useT();

  const NAV_LINKS = [
    { label: t("nav.payments"), href: "/payments", key: "Payments" },
    { label: t("nav.payouts"), href: "/payouts", key: "Payouts" },
    { label: t("nav.tools"), href: "/tools", key: "Tools" },
    { label: t("nav.docs"), href: "/docs", key: "Docs" },
  ];

  return (
    <>
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
        background: "rgba(10,15,30,0.92)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 5%", height: 64,
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }} onClick={() => setOpen(false)}>
          <Image src="/zenipay-logo-nobg.png" alt="ZeniPay" width={160} height={46} style={{ objectFit: "contain" }} priority />
        </Link>

        {/* Desktop links */}
        <div style={{ display: "flex", alignItems: "center", gap: 28 }} className="zp-desktop-nav">
          {NAV_LINKS.map(item => (
            <Link
              key={item.key}
              href={item.href}
              style={{
                color: item.key === active ? "#fff" : "rgba(255,255,255,0.6)",
                textDecoration: "none", fontSize: 14, fontWeight: item.key === active ? 700 : 500,
                borderBottom: item.key === active ? `2px solid ${ZP_PURPLE}` : "2px solid transparent",
                paddingBottom: 2,
              }}
            >{item.label}</Link>
          ))}
          <LangToggle />
          <Link href="/login" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", textDecoration: "none", padding: "8px 18px", borderRadius: 24, fontSize: 14, fontWeight: 700 }}>{t("nav.signIn")}</Link>
          <Link href="/signup" style={{ background: ZP_GRAD, color: "#fff", textDecoration: "none", padding: "8px 18px", borderRadius: 24, fontSize: 14, fontWeight: 700 }}>{t("nav.getStarted")}</Link>
        </div>

        {/* Hamburger */}
        <button
          className="zp-hamburger"
          onClick={() => setOpen(o => !o)}
          aria-label={t("nav.menu")}
          style={{
            background: "none", border: "none", cursor: "pointer",
            display: "none", flexDirection: "column", gap: 5, padding: 8,
          }}
        >
          <span style={{ display: "block", width: 22, height: 2, background: "#fff", borderRadius: 2, transition: "transform 0.2s", transform: open ? "rotate(45deg) translate(5px,5px)" : "none" }} />
          <span style={{ display: "block", width: 22, height: 2, background: "#fff", borderRadius: 2, transition: "opacity 0.2s", opacity: open ? 0 : 1 }} />
          <span style={{ display: "block", width: 22, height: 2, background: "#fff", borderRadius: 2, transition: "transform 0.2s", transform: open ? "rotate(-45deg) translate(5px,-5px)" : "none" }} />
        </button>
      </nav>

      {/* Mobile menu overlay */}
      {open && (
        <div
          style={{
            position: "fixed", top: 64, left: 0, right: 0, bottom: 0, zIndex: 199,
            background: "rgba(10,15,30,0.97)", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 10,
          }}
          className="zp-mobile-menu"
        >
          {NAV_LINKS.map(item => (
            <Link
              key={item.key}
              href={item.href}
              onClick={() => setOpen(false)}
              style={{
                color: item.key === active ? "#fff" : "rgba(255,255,255,0.75)",
                textDecoration: "none", fontSize: 22, fontWeight: 700,
                padding: "12px 0", width: "80%", textAlign: "center",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
              }}
            >{item.label}</Link>
          ))}
          <div style={{ marginTop: 16 }}><LangToggle /></div>
          <Link href="/login" onClick={() => setOpen(false)} style={{ marginTop: 8, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", textDecoration: "none", padding: "14px 40px", borderRadius: 24, fontSize: 16, fontWeight: 700, width: "80%", textAlign: "center" }}>{t("nav.signIn")}</Link>
          <Link href="/signup" onClick={() => setOpen(false)} style={{ background: ZP_GRAD, color: "#fff", textDecoration: "none", padding: "14px 40px", borderRadius: 24, fontSize: 16, fontWeight: 800, width: "80%", textAlign: "center" }}>{t("nav.getStarted")}</Link>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .zp-desktop-nav { display: none !important; }
          .zp-hamburger { display: flex !important; }
          .zp-mobile-menu { display: flex !important; }
        }
      `}</style>
    </>
  );
}
