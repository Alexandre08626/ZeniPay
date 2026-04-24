// /register — 3-step signup.
//   Step 1: account + business name + country
//   Step 2: legal business info + address
//   Step 3: owner info + terms
//
// Submits to POST /api/auth/register which creates a Supabase Auth
// user, a zenipay_merchants row (status='pending_kyb'), a primary
// business account, and an agents.organizations mapping.

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { MarketingNav, MarketingFooter } from "@/app/components/marketing/MarketingNav";
import zp from "@/lib/design-system/zenipay-brand";

type Country = "CA" | "US";

interface Form {
  email: string;
  password: string;
  confirmPassword: string;
  business_name: string;
  country: Country;

  legal_business_name: string;
  business_type: string;
  ein_bn: string;
  phone: string;
  website: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state_province: string;
  postal_code: string;

  first_name: string;
  last_name: string;
  owner_dob: string;
  owner_ssn_last4: string;
  owner_sin_last3: string;
  terms_accepted: boolean;
}

const EMPTY: Form = {
  email: "", password: "", confirmPassword: "",
  business_name: "", country: "CA",
  legal_business_name: "", business_type: "Corporation", ein_bn: "", phone: "", website: "",
  address_line1: "", address_line2: "", city: "", state_province: "", postal_code: "",
  first_name: "", last_name: "", owner_dob: "",
  owner_ssn_last4: "", owner_sin_last3: "",
  terms_accepted: false,
};

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const update = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const pwStrength = useMemo(() => scorePassword(form.password), [form.password]);
  const pwMatch = form.password && form.password === form.confirmPassword;

  const canAdvance1 =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) &&
    pwStrength >= 3 &&
    !!pwMatch &&
    form.business_name.trim().length >= 2;

  const canAdvance2 =
    form.legal_business_name.trim().length >= 2 &&
    form.ein_bn.trim().length >= 4 &&
    form.address_line1.trim().length >= 2 &&
    form.city.trim().length >= 2 &&
    form.postal_code.trim().length >= 3;

  const canSubmit =
    form.first_name.trim().length >= 1 &&
    form.last_name.trim().length >= 1 &&
    form.owner_dob.length > 0 &&
    (form.country === "CA" ? form.owner_sin_last3.length === 3 : form.owner_ssn_last4.length === 4) &&
    form.terms_accepted;

  const submit = async () => {
    setErr(null);
    if (!canSubmit) { setErr("Fill every required field and accept the terms."); return; }
    setLoading(true);
    try {
      const r = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email:              form.email.trim().toLowerCase(),
          password:           form.password,
          business_name:      form.business_name.trim(),
          legal_business_name: form.legal_business_name.trim(),
          business_type:      form.business_type,
          ein_bn:             form.ein_bn.trim(),
          phone:              form.phone.trim(),
          website:            form.website.trim(),
          address_line1:      form.address_line1.trim(),
          address_line2:      form.address_line2.trim(),
          city:               form.city.trim(),
          state_province:     form.state_province.trim(),
          postal_code:        form.postal_code.trim(),
          country:            form.country,
          owner_name:         `${form.first_name.trim()} ${form.last_name.trim()}`,
          owner_dob:          form.owner_dob,
          owner_ssn_last4:    form.country === "US" ? form.owner_ssn_last4 : null,
          owner_sin_last3:    form.country === "CA" ? form.owner_sin_last3 : null,
          terms_accepted:     form.terms_accepted,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || data?.error) {
        setErr(data?.error?.message ?? data?.error ?? "Registration failed.");
        return;
      }
      if (typeof window !== "undefined") {
        sessionStorage.setItem("zp_client", data.merchant_id);
        sessionStorage.setItem("zp_client_email", form.email.trim().toLowerCase());
        sessionStorage.setItem("zp_client_bname", form.business_name.trim());
        sessionStorage.setItem("zp_client_first_name", form.first_name.trim());
      }
      router.replace(data.redirect ?? "/app/overview");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const einLabel = form.country === "US" ? "EIN" : "Business Number (BN)";

  return (
    <div style={{ background: zp.surface.bg1, minHeight: "100vh" }}>
      <MarketingNav />

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "64px 24px" }}>
        <ProgressBar step={step} />

        <h1 style={{
          margin: "36px 0 6px", fontFamily: zp.font.display,
          fontSize: 32, fontWeight: zp.weight.semibold, letterSpacing: "-0.02em",
          color: zp.text.primary,
        }}>
          {step === 1 ? "Create your account" : step === 2 ? "About your business" : "Owner information"}
        </h1>
        <p style={{ margin: "0 0 28px", fontSize: 14, color: zp.text.muted }}>
          {step === 1 ? "You can change most of these later."
           : step === 2 ? "We use this to open your ZeniPay account and to verify your business (KYB)."
           : "The last step. We verify identity to keep the platform safe."}
        </p>

        {err && (
          <div style={{
            marginBottom: 18, padding: "12px 14px", borderRadius: 12,
            background: zp.semantic.dangerBg, color: zp.semantic.danger,
            fontSize: 13, fontWeight: zp.weight.semibold,
          }}>{err}</div>
        )}

        {step === 1 && (
          <StepCard>
            <Field label="Business email">
              <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} autoFocus style={inputStyle} />
            </Field>
            <Field label="Password" hint="8+ characters, 1 uppercase, 1 digit.">
              <input type="password" value={form.password} onChange={(e) => update("password", e.target.value)} style={inputStyle} />
              <PasswordStrength score={pwStrength} />
            </Field>
            <Field label="Confirm password">
              <input type="password" value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} style={inputStyle} />
              {form.confirmPassword && !pwMatch && (
                <div style={{ fontSize: 11, color: zp.semantic.danger, marginTop: 4, fontWeight: zp.weight.semibold }}>Passwords don’t match.</div>
              )}
            </Field>
            <Field label="Business name">
              <input value={form.business_name} onChange={(e) => update("business_name", e.target.value)} placeholder="Zeniva Inc." style={inputStyle} />
            </Field>
            <Field label="Country">
              <select value={form.country} onChange={(e) => update("country", e.target.value as Country)} style={inputStyle}>
                <option value="CA">Canada</option>
                <option value="US">United States</option>
              </select>
            </Field>
          </StepCard>
        )}

        {step === 2 && (
          <StepCard>
            <Field label="Legal business name">
              <input value={form.legal_business_name} onChange={(e) => update("legal_business_name", e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Business type">
              <select value={form.business_type} onChange={(e) => update("business_type", e.target.value)} style={inputStyle}>
                <option>Corporation</option>
                <option>LLC</option>
                <option>Sole Proprietorship</option>
                <option>Partnership</option>
                <option>Other</option>
              </select>
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label={einLabel}>
                <input value={form.ein_bn} onChange={(e) => update("ein_bn", e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Phone">
                <input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+1 (514) 555-0100" style={inputStyle} />
              </Field>
            </div>
            <Field label="Website (optional)">
              <input value={form.website} onChange={(e) => update("website", e.target.value)} placeholder="https://yoursite.com" style={inputStyle} />
            </Field>
            <Field label="Address line 1">
              <input value={form.address_line1} onChange={(e) => update("address_line1", e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Address line 2 (optional)">
              <input value={form.address_line2} onChange={(e) => update("address_line2", e.target.value)} style={inputStyle} />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
              <Field label="City">
                <input value={form.city} onChange={(e) => update("city", e.target.value)} style={inputStyle} />
              </Field>
              <Field label={form.country === "CA" ? "Province" : "State"}>
                <input value={form.state_province} onChange={(e) => update("state_province", e.target.value)} style={inputStyle} />
              </Field>
              <Field label={form.country === "CA" ? "Postal" : "ZIP"}>
                <input value={form.postal_code} onChange={(e) => update("postal_code", e.target.value)} style={inputStyle} />
              </Field>
            </div>
          </StepCard>
        )}

        {step === 3 && (
          <StepCard>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="First name">
                <input value={form.first_name} onChange={(e) => update("first_name", e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Last name">
                <input value={form.last_name} onChange={(e) => update("last_name", e.target.value)} style={inputStyle} />
              </Field>
            </div>
            <Field label="Date of birth">
              <input type="date" value={form.owner_dob} onChange={(e) => update("owner_dob", e.target.value)} style={inputStyle} />
            </Field>
            {form.country === "US" ? (
              <Field label="SSN — last 4 digits" hint="We only store the last 4 digits.">
                <input
                  inputMode="numeric" maxLength={4}
                  value={form.owner_ssn_last4}
                  onChange={(e) => update("owner_ssn_last4", e.target.value.replace(/\D/g, "").slice(0, 4))}
                  style={inputStyle}
                />
              </Field>
            ) : (
              <Field label="SIN — last 3 digits" hint="We only store the last 3 digits.">
                <input
                  inputMode="numeric" maxLength={3}
                  value={form.owner_sin_last3}
                  onChange={(e) => update("owner_sin_last3", e.target.value.replace(/\D/g, "").slice(0, 3))}
                  style={inputStyle}
                />
              </Field>
            )}
            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 0", fontSize: 13, color: zp.text.primary }}>
              <input type="checkbox" checked={form.terms_accepted} onChange={(e) => update("terms_accepted", e.target.checked)} style={{ marginTop: 3 }} />
              <span>
                I agree to ZeniPay’s{" "}
                <Link href="/terms" style={{ color: zp.brand.cyan, fontWeight: zp.weight.semibold }}>Terms of Service</Link>
                {" "}and{" "}
                <Link href="/privacy" style={{ color: zp.brand.cyan, fontWeight: zp.weight.semibold }}>Privacy Policy</Link>.
              </span>
            </label>
          </StepCard>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, gap: 12, flexWrap: "wrap" }}>
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(((step as number) - 1) as 1 | 2)}
              style={{
                background: "transparent", border: "none",
                color: zp.text.muted, fontSize: 13, fontWeight: zp.weight.semibold, cursor: "pointer",
                padding: "10px 0",
              }}
            >← Back</button>
          ) : <span />}
          {step < 3 ? (
            <button
              type="button"
              onClick={() => { if ((step === 1 && canAdvance1) || (step === 2 && canAdvance2)) setStep((step + 1) as 2 | 3); }}
              disabled={(step === 1 && !canAdvance1) || (step === 2 && !canAdvance2)}
              style={{
                ...gradientBtn,
                opacity: (step === 1 && !canAdvance1) || (step === 2 && !canAdvance2) ? 0.55 : 1,
                cursor: (step === 1 && !canAdvance1) || (step === 2 && !canAdvance2) ? "not-allowed" : "pointer",
              }}
            >Continue →</button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={loading || !canSubmit}
              style={{
                ...gradientBtn,
                opacity: loading || !canSubmit ? 0.55 : 1,
                cursor: loading || !canSubmit ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Creating your account…" : "Create account →"}
            </button>
          )}
        </div>

        <p style={{ marginTop: 28, fontSize: 12, color: zp.text.muted, textAlign: "center" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: zp.brand.cyan, fontWeight: zp.weight.semibold }}>Sign in</Link>
        </p>
      </main>

      <MarketingFooter />
    </div>
  );
}

function ProgressBar({ step }: { step: 1 | 2 | 3 }) {
  const pct = step === 1 ? 33 : step === 2 ? 66 : 100;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: zp.weight.bold, color: zp.text.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Step {step} of 3
        </span>
        <span style={{ fontSize: 11, fontWeight: zp.weight.bold, color: zp.brand.violet, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          {pct}% complete
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: zp.surface.bg2, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: zp.gradient.main, borderRadius: 999,
          transition: "width 0.4s cubic-bezier(.4,0,.2,1)",
        }} />
      </div>
    </div>
  );
}

function StepCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: "#fff", border: `1px solid ${zp.surface.border}`,
      borderRadius: 14, padding: 28,
    }}>
      {children}
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        display: "block", fontSize: 10, fontWeight: zp.weight.semibold, color: zp.text.muted,
        letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6,
      }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: zp.text.muted, marginTop: 5 }}>{hint}</div>}
    </div>
  );
}

