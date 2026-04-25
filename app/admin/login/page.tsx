// /admin/login — real login that calls /api/zenipay/login (same
// backend as the merchant /login), then verifies the email is on
// the admin allowlist before routing to /admin/overview. Anyone
// who passes the email check but isn't an admin gets routed to the
// regular /app/overview, so this page is also a safe entry point
// for any merchant who guesses the URL.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import zp from "@/lib/design-system/zenipay-brand";

const ADMIN_ALLOWLIST = new Set([
  "info@zeniva.ca",
  "alexandreblais26@gmail.com",
]);

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const lookupEmail = email.trim().toLowerCase();
    try {
      const res = await fetch("/api/zenipay/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: lookupEmail, password: pw }),
      });
      const data = await res.json().catch(() => ({} as { success?: boolean; merchant?: { id: string; email?: string; businessName?: string; sandboxKey?: string }; error?: string }));

      if (!data.success || !data.merchant) {
        setErr(data.error ?? "Invalid credentials");
        setLoading(false);
        return;
      }

      const m = data.merchant;
      sessionStorage.setItem("zp_client", m.id);
      sessionStorage.setItem("zp_client_email", m.email || lookupEmail);
      sessionStorage.setItem("zp_client_mode", "live");
      sessionStorage.setItem("zp_client_sandbox_key", m.sandboxKey || "");
      sessionStorage.setItem("zp_client_bname", m.businessName || "My Business");
      try { window.localStorage.setItem("zenipay_last_mode", "merchant"); } catch { /* ignore */ }

      const finalEmail = (m.email || lookupEmail).toLowerCase();
      if (ADMIN_ALLOWLIST.has(finalEmail)) {
        router.replace("/admin/overview");
      } else {
        // Authenticated but not an admin — drop them on the regular
        // dashboard rather than blocking the login.
        router.replace("/app/overview");
      }
    } catch {
      setErr("Connection error. Try again.");
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(150deg, #F0FDF4 0%, #EEF4FF 50%, #F5F0FF 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, fontFamily: zp.font.sans,
    }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, borderRadius: zp.radius.lg, background: "#fff",
            boxShadow: "0 8px 32px rgba(45,190,96,0.18)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            border: `1px solid ${zp.brand.green}33`, marginBottom: 14,
          }}>
            <ShieldCheck size={28} color={zp.brand.green} />
          </div>
          <div style={{
            fontFamily: zp.font.display, fontSize: 28, fontWeight: zp.weight.semibold,
            color: zp.text.primary, letterSpacing: "-0.02em",
          }}>
            ZeniPay Admin
          </div>
          <div style={{ color: zp.text.muted, fontSize: 13, marginTop: 4 }}>
            Restricted access · email allowlist
          </div>
        </div>

        <form onSubmit={submit} style={{
          background: "#fff", borderRadius: zp.radius.lg,
          padding: "26px 26px 22px",
          boxShadow: "0 4px 48px rgba(0,0,0,0.08)",
          border: `1px solid ${zp.surface.border}`,
        }}>
          <Field label="Email">
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="info@zeniva.ca"
              style={inputStyle}
            />
          </Field>

          <Field label="Password">
            <div style={{ position: "relative" }}>
              <input
                type={showPw ? "text" : "password"}
                required
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                style={{ ...inputStyle, paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Hide password" : "Show password"}
                style={{
                  position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                  background: "transparent", border: "none", cursor: "pointer",
                  color: zp.text.muted, padding: 4,
                }}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>

          {err && (
            <div style={{
              marginTop: 10, padding: "8px 10px", borderRadius: zp.radius.sm,
              background: zp.semantic.dangerBg, color: zp.semantic.danger,
              fontSize: 12, fontWeight: zp.weight.semibold,
            }}>{err}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 16, width: "100%",
              padding: "12px 18px", borderRadius: zp.radius.sm,
              background: `linear-gradient(135deg, ${zp.brand.green} 0%, ${zp.brand.cyan} 100%)`,
              color: "#fff", border: "none", cursor: loading ? "wait" : "pointer",
              fontSize: 14, fontWeight: zp.weight.semibold,
              boxShadow: "0 4px 14px rgba(16,185,129,0.32)",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Signing in…" : "Sign in to admin"}
          </button>

          <div style={{ marginTop: 14, textAlign: "center" as const, fontSize: 12, color: zp.text.muted }}>
            Not an admin? <Link href="/login" style={{ color: zp.brand.cyan, fontWeight: zp.weight.semibold, textDecoration: "none" }}>Regular sign in →</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{
        display: "block", fontSize: 11, fontWeight: zp.weight.semibold,
        color: zp.text.muted, letterSpacing: "0.08em",
        textTransform: "uppercase" as const, marginBottom: 6,
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 8,
  border: `1px solid ${zp.surface.border}`,
  background: "#fff",
  color: zp.text.primary,
  fontSize: 14,
  boxSizing: "border-box",
  outline: "none",
};
