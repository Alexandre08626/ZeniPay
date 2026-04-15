"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ZeniPayLogo from "@/components/ZeniPayLogo";
import { useT, LangToggleLight } from "../../modules/zenipay/i18n";

const ZP_GRAD = "linear-gradient(90deg, #2DBE60 0%, #15B8C9 45%, #7B4FBF 100%)";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useT();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [mode, setMode] = useState<"live" | "sandbox">("live");

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");

    const lookupEmail = (email === "info@zenivatravel.com" ? "zenipay@zeniva.ca" : email).trim().toLowerCase();

    try {
      const res = await fetch("/api/zenipay/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: lookupEmail, password: pw }),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { setLoading(false); setError(t("login.serverError")); return; }

      if (data.success && data.merchant) {
        const m = data.merchant;
        sessionStorage.setItem("zp_client", m.id);
        sessionStorage.setItem("zp_client_email", m.email || lookupEmail);
        sessionStorage.setItem("zp_client_mode", mode);
        sessionStorage.setItem("zp_client_sandbox_key", m.sandboxKey || "");
        sessionStorage.setItem("zp_client_bname", m.businessName || "My Business");
        window.location.href = mode === "sandbox" ? "/sandbox/overview" : "/app/overview";
        return;
      }
      setLoading(false);
      setError(data.error || t("login.invalidCredentials"));
    } catch {
      setLoading(false);
      setError(t("login.connectionError"));
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(150deg, #F0FDF4 0%, #EEF4FF 40%, #FFF7ED 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, fontFamily: "'Inter', system-ui, sans-serif",
    }}>

      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        backgroundImage: "radial-gradient(circle, rgba(21,184,201,0.05) 1px, transparent 1px)",
        backgroundSize: "36px 36px",
      }} />

      <div style={{ width: "100%", maxWidth: 440, position: "relative" }}>

        {/* Logo + title */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 22, background: "#fff",
            boxShadow: "0 8px 32px rgba(21,184,201,0.15), 0 2px 8px rgba(0,0,0,0.06)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            marginBottom: 16, border: "1px solid rgba(45,190,96,0.12)",
          }}>
            <ZeniPayLogo size={46} />
          </div>
          <div style={{
            fontWeight: 900, fontSize: 28,
            background: ZP_GRAD,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            letterSpacing: "-0.8px", marginBottom: 4,
          }}>
            ZeniPay
          </div>
          <div style={{ color: "#64748B", fontSize: 14, fontWeight: 500 }}>
            {t("login.clientPortal")}
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: "#fff", borderRadius: 24, padding: "32px 32px 28px",
          boxShadow: "0 4px 48px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
          border: "1px solid rgba(0,0,0,0.06)",
        }}>

          {/* Mode Toggle */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 700, letterSpacing: "0.07em", marginBottom: 8 }}>
              {t("login.environment")}
            </div>
            <div style={{ display: "flex", background: "#F1F5F9", borderRadius: 12, padding: 4, gap: 3 }}>
              {(["live", "sandbox"] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    flex: 1, padding: "9px 12px", borderRadius: 9,
                    border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
                    transition: "all 0.18s",
                    background: mode === m ? "#fff" : "transparent",
                    color: mode === m ? (m === "live" ? "#16A34A" : "#D97706") : "#94A3B8",
                    boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
                    letterSpacing: "-0.2px",
                  }}
                >
                  <span style={{ marginRight: 6, fontSize: 9 }}>{m === "live" ? "●" : "◎"}</span>
                  {m === "live" ? t("login.live") : t("login.sandbox")}
                </button>
              ))}
            </div>
            {mode === "sandbox" && (
              <div style={{
                marginTop: 8, padding: "7px 12px", borderRadius: 8,
                background: "rgba(217,119,6,0.06)", border: "1px solid rgba(217,119,6,0.18)",
                fontSize: 12, color: "#B45309",
              }}>
                {t("login.sandboxNotice")}
              </div>
            )}
          </div>

          <form onSubmit={login}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: "#64748B", fontWeight: 700, display: "block", marginBottom: 7, letterSpacing: "0.06em" }}>
                {t("login.emailLabel")}
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder={t("login.emailPlaceholder")} autoComplete="email"
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: 12,
                  background: "#F8FAFC", border: "1.5px solid #E2E8F0",
                  color: "#0D1B3A", fontSize: 14, outline: "none",
                  boxSizing: "border-box", fontFamily: "inherit", transition: "border-color 0.15s",
                }}
                onFocus={e => e.currentTarget.style.borderColor = "#15B8C9"}
                onBlur={e => e.currentTarget.style.borderColor = "#E2E8F0"}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                <label style={{ fontSize: 11, color: "#64748B", fontWeight: 700, letterSpacing: "0.06em" }}>
                  {t("login.passwordLabel")}
                </label>
                <a href="mailto:zenipay@zeniva.ca" style={{ fontSize: 11, color: "#15B8C9", textDecoration: "none", fontWeight: 600 }}>
                  {t("login.forgotPassword")}
                </a>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type={showPw ? "text" : "password"} value={pw} onChange={e => setPw(e.target.value)}
                  required placeholder={t("login.passwordPlaceholder")} autoComplete="current-password"
                  style={{
                    width: "100%", padding: "12px 44px 12px 14px", borderRadius: 12,
                    background: "#F8FAFC", border: "1.5px solid #E2E8F0",
                    color: "#0D1B3A", fontSize: 14, outline: "none",
                    boxSizing: "border-box", fontFamily: "inherit", transition: "border-color 0.15s",
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = "#15B8C9"}
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
              background: loading ? "#E2E8F0" : ZP_GRAD,
              color: loading ? "#94A3B8" : "#fff",
              border: "none", fontSize: 15, fontWeight: 800,
              cursor: loading ? "not-allowed" : "pointer",
              letterSpacing: "-0.2px",
              boxShadow: loading ? "none" : "0 4px 20px rgba(21,184,201,0.25)",
              transition: "all 0.2s",
            }}>
              {loading
                ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #94A3B8", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                    {t("login.signingIn")}
                  </span>
                : mode === "sandbox" ? t("login.signInSandbox") : t("login.signInLive")
              }
            </button>
          </form>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 20, display: "flex", justifyContent: "center", gap: 20, alignItems: "center" }}>
          <a href="/" style={{ color: "#94A3B8", fontSize: 13, textDecoration: "none" }}>{t("login.back")}</a>
          <span style={{ color: "#CBD5E1" }}>·</span>
          <a href="mailto:zenipay@zeniva.ca" style={{ color: "#94A3B8", fontSize: 13, textDecoration: "none" }}>{t("login.support")}</a>
          <span style={{ color: "#CBD5E1" }}>·</span>
          <a href="/admin/login" style={{ color: "#CBD5E1", fontSize: 13, textDecoration: "none" }}>{t("login.admin")}</a>
          <span style={{ color: "#CBD5E1" }}>·</span>
          <LangToggleLight />
        </div>

        {/* Not a client yet */}
        <div style={{
          textAlign: "center", marginTop: 16, padding: "12px 16px",
          background: "rgba(45,190,96,0.04)", borderRadius: 12,
          border: "1px solid rgba(45,190,96,0.12)", fontSize: 13, color: "#64748B",
        }}>
          {t("common.notClientYet")}{" "}
          <a href="mailto:zenipay@zeniva.ca" style={{ color: "#16A34A", fontWeight: 700, textDecoration: "none" }}>
            {t("common.getInTouch")}
          </a>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
