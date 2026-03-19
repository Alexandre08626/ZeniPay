"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const ZP_GRAD = "linear-gradient(90deg, #2DBE60 0%, #15B8C9 45%, #7B4FBF 100%)";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"live"|"sandbox">("live");
  const [showPw, setShowPw] = useState(false);

  const login = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    setTimeout(() => {
      if (email === "admin@zenipay.ca" && pw === "admin2026") {
        sessionStorage.setItem("zp_admin", "1");
        sessionStorage.setItem("zp_mode", mode);
        router.replace("/admin");
      } else {
        setLoading(false);
        setError("Identifiants invalides. Contactez info@zenipay.ca pour obtenir l'accès.");
      }
    }, 600);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(150deg, #EEF4FF 0%, #F0FDF4 40%, #F5F0FF 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>

      {/* Subtle grid pattern */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        backgroundImage: "radial-gradient(circle, rgba(45,190,96,0.06) 1px, transparent 1px)",
        backgroundSize: "36px 36px",
      }} />

      <div style={{ width: "100%", maxWidth: 440, position: "relative" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 22,
            background: "#fff",
            boxShadow: "0 8px 32px rgba(45,190,96,0.18), 0 2px 8px rgba(0,0,0,0.06)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            marginBottom: 16, border: "1px solid rgba(45,190,96,0.15)",
          }}>
            <img
              src="/zenipay-logo.png"
              alt="ZeniPay"
              style={{ width: 48, height: 48, objectFit: "contain" }}
              onError={e => {
                const t = e.currentTarget.parentElement!;
                e.currentTarget.style.display = "none";
                t.innerHTML = `<span style="font-weight:900;font-size:22px;background:${ZP_GRAD};-webkit-background-clip:text;-webkit-text-fill-color:transparent">ZP</span>`;
              }}
            />
          </div>
          <div style={{
            fontWeight: 900, fontSize: 30,
            background: ZP_GRAD,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            letterSpacing: "-0.8px", marginBottom: 4,
          }}>
            ZeniPay
          </div>
          <div style={{ color: "#64748B", fontSize: 14, fontWeight: 500 }}>
            Console d&apos;administration
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: "#fff",
          borderRadius: 24,
          padding: "32px 32px 28px",
          boxShadow: "0 4px 48px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
          border: "1px solid rgba(0,0,0,0.06)",
        }}>

          {/* Mode Toggle */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 700, letterSpacing: "0.07em", marginBottom: 8 }}>
              ENVIRONMENT
            </div>
            <div style={{
              display: "flex", background: "#F1F5F9", borderRadius: 12,
              padding: 4, gap: 3,
            }}>
              {(["live", "sandbox"] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    flex: 1, padding: "9px 12px",
                    borderRadius: 9, border: "none", cursor: "pointer",
                    fontSize: 13, fontWeight: 700, transition: "all 0.18s",
                    background: mode === m ? "#fff" : "transparent",
                    color: mode === m ? (m === "live" ? "#16A34A" : "#D97706") : "#94A3B8",
                    boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
                    letterSpacing: "-0.2px",
                  }}
                >
                  <span style={{ marginRight: 6, fontSize: 9 }}>{m === "live" ? "●" : "◎"}</span>
                  {m === "live" ? "Live" : "Sandbox"}
                </button>
              ))}
            </div>
            {mode === "sandbox" && (
              <div style={{
                marginTop: 8, padding: "7px 12px", borderRadius: 8,
                background: "rgba(217,119,6,0.06)", border: "1px solid rgba(217,119,6,0.18)",
                fontSize: 12, color: "#B45309",
              }}>
                Mode Sandbox — aucune transaction réelle
              </div>
            )}
          </div>

          <form onSubmit={login}>
            {/* Email */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: "#64748B", fontWeight: 700, display: "block", marginBottom: 7, letterSpacing: "0.06em" }}>
                EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="admin@zenipay.ca"
                autoComplete="email"
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: 12,
                  background: "#F8FAFC", border: "1.5px solid #E2E8F0",
                  color: "#0D1B3A", fontSize: 14, outline: "none",
                  boxSizing: "border-box", transition: "border-color 0.15s",
                  fontFamily: "inherit",
                }}
                onFocus={e => e.currentTarget.style.borderColor = "#2DBE60"}
                onBlur={e => e.currentTarget.style.borderColor = "#E2E8F0"}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 11, color: "#64748B", fontWeight: 700, display: "block", marginBottom: 7, letterSpacing: "0.06em" }}>
                MOT DE PASSE
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPw ? "text" : "password"}
                  value={pw}
                  onChange={e => setPw(e.target.value)}
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{
                    width: "100%", padding: "12px 44px 12px 14px",
                    borderRadius: 12, background: "#F8FAFC",
                    border: "1.5px solid #E2E8F0", color: "#0D1B3A",
                    fontSize: 14, outline: "none", boxSizing: "border-box",
                    transition: "border-color 0.15s", fontFamily: "inherit",
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = "#2DBE60"}
                  onBlur={e => e.currentTarget.style.borderColor = "#E2E8F0"}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: "#94A3B8", fontSize: 16, padding: 4, lineHeight: 1,
                  }}
                >
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

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: 14, borderRadius: 12,
                background: loading ? "#E2E8F0" : ZP_GRAD,
                color: loading ? "#94A3B8" : "#fff",
                border: "none", fontSize: 15, fontWeight: 800,
                cursor: loading ? "not-allowed" : "pointer",
                letterSpacing: "-0.2px",
                boxShadow: loading ? "none" : "0 4px 20px rgba(45,190,96,0.25)",
                transition: "all 0.2s",
              }}
            >
              {loading
                ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #94A3B8", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                    Connexion…
                  </span>
                : `Accès Admin ${mode === "sandbox" ? "(Sandbox)" : ""} →`
              }
            </button>
          </form>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 20, display: "flex", justifyContent: "center", gap: 20 }}>
          <a href="/" style={{ color: "#94A3B8", fontSize: 13, textDecoration: "none" }}>← Retour</a>
          <span style={{ color: "#CBD5E1" }}>·</span>
          <a href="mailto:info@zenipay.ca" style={{ color: "#94A3B8", fontSize: 13, textDecoration: "none" }}>Support</a>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