function PasswordStrength({ score }: { score: number }) {
  const pct = Math.min(100, (score / 4) * 100);
  const color = score <= 1 ? "#DC2626" : score === 2 ? "#D97706" : score === 3 ? "#16A34A" : zp.brand.violet;
  const label = score === 0 ? "Too short" : score === 1 ? "Weak" : score === 2 ? "Fair" : score === 3 ? "Strong" : "Excellent";
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ height: 4, borderRadius: 999, background: zp.surface.bg3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, transition: "width 0.2s" }} />
      </div>
      <div style={{ fontSize: 11, color, marginTop: 4, fontWeight: zp.weight.semibold }}>{label}</div>
    </div>
  );
}

function scorePassword(pw: string): number {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: zp.radius.sm,
  border: `1px solid ${zp.surface.border}`, background: zp.surface.bg2,
  color: zp.text.primary, fontSize: 14, boxSizing: "border-box", outline: "none", fontFamily: zp.font.sans,
};

const gradientBtn: React.CSSProperties = {
  background: zp.gradient.main, color: "#fff", border: "none",
  padding: "12px 22px", borderRadius: 12,
  fontSize: 14, fontWeight: zp.weight.semibold, cursor: "pointer",
  boxShadow: "0 8px 20px rgba(15,184,201,0.28)",
};
