"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const ZP_GRAD = "linear-gradient(135deg, #2DBE60 0%, #15B8C9 45%, #7B4FBF 100%)";
const DARK = "#0A0F1E";
const GLASS = "rgba(255,255,255,0.05)";
const GLASS_B = "rgba(255,255,255,0.1)";

// Sandbox demo credentials
const SANDBOX_CREDS = {
  admin: { email: "admin@zenipay.ca", password: "admin2026", role: "admin" },
  client: { email: "client@zenipay.ca", password: "client2026", role: "client" },
};

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"sandbox" | "live">("sandbox");
  const [role, setRole] = useState<"admin" | "client">("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Sandbox mode: use demo credentials
    if (mode === "sandbox") {
      const cred = SANDBOX_CREDS[role];
      if (email === cred.email && password === cred.password) {
        setTimeout(() => {
          router.push(`/dashboard?mode=sandbox&role=${role}`);
        }, 800);
      } else {
        setLoading(false);
        setError(
          role === "admin"
            ? `Sandbox admin: admin@zenipay.ca / admin2026`
            : `Sandbox client: client@zenipay.ca / client2026`
        );
      }
      return;
    }

    // Live mode: call API
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/dashboard?mode=live&role=${role}`);
      } else {
        setError(data.error || "Invalid credentials");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fillSandbox = () => {
    const cred = SANDBOX_CREDS[role];
    setEmail(cred.email);
    setPassword(cred.password);
  };

  return (
    <div style={{
      minHeight: "100vh", background: DARK, display: "flex", alignItems: "center",
      justifyContent: "center", padding: "24px",
      backgroundImage: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(45,190,96,0.1) 0%, transparent 70%)",
    }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: ZP_GRAD, display: "inline-flex", alignItems: "center",
            justifyContent: "center", fontSize: 28, fontWeight: 900, color: "#fff", marginBottom: 16,
          }}>Z</div>
          <div style={{ fontSize: 26, fontWeight: 900, background: ZP_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            ZeniPay
          </div>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, margin: "8px 0 0" }}>
            Payment infrastructure dashboard
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 24, padding: "32px 32px",
          backdropFilter: "blur(20px)",
        }}>
          {/* Live / Sandbox toggle */}
          <div style={{
            display: "flex", background: "rgba(255,255,255,0.06)",
            borderRadius: 12, padding: 4, marginBottom: 28, gap: 4,
          }}>
            {(["sandbox", "live"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, padding: "8px 0", borderRadius: 8,
                border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
                background: mode === m
                  ? m === "live" ? ZP_GRAD : "rgba(245,166,35,0.2)"
                  : "transparent",
                color: mode === m
                  ? m === "live" ? "#fff" : "#F5A623"
                  : "rgba(255,255,255,0.4)",
                transition: "all 0.2s",
                letterSpacing: "0.05em",
              }}>
                {m === "sandbox" ? "🧪 Sandbox" : "🔴 Live"}
              </button>
            ))}
          </div>

          {/* Admin / Client toggle */}
          <div style={{
            display: "flex", background: "rgba(255,255,255,0.06)",
            borderRadius: 12, padding: 4, marginBottom: 28, gap: 4,
          }}>
            {(["admin", "client"] as const).map((r) => (
              <button key={r} onClick={() => setRole(r)} style={{
                flex: 1, padding: "8px 0", borderRadius: 8,
                border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
                background: role === r ? ZP_GRAD : "transparent",
                color: role === r ? "#fff" : "rgba(255,255,255,0.4)",
                transition: "all 0.2s",
              }}>
                {r === "admin" ? "⚙️ Admin" : "👤 Client"}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 600, display: "block", marginBottom: 8 }}>
                EMAIL
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com" required
                style={{
                  width: "100%", padding: "12px 16px", borderRadius: 12,
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                  color: "#fff", fontSize: 15, outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 600, display: "block", marginBottom: 8 }}>
                PASSWORD
              </label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required
                style={{
                  width: "100%", padding: "12px 16px", borderRadius: 12,
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                  color: "#fff", fontSize: 15, outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            {error && (
              <div style={{
                marginBottom: 16, padding: "10px 14px", borderRadius: 10,
                background: "rgba(245,166,35,0.1)", border: "1px solid rgba(245,166,35,0.3)",
                color: "#F5A623", fontSize: 13,
              }}>{error}</div>
            )}

            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "14px", marginTop: 16, borderRadius: 12,
              background: loading ? "rgba(255,255,255,0.1)" : ZP_GRAD,
              color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
              transition: "opacity 0.2s",
            }}>
              {loading ? "Logging in…" : `Sign in as ${role}`}
            </button>
          </form>

          {/* Sandbox helper */}
          {mode === "sandbox" && (
            <div style={{
              marginTop: 20, padding: "12px 16px", borderRadius: 12,
              background: "rgba(245,166,35,0.06)", border: "1px solid rgba(245,166,35,0.2)",
              fontSize: 13,
            }}>
              <div style={{ color: "#F5A623", fontWeight: 700, marginBottom: 6 }}>🧪 Sandbox credentials</div>
              <div style={{ color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
                Admin: <code style={{ color: "#fff" }}>admin@zenipay.ca</code> / <code style={{ color: "#fff" }}>admin2026</code><br />
                Client: <code style={{ color: "#fff" }}>client@zenipay.ca</code> / <code style={{ color: "#fff" }}>client2026</code>
              </div>
              <button onClick={fillSandbox} style={{
                marginTop: 8, padding: "6px 14px", borderRadius: 8, border: "none",
                background: "rgba(245,166,35,0.2)", color: "#F5A623", fontSize: 12,
                fontWeight: 700, cursor: "pointer",
              }}>
                Auto-fill
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p style={{ textAlign: "center", marginTop: 24, color: "rgba(255,255,255,0.2)", fontSize: 12 }}>
          © 2026 ZeniPay · <a href="/" style={{ color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>Back to home</a>
        </p>
      </div>
    </div>
  );
}
