// /register — banking-grade signup. Two flavours selected by ?type=:
//
//   default       → 3-step BUSINESS flow:
//                     1. account      (email/pw/biz name/country/18+)
//                     2. KYB          (legal name/EIN-BN/address/industry/volume)
//                     3. owner verify (name/DOB/SIN-SSN tail + consent + terms)
//                   → POST /api/auth/register, redirects to /app/overview
//
//   ?type=personal → 2-step PERSONAL flow:
//                     1. account  (email/pw/first+last name/country/18+)
//                     2. identity (DOB/phone/address/SIN-SSN tail + consent + terms)
//                   → POST /api/auth/register/personal, redirects to /personal/overview
//
// Both endpoints create a Supabase Auth user and a merchant row
// (status='pending_kyb' for business, 'personal_only' for personal),
// then post the Supabase session cookies so the user lands signed in.

"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { MarketingNav, MarketingFooter } from "@/app/components/marketing/MarketingNav";
import zp from "@/lib/design-system/zenipay-brand";

type Country = "CA" | "US";
type BusinessType = "corporation" | "llc" | "sole_proprietorship" | "partnership" | "non_profit";
type Industry = "technology" | "ecommerce" | "travel" | "real_estate" | "healthcare" | "legal" | "finance" | "other";
type Volume = "under_10k" | "10k_50k" | "50k_250k" | "over_250k";

interface Form {
  email: string;
  email_confirm: string;
  password: string;
  password_confirm: string;
  business_name: string;
  country: Country;
  age_confirmed: boolean;

  legal_business_name: string;
  business_type: BusinessType;
  ein_bn: string;
  phone: string;
  website: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state_province: string;
  postal_code: string;
  industry: Industry;
  monthly_volume: Volume;

  first_name: string;
  last_name: string;
  owner_dob: string;
  owner_ssn_last4: string;
  owner_sin_last3: string;
  identity_consent: boolean;
  terms_accepted: boolean;
}

const EMPTY: Form = {
  email: "", email_confirm: "",
  password: "", password_confirm: "",
  business_name: "", country: "CA", age_confirmed: false,
  legal_business_name: "", business_type: "corporation", ein_bn: "",
  phone: "", website: "",
  address_line1: "", address_line2: "", city: "", state_province: "", postal_code: "",
  industry: "technology", monthly_volume: "under_10k",
  first_name: "", last_name: "", owner_dob: "",
  owner_ssn_last4: "", owner_sin_last3: "",
  identity_consent: false, terms_accepted: false,
};

const BUSINESS_TYPES: Array<{ value: BusinessType; label: string }> = [
  { value: "corporation",         label: "Corporation" },
  { value: "llc",                 label: "LLC" },
  { value: "sole_proprietorship", label: "Sole Proprietorship" },
  { value: "partnership",         label: "Partnership" },
  { value: "non_profit",          label: "Non-profit" },
];

const INDUSTRIES: Array<{ value: Industry; label: string }> = [
  { value: "technology",  label: "Technology" },
  { value: "ecommerce",   label: "E-commerce" },
  { value: "travel",      label: "Travel" },
  { value: "real_estate", label: "Real Estate" },
  { value: "healthcare",  label: "Healthcare" },
  { value: "legal",       label: "Legal" },
  { value: "finance",     label: "Finance" },
  { value: "other",       label: "Other" },
];

const VOLUMES: Array<{ value: Volume; label: string }> = [
  { value: "under_10k", label: "Under $10K" },
  { value: "10k_50k",   label: "$10K – $50K" },
  { value: "50k_250k",  label: "$50K – $250K" },
  { value: "over_250k", label: "Over $250K" },
];

export default function RegisterPage() {
  return (
    <Suspense fallback={<div style={{ background: "#FFFFFF", minHeight: "100vh" }} />}>
      <RegisterRouter />
    </Suspense>
  );
}

function RegisterRouter() {
  const params = useSearchParams();
  const isPersonal = params.get("type") === "personal";
  return isPersonal ? <PersonalRegisterFlow /> : <BusinessRegisterFlow />;
}

