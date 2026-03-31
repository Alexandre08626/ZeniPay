"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ZeniPayLogo from "@/components/ZeniPayLogo";
import { useT, LangToggleLight } from "../../../modules/zenipay/i18n";

export default function AdminLoginPage() {
  const router = useRouter();
  const { t } = useT();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const login = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    setTimeout(() => {
      if (email === "admin@zenipay.ca" && pw === "admin2026") {
        sessionStorage.setItem("zp_admin", "1");
        router.replace("/admin");
      } else {
        setLoading(false);
        setError(t("admin.login.invalidCredentials"));
      }
    }, 600);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(150deg, #EEF4FF 0%, #F0FDF4 40%, #F5F0FF 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, fontFamily: "'Inter', system-ui, sans-serif",
    }}>

      {/* Grid texture */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        backgroundImage: "radial-gradient(circle, rgba(45,190,96,0.06) 1px, transparent 1px)",
        backgroundSize: "36px 36px",
      }} />

      <div style={{ width: "100%", maxWidth: 420, position: "relative" }}>

        {/* Logo + title */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 22, background: "#fff",
            boxShadow: "0 8px 32px rgba(45,190,96,0.15), 0 2px 8px rgba(0,0,0,0.06)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            marginBottom: 16, border: "1px solid rgba(45,190,96,0.12)",
          }}>
            <ZeniPayLogo size={46} />
          </div>
          <ZeniPayLogo size={0} showWordmark style={{ justifyContent: "center", display: "flex" }}>
            {/* wordmark only via text below */}
          </ZeniPayLogo>
          <div style={{
            fontWeight: 900, fontSize: 28,
            background: "linear-gradient(90deg, #2DBE60 0%, #15B8C9 45%, #7B4FBF 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            letterSpacing: "-0.8px", marginBottom: 4,
          }}>
            ZeniPay
          </div>
          <div style={{ color: "#64748B", fontSize: 14, fontWeight: 500 }}>
            {t("admin.login.adminConsole")}
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: "#fff", borderRadius: 24, padding: "32px 32px 28px",
          boxShadow: "0 4px 48px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
          border: "1px solid rgba(0,0,0,0.06)",
        }}>
          <form onSubmit={login}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: "#64748B", fontWeight: 700, display: "block", marginBottom: 7, letterSpacing: "0.06em" }}>
                {t("admin.login.email")}
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="admin@zenipay.ca" autoComplete="email"
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: 12,
                  background: "#F8FAFC", border: "1.5px solid #E2E8F0",
                  color: "#0D1B3A", fontSize: 14, outline: "none",
                  boxSizing: "border-box", fontFamily: "inherit", transition: "border-color 0.15s",
                }}
                onFocus={e => e.currentTarget.style.borderColor = "#2DBE60"}
                onBlur={e => e.currentTarget.style.borderColor = "#E2E8F0"}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 11, color: "#64748B", fontWeight: 700, display: "block", marginBottom: 7, letterSpacing: "0.06em" }}>
                {t("admin.login.password")}
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPw ? "text" : "password"} value={pw} onChange={e => setPw(e.target.value)}
                  required placeholder="••••••••" autoComplete="current-password"
                  style={{
                    width: "100%", padding: "12px 44px 12px 14px", borderRadius: 12,
                    background: "#F8FAFC", border: "1.5px solid #E2E8F0",
                    color: "#0D1B3A", fontSize: 14, outline: "none",
                    boxSizing: "border-box", fontFamily: "inherit", transition: "border-color 0.15s",
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = "#2DBE60"}
                  onBlur={e => e.currentTarget.style.borderColor = "#E2E8F0"}
                />
                <button type="button" onClick={() => setShowPw(v => !v)} style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", color: "#94A3B8", fontSize: 16, padding: 4,
                }}>
                  {showPw ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                marginBottom: 16, padding: "10px 14px", borderRadius: 10,
                background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
                color: "#DC2626", fontSize: 13,
              }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: "100%", padding: 14, borderRadius: 12,
              background: loading ? "#E2E8F0" : "linear-gradient(90deg, #2DBE60 0%, #15B8C9 45%, #7B4FBF 100%)",
              color: loading ? "#94A3B8" : "#fff",
              border: "none", fontSize: 15, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer",
              letterSpacing: "-0.2px",
              boxShadow: loading ? "none" : "0 4px 20px rgba(45,190,96,0.25)",
              transition: "all 0.2s",
            }}>
              {loading
                ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #94A3B8", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                    {t("admin.login.signingIn")}
                  </span>
                : t("admin.login.adminAccess")
              }
            </button>
          </form>
        </div>

        <div style={{ textAlign: "center", marginTop: 20, display: "flex", justifyContent: "center", gap: 20, alignItems: "center" }}>
          <a href="/" style={{ color: "#94A3B8", fontSize: 13, textDecoration: "none" }}>{t("admin.login.back")}</a>
          <span style={{ color: "#CBD5E1" }}>·</span>
          <a href="mailto:info@zenipay.ca" style={{ color: "#94A3B8", fontSize: 13, textDecoration: "none" }}>{t("admin.login.support")}</a>
          <span style={{ color: "#CBD5E1" }}>·</span>
          <LangToggleLight />
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
