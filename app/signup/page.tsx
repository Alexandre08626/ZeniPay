"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

const ZP_GRAD = "linear-gradient(90deg, #2DBE60 0%, #15B8C9 45%, #7B4FBF 100%)";
const ZP_GREEN = "#2DBE60";
const ZP_CYAN = "#15B8C9";

function genKey(prefix: string) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < 24; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}_${s}`;
}

const BUSINESS_TYPES = ["E-commerce", "SaaS / Software", "Travel Agency", "Marketplace", "Gig Platform", "Fintech", "Healthcare", "Real Estate", "Other"];

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "12px 14px", borderRadius: 12,
  background: "#F8FAFC", border: "1.5px solid #E2E8F0",
  color: "#0D1B3A", fontSize: 14, outline: "none",
  boxSizing: "border-box", fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  fontSize: 11, color: "#64748B", fontWeight: 700,
  display: "block", marginBottom: 7, letterSpacing: "0.06em",
};

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [country, setCountry] = useState("United States");
  const [monthlyVolume, setMonthlyVolume] = useState("");

  // Step 2
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwError, setPwError] = useState("");

  // Step 3 (result)
  const [sandboxKey, setSandboxKey] = useState("");
  const [sandboxSecret, setSandboxSecret] = useState("");

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    if (password.length < 8) return setPwError("Password must be at least 8 characters.");
    if (password !== confirm) return setPwError("Passwords do not match.");

    setLoading(true);

    const sbKey = genKey("zpk_sb");
    const sbSecret = genKey("zps_sb");
    const liveKey = genKey("zpk_live");

    const account = {
      id: `acc_${Date.now()}`,
      businessName,
      ownerName,
      email,
      phone,
      website,
      businessType,
      country,
      monthlyVolume,
      status: "sandbox",
      plan: "Standard",
      sandboxKey: sbKey,
      sandboxSecret: sbSecret,
      liveKey,
    };

    // Save to Supabase via API (visible from all devices)
    try {
      await fetch("/api/zenipay/merchants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(account),
      });
    } catch (err) {
      console.error("[Signup] Failed to save merchant:", err);
    }

    // Auto-login to sandbox for current session
    try {
      sessionStorage.setItem("zp_client", businessName);
      sessionStorage.setItem("zp_client_mode", "sandbox");
      sessionStorage.setItem("zp_client_email", email);
      sessionStorage.setItem("zp_client_sandbox_key", sbKey);
    } catch {}

    setSandboxKey(sbKey);
    setSandboxSecret(sbSecret);

    setLoading(false);
    setStep(3);
  };

  const goToDashboard = () => router.push("/app");

  const steps = [
    { num: 1, label: "Your business" },
    { num: 2, label: "Secure account" },
    { num: 3, label: "Sandbox access" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(150deg, #F0FDF4 0%, #EEF4FF 40%, #FFF7ED 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", backgroundImage: "radial-gradient(circle, rgba(21,184,201,0.05) 1px, transparent 1px)", backgroundSize: "36px 36px" }} />

      <div style={{ width: "100%", maxWidth: 480, position: "relative" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Link href="/" style={{ display: "inline-block" }}>
            <Image src="/zenipay-logo.png" alt="ZeniPay" width={240} height={68} style={{ objectFit: "contain" }} />
          </Link>
        </div>

        {/* Stepper */}
        {step < 3 && (
          <div style={{ display: "flex", alignItems: "center", marginBottom: 28, gap: 0 }}>
            {steps.map((s, i) => (
              <div key={s.num} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 800,
                    background: step >= s.num ? ZP_GRAD : "#E2E8F0",
                    color: step >= s.num ? "#fff" : "#94A3B8",
                  }}>{s.num}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: step >= s.num ? "#0D1B3A" : "#94A3B8", whiteSpace: "nowrap" }}>{s.label}</div>
                </div>
                {i < steps.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: step > s.num ? ZP_GREEN : "#E2E8F0", margin: "0 8px", marginBottom: 18 }} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Card */}
        <div style={{ background: "#fff", borderRadius: 24, padding: "32px 32px 28px", boxShadow: "0 4px 48px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.06)" }}>

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <form onSubmit={handleStep1}>
              <h2 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 6px", color: "#0D1B3A", letterSpacing: "-0.5px" }}>Create your account</h2>
              <p style={{ fontSize: 13, color: "#64748B", margin: "0 0 24px" }}>Get instant access to the ZeniPay sandbox — no credit card required.</p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>BUSINESS NAME</label>
                  <input value={businessName} onChange={e => setBusinessName(e.target.value)} required placeholder="Acme Corp" style={inputStyle}
                    onFocus={e => e.currentTarget.style.borderColor = ZP_CYAN} onBlur={e => e.currentTarget.style.borderColor = "#E2E8F0"} />
                </div>
                <div>
                  <label style={labelStyle}>OWNER / CONTACT NAME</label>
                  <input value={ownerName} onChange={e => setOwnerName(e.target.value)} required placeholder="Jane Smith" style={inputStyle}
                    onFocus={e => e.currentTarget.style.borderColor = ZP_CYAN} onBlur={e => e.currentTarget.style.borderColor = "#E2E8F0"} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>BUSINESS EMAIL</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@company.com" style={inputStyle}
                    onFocus={e => e.currentTarget.style.borderColor = ZP_CYAN} onBlur={e => e.currentTarget.style.borderColor = "#E2E8F0"} />
                </div>
                <div>
                  <label style={labelStyle}>PHONE (optional)</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" style={inputStyle}
                    onFocus={e => e.currentTarget.style.borderColor = ZP_CYAN} onBlur={e => e.currentTarget.style.borderColor = "#E2E8F0"} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>WEBSITE (optional)</label>
                  <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yoursite.com" style={inputStyle}
                    onFocus={e => e.currentTarget.style.borderColor = ZP_CYAN} onBlur={e => e.currentTarget.style.borderColor = "#E2E8F0"} />
                </div>
                <div>
                  <label style={labelStyle}>COUNTRY</label>
                  <select value={country} onChange={e => setCountry(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                    {["United States", "Canada", "United Kingdom", "France", "Germany", "Australia", "Other"].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
                <div>
                  <label style={labelStyle}>BUSINESS TYPE</label>
                  <select value={businessType} onChange={e => setBusinessType(e.target.value)} required style={{ ...inputStyle, cursor: "pointer" }}>
                    <option value="">Select type…</option>
                    {BUSINESS_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>EST. MONTHLY VOLUME</label>
                  <select value={monthlyVolume} onChange={e => setMonthlyVolume(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                    <option value="">Select range…</option>
                    {["Under $5K", "$5K – $25K", "$25K – $100K", "$100K – $500K", "$500K+"].map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
              </div>

              <button type="submit" style={{ width: "100%", padding: 14, borderRadius: 12, background: ZP_GRAD, color: "#fff", border: "none", fontSize: 15, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 20px rgba(21,184,201,0.25)" }}>
                Continue →
              </button>

              <p style={{ textAlign: "center", fontSize: 12, color: "#94A3B8", marginTop: 16, marginBottom: 0 }}>
                Already have an account?{" "}<Link href="/login" style={{ color: ZP_CYAN, fontWeight: 700, textDecoration: "none" }}>Sign in</Link>
              </p>
            </form>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <form onSubmit={handleStep2}>
              <h2 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 6px", color: "#0D1B3A", letterSpacing: "-0.5px" }}>Secure your account</h2>
              <p style={{ fontSize: 13, color: "#64748B", margin: "0 0 24px" }}>Create a strong password for <strong>{email}</strong></p>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>PASSWORD</label>
                <div style={{ position: "relative" }}>
                  <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min. 8 characters"
                    style={{ ...inputStyle, paddingRight: 44 }}
                    onFocus={e => e.currentTarget.style.borderColor = ZP_CYAN} onBlur={e => e.currentTarget.style.borderColor = "#E2E8F0"} />
                  <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94A3B8", fontSize: 16, padding: 4 }}>
                    {showPw ? "🙈" : "👁"}
                  </button>
                </div>
                {/* Strength bar */}
                {password && (
                  <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: password.length >= i * 3 ? (password.length >= 12 ? ZP_GREEN : ZP_CYAN) : "#E2E8F0" }} />
                    ))}
                    <span style={{ fontSize: 11, color: "#94A3B8", whiteSpace: "nowrap", marginLeft: 8 }}>
                      {password.length < 6 ? "Weak" : password.length < 10 ? "Fair" : password.length < 14 ? "Good" : "Strong"}
                    </span>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>CONFIRM PASSWORD</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="Repeat password"
                  style={{ ...inputStyle, borderColor: confirm && confirm !== password ? "#EF4444" : "#E2E8F0" }}
                  onFocus={e => e.currentTarget.style.borderColor = ZP_CYAN} onBlur={e => e.currentTarget.style.borderColor = confirm && confirm !== password ? "#EF4444" : "#E2E8F0"} />
              </div>

              {pwError && (
                <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", color: "#DC2626", fontSize: 13 }}>
                  {pwError}
                </div>
              )}

              {/* ToS */}
              <p style={{ fontSize: 12, color: "#94A3B8", marginBottom: 20 }}>
                By creating an account you agree to ZeniPay&apos;s{" "}
                <Link href="/" style={{ color: ZP_CYAN, textDecoration: "none" }}>Terms of Service</Link> and{" "}
                <Link href="/" style={{ color: ZP_CYAN, textDecoration: "none" }}>Privacy Policy</Link>.
              </p>

              <button type="submit" disabled={loading} style={{ width: "100%", padding: 14, borderRadius: 12, background: loading ? "#E2E8F0" : ZP_GRAD, color: loading ? "#94A3B8" : "#fff", border: "none", fontSize: 15, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer", boxShadow: loading ? "none" : "0 4px 20px rgba(21,184,201,0.25)" }}>
                {loading
                  ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #94A3B8", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                      Creating your account…
                    </span>
                  : "Create account & get sandbox access →"}
              </button>

              <button type="button" onClick={() => setStep(1)} style={{ width: "100%", marginTop: 10, padding: "10px", background: "none", border: "none", color: "#94A3B8", fontSize: 13, cursor: "pointer" }}>
                ← Back
              </button>
            </form>
          )}

          {/* ── STEP 3 — SUCCESS ── */}
          {step === 3 && (
            <div>
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
                <h2 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 6px", color: "#0D1B3A" }}>Sandbox is ready!</h2>
                <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>Welcome, <strong>{businessName}</strong>. Your sandbox credentials are below.</p>
              </div>

              {/* Sandbox keys */}
              <div style={{ background: "#F8FAFC", border: "1.5px solid #E2E8F0", borderRadius: 14, padding: "18px 20px", marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.08em", marginBottom: 12 }}>SANDBOX API KEYS</div>
                {[
                  { label: "Publishable Key", value: sandboxKey, hint: "Use in your frontend" },
                  { label: "Secret Key", value: sandboxSecret, hint: "Use server-side only — keep it secret!" },
                ].map(k => (
                  <div key={k.label} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B", marginBottom: 4 }}>{k.label} <span style={{ color: "#94A3B8", fontWeight: 400 }}>— {k.hint}</span></div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, padding: "8px 12px" }}>
                      <code style={{ flex: 1, fontSize: 12, color: "#0D1B3A", wordBreak: "break-all" }}>{k.value}</code>
                      <button onClick={() => navigator.clipboard?.writeText(k.value)} style={{ background: "none", border: "none", cursor: "pointer", color: ZP_CYAN, fontSize: 16, padding: 2, flexShrink: 0 }}>📋</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Checklist */}
              <div style={{ marginBottom: 24 }}>
                {[
                  { done: true, text: "Sandbox account created" },
                  { done: true, text: "API keys generated" },
                  { done: false, text: "Make your first test payment (use card 4242 4242 4242 4242)" },
                  { done: false, text: "Apply for live access when ready" },
                ].map(item => (
                  <div key={item.text} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid #F1F5F9" }}>
                    <span style={{ fontSize: 16 }}>{item.done ? "✅" : "⬜"}</span>
                    <span style={{ fontSize: 13, color: item.done ? "#0D1B3A" : "#64748B" }}>{item.text}</span>
                  </div>
                ))}
              </div>

              <button onClick={goToDashboard} style={{ width: "100%", padding: 14, borderRadius: 12, background: ZP_GRAD, color: "#fff", border: "none", fontSize: 15, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 20px rgba(21,184,201,0.25)" }}>
                Go to sandbox dashboard →
              </button>

              <p style={{ textAlign: "center", fontSize: 12, color: "#94A3B8", marginTop: 12, marginBottom: 0 }}>
                Need help?{" "}<a href="mailto:info@zenipay.ca" style={{ color: ZP_CYAN, fontWeight: 700, textDecoration: "none" }}>Contact support</a>
              </p>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