function BusinessRegisterFlow() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const update = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const pwScore = useMemo(() => scorePassword(form.password), [form.password]);
  const pwMatch = !!form.password && form.password === form.password_confirm;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  const emailMatch = !!form.email && form.email.toLowerCase() === form.email_confirm.toLowerCase();
  const dobAdult = useMemo(() => isAdult(form.owner_dob), [form.owner_dob]);

  const canAdvance1 =
    emailValid && emailMatch && pwScore >= 3 && pwMatch &&
    form.business_name.trim().length >= 2 &&
    form.age_confirmed;

  const canAdvance2 =
    form.legal_business_name.trim().length >= 2 &&
    form.ein_bn.trim().length >= 4 &&
    form.phone.trim().length >= 7 &&
    form.address_line1.trim().length >= 2 &&
    form.city.trim().length >= 2 &&
    form.state_province.trim().length >= 1 &&
    form.postal_code.trim().length >= 3;

  const canSubmit =
    form.first_name.trim().length >= 1 &&
    form.last_name.trim().length >= 1 &&
    !!form.owner_dob && dobAdult &&
    (form.country === "CA" ? form.owner_sin_last3.length === 3 : form.owner_ssn_last4.length === 4) &&
    form.identity_consent && form.terms_accepted;

  const submit = async () => {
    setErr(null);
    if (!canSubmit) { setErr("Please complete every required field and accept the consents."); return; }
    setLoading(true);
    try {
      const r = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email:               form.email.trim().toLowerCase(),
          password:            form.password,
          business_name:       form.business_name.trim(),
          legal_business_name: form.legal_business_name.trim(),
          business_type:       form.business_type,
          ein_bn:              form.ein_bn.trim(),
          phone:               form.phone.trim(),
          website:             form.website.trim() || null,
          address_line1:       form.address_line1.trim(),
          address_line2:       form.address_line2.trim() || null,
          city:                form.city.trim(),
          state_province:      form.state_province.trim(),
          postal_code:         form.postal_code.trim(),
          country:             form.country,
          industry:            form.industry,
          monthly_volume:      form.monthly_volume,
          owner_first_name:    form.first_name.trim(),
          owner_last_name:     form.last_name.trim(),
          owner_dob:           form.owner_dob,
          owner_ssn_last4:     form.country === "US" ? form.owner_ssn_last4 : null,
          owner_sin_last3:     form.country === "CA" ? form.owner_sin_last3 : null,
          identity_consent:    form.identity_consent,
          terms_accepted:      form.terms_accepted,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || data?.error) {
        setErr(prettyError(data));
        return;
      }
      // Session cookies were set server-side. Mirror non-secret fields
      // into sessionStorage so the existing legacy UI still works.
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

  const einLabel = form.country === "US" ? "Employer Identification Number (EIN)" : "Business Number (BN)";
  const provinceLabel = form.country === "CA" ? "Province" : "State";
  const postalLabel = form.country === "CA" ? "Postal code" : "ZIP code";

  return (
    <div style={{ background: "#FFFFFF", minHeight: "100vh", color: zp.text.primary }}>
      <MarketingNav />

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "56px 24px 80px" }}>
        <ProgressBar step={step} />

        <h1 style={{
          margin: "32px 0 6px", fontFamily: zp.font.display,
          fontSize: 30, fontWeight: zp.weight.semibold, letterSpacing: "-0.02em",
          color: zp.text.primary,
        }}>
          {step === 1 ? "Create your account"
           : step === 2 ? "Tell us about your business"
           : "Verify your identity"}
        </h1>
        <p style={{ margin: "0 0 24px", fontSize: 14, color: zp.text.muted, lineHeight: 1.5 }}>
          {step === 1 ? "We'll set up a real ZeniPay business account. You can integrate immediately and start accepting payments once your account is approved."
           : step === 2 ? "Your business information is required to open the account and to comply with banking regulations (KYB)."
           : "As required by financial regulations, we need to verify the identity of the account owner."}
        </p>

        {err && (
          <div role="alert" style={{
            marginBottom: 16, padding: "11px 14px", borderRadius: 10,
            background: "#FEF2F2", color: "#B91C1C", border: "1px solid #FCA5A5",
            fontSize: 13, fontWeight: zp.weight.semibold,
          }}>{err}</div>
        )}

        {step === 1 && (
          <StepCard>
            <Field label="Business email">
              <input type="email" autoComplete="email" autoFocus
                value={form.email} onChange={(e) => update("email", e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Confirm business email">
              <input type="email" autoComplete="email"
                value={form.email_confirm} onChange={(e) => update("email_confirm", e.target.value)} style={inputStyle} />
              {form.email_confirm && !emailMatch && (
                <Hint danger>Emails don&apos;t match.</Hint>
              )}
            </Field>
            <Field label="Password" hint="At least 12 characters, with 1 uppercase, 1 number, and 1 symbol.">
              <input type="password" autoComplete="new-password"
                value={form.password} onChange={(e) => update("password", e.target.value)} style={inputStyle} />
              <PasswordStrength score={pwScore} />
            </Field>
            <Field label="Confirm password">
              <input type="password" autoComplete="new-password"
                value={form.password_confirm} onChange={(e) => update("password_confirm", e.target.value)} style={inputStyle} />
              {form.password_confirm && !pwMatch && (
                <Hint danger>Passwords don&apos;t match.</Hint>
              )}
            </Field>
            <Field label="Business name">
              <input value={form.business_name} placeholder="Acme Inc."
                onChange={(e) => update("business_name", e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Country">
              <select value={form.country} onChange={(e) => update("country", e.target.value as Country)} style={inputStyle}>
                <option value="CA">Canada</option>
                <option value="US">United States</option>
              </select>
            </Field>
            <Consent
              checked={form.age_confirmed}
              onChange={(v) => update("age_confirmed", v)}
              label="I confirm I am 18 years or older and authorized to open this account on behalf of my business."
            />
          </StepCard>
        )}

        {step === 2 && (
          <StepCard>
            <Field label="Legal business name">
              <input value={form.legal_business_name}
                onChange={(e) => update("legal_business_name", e.target.value)} style={inputStyle} />
            </Field>
            <Row cols="1fr 1fr">
              <Field label="Business type">
                <select value={form.business_type}
                  onChange={(e) => update("business_type", e.target.value as BusinessType)} style={inputStyle}>
                  {BUSINESS_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>
              <Field label={einLabel}>
                <input value={form.ein_bn}
                  onChange={(e) => update("ein_bn", e.target.value)} style={inputStyle} />
              </Field>
            </Row>
            <Row cols="1fr 1fr">
              <Field label="Phone">
                <input value={form.phone} placeholder={form.country === "US" ? "+1 (555) 555-0100" : "+1 (514) 555-0100"}
                  onChange={(e) => update("phone", e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Website (optional)">
                <input value={form.website} placeholder="https://"
                  onChange={(e) => update("website", e.target.value)} style={inputStyle} />
              </Field>
            </Row>
            <Field label="Street address">
              <input value={form.address_line1}
                onChange={(e) => update("address_line1", e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Address line 2 (optional)">
              <input value={form.address_line2}
                onChange={(e) => update("address_line2", e.target.value)} style={inputStyle} />
            </Field>
            <Row cols="2fr 1fr 1fr">
              <Field label="City">
                <input value={form.city}
                  onChange={(e) => update("city", e.target.value)} style={inputStyle} />
              </Field>
              <Field label={provinceLabel}>
                <input value={form.state_province}
                  onChange={(e) => update("state_province", e.target.value)} style={inputStyle} />
              </Field>
              <Field label={postalLabel}>
                <input value={form.postal_code}
                  onChange={(e) => update("postal_code", e.target.value)} style={inputStyle} />
              </Field>
            </Row>
            <Row cols="1fr 1fr">
              <Field label="Industry">
                <select value={form.industry}
                  onChange={(e) => update("industry", e.target.value as Industry)} style={inputStyle}>
                  {INDUSTRIES.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
                </select>
              </Field>
              <Field label="Estimated monthly volume">
                <select value={form.monthly_volume}
                  onChange={(e) => update("monthly_volume", e.target.value as Volume)} style={inputStyle}>
                  {VOLUMES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
                </select>
              </Field>
            </Row>
          </StepCard>
        )}

        {step === 3 && (
          <StepCard>
            <Row cols="1fr 1fr">
              <Field label="First name">
                <input value={form.first_name}
                  onChange={(e) => update("first_name", e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Last name">
                <input value={form.last_name}
                  onChange={(e) => update("last_name", e.target.value)} style={inputStyle} />
              </Field>
            </Row>
            <Field label="Date of birth" hint="You must be 18 years or older to open an account.">
              <input type="date" value={form.owner_dob}
                onChange={(e) => update("owner_dob", e.target.value)} style={inputStyle} />
              {form.owner_dob && !dobAdult && (
                <Hint danger>You must be at least 18 years old.</Hint>
              )}
            </Field>
            {form.country === "US" ? (
              <Field
                label="Social Security Number (last 4)"
                hint="We use this for identity verification only. It is encrypted and never stored in full."
              >
                <input
                  inputMode="numeric" maxLength={4} value={form.owner_ssn_last4}
                  onChange={(e) => update("owner_ssn_last4", e.target.value.replace(/\D/g, "").slice(0, 4))}
                  style={inputStyle}
                />
              </Field>
            ) : (
              <Field
                label="Social Insurance Number (last 3)"
                hint="We use this for identity verification only. It is encrypted and never stored in full."
              >
                <input
                  inputMode="numeric" maxLength={3} value={form.owner_sin_last3}
                  onChange={(e) => update("owner_sin_last3", e.target.value.replace(/\D/g, "").slice(0, 3))}
                  style={inputStyle}
                />
              </Field>
            )}
            <Consent
              checked={form.identity_consent}
              onChange={(v) => update("identity_consent", v)}
              label="I confirm the information above is accurate and I consent to identity verification."
            />
            <Consent
              checked={form.terms_accepted}
              onChange={(v) => update("terms_accepted", v)}
              label={
                <>
                  By creating an account, I agree to ZeniPay&apos;s{" "}
                  <Link href="/terms" style={{ color: zp.brand.cyan, fontWeight: zp.weight.semibold }}>Terms of Service</Link>
                  {" "}and{" "}
                  <Link href="/privacy" style={{ color: zp.brand.cyan, fontWeight: zp.weight.semibold }}>Privacy Policy</Link>,
                  {" "}and I consent to electronic communications.
                </>
              }
            />
          </StepCard>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 22, gap: 12, flexWrap: "wrap" }}>
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(((step as number) - 1) as 1 | 2)}
              style={backBtn}
            >← Back</button>
          ) : <span />}
          {step < 3 ? (
            <button
              type="button"
              onClick={() => {
                if ((step === 1 && canAdvance1) || (step === 2 && canAdvance2)) {
                  setStep((step + 1) as 2 | 3);
                  if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
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
              {loading ? "Creating your account…" : "Create account"}
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

// ─── Personal flow ──────────────────────────────────────────────────────
//
// 2 steps, no KYB. Posts to /api/auth/register/personal which creates
// a merchant row with status='personal_only', a personal profile, and
// a primary personal checking account.

interface PersonalForm {
  email: string;
  email_confirm: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  country: Country;
  age_confirmed: boolean;

  phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state_province: string;
  postal_code: string;
  owner_dob: string;
  owner_ssn_last4: string;
  owner_sin_last3: string;
  identity_consent: boolean;
  terms_accepted: boolean;
}

const PERSONAL_EMPTY: PersonalForm = {
  email: "", email_confirm: "",
  password: "", password_confirm: "",
  first_name: "", last_name: "",
  country: "CA", age_confirmed: false,
  phone: "",
  address_line1: "", address_line2: "", city: "", state_province: "", postal_code: "",
  owner_dob: "",
  owner_ssn_last4: "", owner_sin_last3: "",
  identity_consent: false, terms_accepted: false,
};

function PersonalRegisterFlow() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<PersonalForm>(PERSONAL_EMPTY);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const update = <K extends keyof PersonalForm>(k: K, v: PersonalForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const pwScore = useMemo(() => scorePassword(form.password), [form.password]);
  const pwMatch = !!form.password && form.password === form.password_confirm;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  const emailMatch = !!form.email && form.email.toLowerCase() === form.email_confirm.toLowerCase();
  const dobAdult = useMemo(() => isAdult(form.owner_dob), [form.owner_dob]);

  const canAdvance1 =
    emailValid && emailMatch && pwScore >= 3 && pwMatch &&
    form.first_name.trim().length >= 1 &&
    form.last_name.trim().length >= 1 &&
    form.age_confirmed;

  const canSubmit =
    !!form.owner_dob && dobAdult &&
    form.phone.trim().length >= 7 &&
    form.address_line1.trim().length >= 2 &&
    form.city.trim().length >= 2 &&
    form.state_province.trim().length >= 1 &&
    form.postal_code.trim().length >= 3 &&
    (form.country === "CA" ? form.owner_sin_last3.length === 3 : form.owner_ssn_last4.length === 4) &&
    form.identity_consent && form.terms_accepted;

  const submit = async () => {
    setErr(null);
    if (!canSubmit) { setErr("Please complete every required field and accept the consents."); return; }
    setLoading(true);
    try {
      const r = await fetch("/api/auth/register/personal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email:            form.email.trim().toLowerCase(),
          password:         form.password,
          first_name:       form.first_name.trim(),
          last_name:        form.last_name.trim(),
          country:          form.country,
          phone:            form.phone.trim(),
          address_line1:    form.address_line1.trim(),
          address_line2:    form.address_line2.trim() || null,
          city:             form.city.trim(),
          state_province:   form.state_province.trim(),
          postal_code:      form.postal_code.trim(),
          owner_dob:        form.owner_dob,
          owner_ssn_last4:  form.country === "US" ? form.owner_ssn_last4 : null,
          owner_sin_last3:  form.country === "CA" ? form.owner_sin_last3 : null,
          identity_consent: form.identity_consent,
          terms_accepted:   form.terms_accepted,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || data?.error) { setErr(prettyError(data)); return; }
      if (typeof window !== "undefined") {
        sessionStorage.setItem("zp_client", data.merchant_id);
        sessionStorage.setItem("zp_client_email", form.email.trim().toLowerCase());
        sessionStorage.setItem("zp_client_first_name", form.first_name.trim());
        // No business name for personal users — store the legal name so the
        // existing UI surfaces something readable in headers.
        sessionStorage.setItem("zp_client_bname", `${form.first_name.trim()} ${form.last_name.trim()}`.trim());
      }
      router.replace(data.redirect ?? "/personal/overview");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const provinceLabel = form.country === "CA" ? "Province" : "State";
  const postalLabel   = form.country === "CA" ? "Postal code" : "ZIP code";

  return (
    <div style={{ background: "#FFFFFF", minHeight: "100vh", color: zp.text.primary }}>
      <MarketingNav />

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "56px 24px 80px" }}>
        <ProgressBar step={step} totalSteps={2} />

        <div style={{
          display: "inline-block", marginTop: 28, marginBottom: 4,
          padding: "4px 10px", borderRadius: 999,
          background: "rgba(123,79,191,0.10)", border: "1px solid rgba(123,79,191,0.25)",
          fontSize: 10, fontWeight: zp.weight.semibold,
          color: zp.brand.violet, letterSpacing: "0.12em", textTransform: "uppercase",
        }}>
          Personal account
        </div>

        <h1 style={{
          margin: "8px 0 6px", fontFamily: zp.font.display,
          fontSize: 30, fontWeight: zp.weight.semibold, letterSpacing: "-0.02em",
          color: zp.text.primary,
        }}>
          {step === 1 ? "Create your personal account" : "Verify your identity"}
        </h1>
        <p style={{ margin: "0 0 24px", fontSize: 14, color: zp.text.muted, lineHeight: 1.5 }}>
          {step === 1
            ? "A ZeniPay personal account in 2 minutes. Get a real account number, send and receive money, no business required."
            : "We need to verify your identity to comply with banking regulations. Your information is encrypted and never shared."}
        </p>
        <p style={{ margin: "-12px 0 24px", fontSize: 12, color: zp.text.muted }}>
          Looking to accept payments for your business?{" "}
          <Link href="/register" style={{ color: zp.brand.cyan, fontWeight: zp.weight.semibold }}>Open a business account →</Link>
        </p>

        {err && (
          <div role="alert" style={{
            marginBottom: 16, padding: "11px 14px", borderRadius: 10,
            background: "#FEF2F2", color: "#B91C1C", border: "1px solid #FCA5A5",
            fontSize: 13, fontWeight: zp.weight.semibold,
          }}>{err}</div>
        )}

        {step === 1 && (
          <StepCard>
            <Field label="Email">
              <input type="email" autoComplete="email" autoFocus
                value={form.email} onChange={(e) => update("email", e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Confirm email">
              <input type="email" autoComplete="email"
                value={form.email_confirm} onChange={(e) => update("email_confirm", e.target.value)} style={inputStyle} />
              {form.email_confirm && !emailMatch && (
                <Hint danger>Emails don&apos;t match.</Hint>
              )}
            </Field>
            <Field label="Password" hint="At least 12 characters, with 1 uppercase, 1 number, and 1 symbol.">
              <input type="password" autoComplete="new-password"
                value={form.password} onChange={(e) => update("password", e.target.value)} style={inputStyle} />
              <PasswordStrength score={pwScore} />
            </Field>
            <Field label="Confirm password">
              <input type="password" autoComplete="new-password"
                value={form.password_confirm} onChange={(e) => update("password_confirm", e.target.value)} style={inputStyle} />
              {form.password_confirm && !pwMatch && (
                <Hint danger>Passwords don&apos;t match.</Hint>
              )}
            </Field>
            <Row cols="1fr 1fr">
              <Field label="First name">
                <input value={form.first_name} autoComplete="given-name"
                  onChange={(e) => update("first_name", e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Last name">
                <input value={form.last_name} autoComplete="family-name"
                  onChange={(e) => update("last_name", e.target.value)} style={inputStyle} />
              </Field>
            </Row>
            <Field label="Country">
              <select value={form.country} onChange={(e) => update("country", e.target.value as Country)} style={inputStyle}>
                <option value="CA">Canada</option>
                <option value="US">United States</option>
              </select>
            </Field>
            <Consent
              checked={form.age_confirmed}
              onChange={(v) => update("age_confirmed", v)}
              label="I confirm I am 18 years or older and the account is for my personal use."
            />
          </StepCard>
        )}

        {step === 2 && (
          <StepCard>
            <Field label="Date of birth" hint="You must be 18 years or older to open an account.">
              <input type="date" value={form.owner_dob}
                onChange={(e) => update("owner_dob", e.target.value)} style={inputStyle} />
              {form.owner_dob && !dobAdult && (
                <Hint danger>You must be at least 18 years old.</Hint>
              )}
            </Field>
            <Field label="Phone">
              <input value={form.phone} placeholder={form.country === "US" ? "+1 (555) 555-0100" : "+1 (514) 555-0100"}
                autoComplete="tel"
                onChange={(e) => update("phone", e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Street address">
              <input value={form.address_line1} autoComplete="address-line1"
                onChange={(e) => update("address_line1", e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Address line 2 (optional)">
              <input value={form.address_line2} autoComplete="address-line2"
                onChange={(e) => update("address_line2", e.target.value)} style={inputStyle} />
            </Field>
            <Row cols="2fr 1fr 1fr">
              <Field label="City">
                <input value={form.city} autoComplete="address-level2"
                  onChange={(e) => update("city", e.target.value)} style={inputStyle} />
              </Field>
              <Field label={provinceLabel}>
                <input value={form.state_province} autoComplete="address-level1"
                  onChange={(e) => update("state_province", e.target.value)} style={inputStyle} />
              </Field>
              <Field label={postalLabel}>
                <input value={form.postal_code} autoComplete="postal-code"
                  onChange={(e) => update("postal_code", e.target.value)} style={inputStyle} />
              </Field>
            </Row>
            {form.country === "US" ? (
              <Field
                label="Social Security Number (last 4)"
                hint="Used for identity verification only. Encrypted and never stored in full."
              >
                <input
                  inputMode="numeric" maxLength={4} value={form.owner_ssn_last4}
                  onChange={(e) => update("owner_ssn_last4", e.target.value.replace(/\D/g, "").slice(0, 4))}
                  style={inputStyle}
                />
              </Field>
            ) : (
              <Field
                label="Social Insurance Number (last 3)"
                hint="Used for identity verification only. Encrypted and never stored in full."
              >
                <input
                  inputMode="numeric" maxLength={3} value={form.owner_sin_last3}
                  onChange={(e) => update("owner_sin_last3", e.target.value.replace(/\D/g, "").slice(0, 3))}
                  style={inputStyle}
                />
              </Field>
            )}
            <Consent
              checked={form.identity_consent}
              onChange={(v) => update("identity_consent", v)}
              label="I confirm the information above is accurate and I consent to identity verification."
            />
            <Consent
              checked={form.terms_accepted}
              onChange={(v) => update("terms_accepted", v)}
              label={
                <>
                  By creating an account, I agree to ZeniPay&apos;s{" "}
                  <Link href="/terms" style={{ color: zp.brand.cyan, fontWeight: zp.weight.semibold }}>Terms of Service</Link>
                  {" "}and{" "}
                  <Link href="/privacy" style={{ color: zp.brand.cyan, fontWeight: zp.weight.semibold }}>Privacy Policy</Link>,
                  {" "}and I consent to electronic communications.
                </>
              }
            />
          </StepCard>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 22, gap: 12, flexWrap: "wrap" }}>
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              style={backBtn}
            >← Back</button>
          ) : <span />}
          {step < 2 ? (
            <button
              type="button"
              onClick={() => {
                if (canAdvance1) {
                  setStep(2);
                  if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              disabled={!canAdvance1}
              style={{
                ...gradientBtn,
                opacity: !canAdvance1 ? 0.55 : 1,
                cursor: !canAdvance1 ? "not-allowed" : "pointer",
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
              {loading ? "Creating your account…" : "Create account"}
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

function ProgressBar({ step, totalSteps = 3 }: { step: number; totalSteps?: number }) {
  const pct = Math.max(0, Math.min(100, Math.round((step / totalSteps) * 100)));
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: zp.weight.semibold, color: zp.text.muted, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          Step {step} of {totalSteps}
        </span>
        <span style={{ fontSize: 11, fontWeight: zp.weight.semibold, color: zp.brand.cyan, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          {pct}% complete
        </span>
      </div>
      <div style={{ height: 4, borderRadius: 999, background: "#E5E7EB", overflow: "hidden" }}>
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
      background: "#FFFFFF",
      border: "1px solid #E5E7EB",
      borderRadius: 12,
      padding: 26,
    }}>
      {children}
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        display: "block", fontSize: 11, fontWeight: zp.weight.semibold, color: zp.text.primary,
        marginBottom: 6,
      }}>{label}</label>
      {children}
      {hint && <Hint>{hint}</Hint>}
    </div>
  );
}

function Hint({ children, danger }: { children: React.ReactNode; danger?: boolean }) {
  return (
    <div style={{
      fontSize: 11,
      color: danger ? "#B91C1C" : zp.text.muted,
      marginTop: 5,
      fontWeight: danger ? zp.weight.semibold : zp.weight.regular,
    }}>{children}</div>
  );
}

function Row({ cols, children }: { cols: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: cols, gap: 12 }}>
      {children}
    </div>
  );
}

function Consent({ checked, onChange, label }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
}) {
  return (
    <label style={{
      display: "flex", gap: 10, alignItems: "flex-start",
      padding: "12px 14px", marginTop: 10,
      background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 10,
      fontSize: 13, color: zp.text.primary, lineHeight: 1.5,
      cursor: "pointer",
    }}>
      <input
        type="checkbox" checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: 3, accentColor: zp.brand.cyan }}
      />
      <span>{label}</span>
    </label>
  );
}

function PasswordStrength({ score }: { score: number }) {
  const pct = Math.min(100, (score / 4) * 100);
  const color = score <= 1 ? "#DC2626" : score === 2 ? "#D97706" : score === 3 ? "#16A34A" : zp.brand.violet;
  const label = score === 0 ? "Too short"
              : score === 1 ? "Weak"
              : score === 2 ? "Fair"
              : score === 3 ? "Strong"
              : "Excellent";
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ height: 4, borderRadius: 999, background: "#E5E7EB", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, transition: "width 0.2s" }} />
      </div>
      <div style={{ fontSize: 11, color, marginTop: 4, fontWeight: zp.weight.semibold }}>{label}</div>
    </div>
  );
}

// 4-level password score: Weak / Fair / Strong / Excellent.
//   1 — meets minimum (12+ chars)
//   2 — + length 14+ OR mixed case
//   3 — + digits AND symbols
//   4 — + length 18+ AND digits/symbols/case all present
function scorePassword(pw: string): number {
  if (pw.length < 12) return 0;
  let s = 1;
  const hasUpper = /[A-Z]/.test(pw);
  const hasLower = /[a-z]/.test(pw);
  const hasDigit = /\d/.test(pw);
  const hasSymbol = /[^A-Za-z0-9]/.test(pw);
  if (hasUpper && hasLower) s++;
  if (hasDigit && hasSymbol) s++;
  if (pw.length >= 18 && hasUpper && hasLower && hasDigit && hasSymbol) s = 4;
  return Math.min(4, s);
}

function isAdult(dobIso: string): boolean {
  if (!dobIso) return false;
  const dob = new Date(dobIso);
  if (Number.isNaN(dob.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age >= 18;
}

function prettyError(data: unknown): string {
  if (!data || typeof data !== "object") return "Registration failed.";
  const e = (data as { error?: unknown }).error;
  if (typeof e === "string") return e;
  if (e && typeof e === "object" && "message" in e && typeof (e as { message: string }).message === "string") {
    const code = (e as { code?: string }).code;
    const msg = (e as { message: string }).message;
    const map: Record<string, string> = {
      email_already_registered: "This email is already registered. Sign in instead.",
      password_weak:            "Password must be at least 12 characters with 1 uppercase, 1 number, and 1 symbol.",
      owner_must_be_18_plus:    "You must be at least 18 years old.",
      sin_last_3_required:      "Please enter the last 3 digits of your SIN.",
      ssn_last_4_required:      "Please enter the last 4 digits of your SSN.",
      identity_consent_required:"Please confirm identity verification consent.",
      terms_must_be_accepted:   "Please accept the Terms of Service.",
      rate_limited:             "Too many signup attempts. Please try again in an hour.",
    };
    return map[code ?? ""] ?? msg;
  }
  return "Registration failed.";
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: 10,
  border: "1px solid #E5E7EB", background: "#FFFFFF",
  color: zp.text.primary, fontSize: 14,
  boxSizing: "border-box", outline: "none", fontFamily: zp.font.sans,
};

const gradientBtn: React.CSSProperties = {
  background: zp.gradient.main, color: "#FFFFFF", border: "none",
  padding: "12px 22px", borderRadius: 10,
  fontSize: 14, fontWeight: zp.weight.semibold,
  cursor: "pointer",
  boxShadow: "0 4px 12px rgba(15,184,201,0.25)",
};

const backBtn: React.CSSProperties = {
  background: "transparent", border: "none",
  color: zp.text.muted, fontSize: 13, fontWeight: zp.weight.semibold,
  cursor: "pointer", padding: "10px 0",
};
