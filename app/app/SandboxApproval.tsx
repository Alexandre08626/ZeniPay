"use client";
import { useState, useEffect } from "react";

const ZP_GREEN  = "#2DBE60";
const ZP_CYAN   = "#15B8C9";
const ZP_PURPLE = "#7B4FBF";
const ZP_BLUE   = "#2A8FE0";
const ZP_GRAD   = "linear-gradient(135deg, #2DBE60 0%, #15B8C9 45%, #7B4FBF 100%)";
const DARK      = "#0A0F1E";
const DARK2     = "#111827";
const GLASS     = "rgba(255,255,255,0.06)";
const BORDER    = "rgba(255,255,255,0.10)";

const STEPS = [
  {
    id: "business",
    icon: "🏢",
    title: "Business Verification",
    desc: "Confirm your legal business information",
    fields: [
      { key: "legalName",  label: "Legal Business Name",  type: "text",   placeholder: "ZeniPay Inc." },
      { key: "businessNum",label: "Business Number (BN)", type: "text",   placeholder: "123456789" },
      { key: "address",    label: "Business Address",     type: "text",   placeholder: "123 Main St, Toronto, ON" },
      { key: "industry",   label: "Industry Category",    type: "select", options: ["E-commerce","SaaS","Travel","Marketplace","Restaurant","Retail","Healthcare","Other"] },
      { key: "website2",   label: "Business Website",     type: "text",   placeholder: "https://yourbusiness.com" },
    ],
  },
  {
    id: "integration",
    icon: "⚙️",
    title: "Integration Setup",
    desc: "Install the ZeniPay SDK and run your first test payment",
    steps: [
      { label: "Install SDK",         code: "npm install @zenipay/node",        key: "sdk" },
      { label: "Initialize client",   code: `import ZeniPay from '@zenipay/node';\nconst zp = new ZeniPay('YOUR_SANDBOX_KEY');`, key: "init" },
      { label: "Create test payment", code: `const payment = await zp.payments.create({\n  amount: 1000,\n  currency: 'cad',\n  source: { number: '4111111111111111', exp_month: 12, exp_year: 2028, cvc: '999' }\n});\nconsole.log(payment.id);`, key: "test" },
      { label: "Setup webhook",       code: `app.post('/webhook', zp.webhooks.express({\n  secret: 'YOUR_SANDBOX_SECRET',\n  on: { 'payment.succeeded': (e) => console.log(e) }\n}));`, key: "webhook" },
    ],
  },
  {
    id: "compliance",
    icon: "📋",
    title: "Volume & Compliance",
    desc: "Required for payment network compliance",
    fields: [
      { key: "monthlyVolume2", label: "Expected Monthly Volume (CAD)", type: "select", options: ["Under $1,000","$1,000 – $10,000","$10,000 – $50,000","$50,000 – $200,000","$200,000+"] },
      { key: "avgTicket",      label: "Average Transaction Size",     type: "select", options: ["Under $25","$25 – $100","$100 – $500","$500 – $2,000","$2,000+"] },
      { key: "intlCards",      label: "Accept international cards?",  type: "select", options: ["Yes — mostly domestic","Yes — global customer base","No — domestic only"] },
      { key: "refundPolicy",   label: "Refund Policy URL",            type: "text",   placeholder: "https://yourbusiness.com/refunds" },
      { key: "termsUrl",       label: "Terms of Service URL",         type: "text",   placeholder: "https://yourbusiness.com/terms" },
    ],
  },
  {
    id: "review",
    icon: "🔍",
    title: "Under Review",
    desc: "We're reviewing your application",
  },
];

interface SandboxApprovalProps {
  email: string;
  businessName: string;
  sandboxKey: string;
  sandboxSecret: string;
  onApproved: () => void;
}

export default function SandboxApproval({ email, businessName, sandboxKey, sandboxSecret, onApproved }: SandboxApprovalProps) {
  const storageKey = `zp_approval_${email}`;
  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState<Record<string, string>>({});
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
      if (saved.currentStep !== undefined) setCurrentStep(saved.currentStep);
      if (saved.form) setForm(saved.form);
      if (saved.checkedSteps) setCheckedSteps(saved.checkedSteps);
      if (saved.submitted) setSubmitted(saved.submitted);
    } catch {}
  }, [storageKey]);

  const save = (updates: Record<string, unknown>) => {
    try {
      const existing = JSON.parse(localStorage.getItem(storageKey) || "{}");
      localStorage.setItem(storageKey, JSON.stringify({ ...existing, ...updates }));
    } catch {}
  };

  const setField = (k: string, v: string) => {
    const newForm = { ...form, [k]: v };
    setForm(newForm);
    save({ form: newForm });
  };

  const toggleCheck = (k: string) => {
    const updated = { ...checkedSteps, [k]: !checkedSteps[k] };
    setCheckedSteps(updated);
    save({ checkedSteps: updated });
  };

  const copyCode = (code: string, key: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(key);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  const nextStep = () => {
    const next = Math.min(currentStep + 1, STEPS.length - 1);
    setCurrentStep(next);
    save({ currentStep: next });
  };

  const submitForReview = () => {
    setSubmitted(true);
    save({ submitted: true, currentStep: 3 });
    setCurrentStep(3);
  };

  const step = STEPS[currentStep];

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "11px 14px", borderRadius: 10,
    background: "rgba(255,255,255,0.07)", border: `1px solid ${BORDER}`,
    color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box",
    fontFamily: "inherit",
  };

  return (
    <div style={{ minHeight: "100vh", background: DARK, color: "#fff", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <style>{`
        select option { background: #1e293b; color: #fff; }
        pre { font-family: 'SF Mono', 'Fira Code', monospace; }
      `}</style>

      {/* Header */}
      <div style={{ background: "rgba(10,15,30,0.95)", borderBottom: `1px solid ${BORDER}`, padding: "0 5%", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: ZP_GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 16 }}>Z</div>
          <span style={{ fontWeight: 800, fontSize: 17, background: ZP_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>ZeniPay</span>
          <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 800, background: "rgba(245,166,35,0.15)", color: "#F5A623", border: "1px solid rgba(245,166,35,0.3)" }}>SANDBOX</span>
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>{businessName}</div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 20px" }}>
        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 10px", letterSpacing: "-0.8px" }}>Activate your live account</h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 15, margin: 0 }}>Complete all steps to unlock real payments</p>
        </div>

        {/* Step Progress */}
        <div style={{ display: "flex", gap: 8, marginBottom: 40 }}>
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              onClick={() => i < currentStep && setCurrentStep(i)}
              style={{ flex: 1, cursor: i < currentStep ? "pointer" : "default" }}
            >
              <div style={{ height: 4, borderRadius: 4, background: i < currentStep ? ZP_GREEN : i === currentStep ? ZP_CYAN : "rgba(255,255,255,0.1)", marginBottom: 8, transition: "background 0.3s" }} />
              <div style={{ fontSize: 11, color: i === currentStep ? "#fff" : "rgba(255,255,255,0.35)", fontWeight: i === currentStep ? 700 : 400, textAlign: "center" }}>
                {i < currentStep ? "✓ " : ""}{s.title.split(" ")[0]}
              </div>
            </div>
          ))}
        </div>

        {/* Sandbox Keys — always visible */}
        <div style={{ background: "rgba(245,166,35,0.06)", border: "1px solid rgba(245,166,35,0.2)", borderRadius: 16, padding: "16px 20px", marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#F5A623", marginBottom: 12 }}>🧪 Your Sandbox Keys (active now)</div>
          <div style={{ display: "grid", gap: 10 }}>
            {[
              { label: "Publishable Key", value: sandboxKey },
              { label: "Secret Key",      value: sandboxSecret },
            ].map(k => (
              <div key={k.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", width: 110, flexShrink: 0 }}>{k.label}</span>
                <code style={{ flex: 1, fontSize: 11, background: "rgba(0,0,0,0.3)", padding: "6px 10px", borderRadius: 8, color: "rgba(255,255,255,0.85)", wordBreak: "break-all" }}>{k.value || "—"}</code>
                <button onClick={() => copyCode(k.value, k.label)} style={{ background: "rgba(255,255,255,0.08)", border: `1px solid ${BORDER}`, color: "#fff", padding: "5px 12px", borderRadius: 8, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }}>
                  {copiedCode === k.label ? "✓" : "Copy"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Step Card */}
        <div style={{ background: DARK2, border: `1px solid ${BORDER}`, borderRadius: 20, overflow: "hidden" }}>
          {/* Step Header */}
          <div style={{ padding: "20px 24px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: ZP_GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{step.icon}</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900 }}>Step {currentStep + 1} — {step.title}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>{step.desc}</div>
            </div>
          </div>

          <div style={{ padding: "24px" }}>
            {/* STEP 0 — Business Verification */}
            {currentStep === 0 && step.fields && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {step.fields.map(f => (
                    <div key={f.key} style={{ gridColumn: f.key === "address" ? "1/-1" : "auto" }}>
                      <label style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 700, display: "block", marginBottom: 6 }}>{f.label}</label>
                      {f.type === "select" ? (
                        <select value={form[f.key] || ""} onChange={e => setField(f.key, e.target.value)} style={{ ...inputStyle }}>
                          <option value="">Choose…</option>
                          {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input type={f.type} placeholder={f.placeholder} value={form[f.key] || ""} onChange={e => setField(f.key, e.target.value)} style={inputStyle} />
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={nextStep}
                  disabled={!form.legalName || !form.businessNum || !form.address || !form.industry}
                  style={{ marginTop: 24, width: "100%", padding: 14, background: (!form.legalName || !form.businessNum || !form.address || !form.industry) ? "rgba(255,255,255,0.1)" : ZP_GRAD, color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: "pointer" }}
                >
                  Save & Continue →
                </button>
              </div>
            )}

            {/* STEP 1 — Integration Setup */}
            {currentStep === 1 && step.steps && (
              <div>
                <div style={{ marginBottom: 20, padding: "12px 16px", background: "rgba(45,190,96,0.07)", border: "1px solid rgba(45,190,96,0.2)", borderRadius: 12, fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>
                  Follow these steps in your terminal / codebase. Check each one when done.
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {step.steps.map((s, i) => (
                    <div key={s.key} style={{ background: GLASS, border: `1px solid ${checkedSteps[s.key] ? "rgba(45,190,96,0.4)" : BORDER}`, borderRadius: 14, overflow: "hidden", transition: "border-color 0.2s" }}>
                      {/* Row header */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: `1px solid ${BORDER}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 24, height: 24, borderRadius: "50%", background: checkedSteps[s.key] ? ZP_GREEN : "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                            {checkedSteps[s.key] ? "✓" : i + 1}
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 700 }}>{s.label}</span>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => copyCode(s.code, s.key)} style={{ background: "rgba(255,255,255,0.08)", border: `1px solid ${BORDER}`, color: "rgba(255,255,255,0.7)", padding: "4px 10px", borderRadius: 8, fontSize: 11, cursor: "pointer" }}>
                            {copiedCode === s.key ? "✓ Copied" : "Copy"}
                          </button>
                          <button onClick={() => toggleCheck(s.key)} style={{ background: checkedSteps[s.key] ? "rgba(45,190,96,0.2)" : "rgba(255,255,255,0.08)", border: `1px solid ${checkedSteps[s.key] ? "rgba(45,190,96,0.4)" : BORDER}`, color: checkedSteps[s.key] ? ZP_GREEN : "rgba(255,255,255,0.7)", padding: "4px 10px", borderRadius: 8, fontSize: 11, cursor: "pointer" }}>
                            {checkedSteps[s.key] ? "Done ✓" : "Mark done"}
                          </button>
                        </div>
                      </div>
                      {/* Code block */}
                      <pre style={{ margin: 0, padding: "14px 16px", fontSize: 12, lineHeight: 1.7, color: "#e6edf3", overflowX: "auto", background: "#0d1117" }}>
                        {s.code.replace(/YOUR_SANDBOX_KEY/g, sandboxKey || "zpk_sb_xxx").replace(/YOUR_SANDBOX_SECRET/g, sandboxSecret || "zps_sb_xxx")}
                      </pre>
                    </div>
                  ))}
                </div>
                {/* Test cards */}
                <div style={{ marginTop: 20, background: "rgba(245,166,35,0.06)", border: "1px solid rgba(245,166,35,0.2)", borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#F5A623", marginBottom: 8 }}>Test Cards</div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12 }}><span style={{ color: "#F5A623" }}>Visa:</span> <code>4111 1111 1111 1111</code></span>
                    <span style={{ fontSize: 12 }}><span style={{ color: "#F5A623" }}>MC:</span> <code>5454 5454 5454 5454</code></span>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Any future exp · CVC 999</span>
                  </div>
                </div>
                <button
                  onClick={nextStep}
                  disabled={Object.keys(checkedSteps).length < 2}
                  style={{ marginTop: 24, width: "100%", padding: 14, background: Object.keys(checkedSteps).filter(k => checkedSteps[k]).length < 2 ? "rgba(255,255,255,0.1)" : ZP_GRAD, color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: "pointer" }}
                >
                  Integration looks good → Continue
                </button>
              </div>
            )}

            {/* STEP 2 — Compliance */}
            {currentStep === 2 && step.fields && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {step.fields.map(f => (
                    <div key={f.key} style={{ gridColumn: f.key === "refundPolicy" || f.key === "termsUrl" ? "1/-1" : "auto" }}>
                      <label style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 700, display: "block", marginBottom: 6 }}>{f.label}</label>
                      {f.type === "select" ? (
                        <select value={form[f.key] || ""} onChange={e => setField(f.key, e.target.value)} style={{ ...inputStyle }}>
                          <option value="">Choose…</option>
                          {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input type={f.type} placeholder={f.placeholder} value={form[f.key] || ""} onChange={e => setField(f.key, e.target.value)} style={inputStyle} />
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 20, padding: "14px 16px", background: GLASS, border: `1px solid ${BORDER}`, borderRadius: 12, fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>
                  By submitting this application you agree to the ZeniPay Merchant Agreement and confirm all provided information is accurate and complete.
                </div>
                <button
                  onClick={submitForReview}
                  disabled={!form.monthlyVolume2 || !form.avgTicket}
                  style={{ marginTop: 20, width: "100%", padding: 14, background: (!form.monthlyVolume2 || !form.avgTicket) ? "rgba(255,255,255,0.1)" : ZP_GRAD, color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: "pointer" }}
                >
                  Submit for Live Review →
                </button>
              </div>
            )}

            {/* STEP 3 — Under Review */}
            {currentStep === 3 && (
              <div style={{ textAlign: "center", padding: "20px 0 10px" }}>
                <div style={{ fontSize: 52, marginBottom: 16 }}>⏳</div>
                <h2 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 10px" }}>Application submitted!</h2>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 15, margin: "0 0 24px", lineHeight: 1.7 }}>
                  Our team will review your application within <strong style={{ color: "#fff" }}>1–2 business days</strong>.<br />
                  We will email <strong style={{ color: ZP_CYAN }}>{email}</strong> when you are approved.
                </p>
                <div style={{ display: "grid", gap: 10, maxWidth: 400, margin: "0 auto 28px" }}>
                  {[
                    { icon: "✅", label: "Business Verification", done: true },
                    { icon: "✅", label: "Integration Setup",     done: true },
                    { icon: "✅", label: "Compliance Review",     done: true },
                    { icon: "🔄", label: "ZeniPay Review",        done: false },
                  ].map(item => (
                    <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 12, background: GLASS, border: `1px solid ${item.done ? "rgba(45,190,96,0.3)" : BORDER}`, borderRadius: 12, padding: "12px 16px" }}>
                      <span style={{ fontSize: 20 }}>{item.icon}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: item.done ? ZP_GREEN : "rgba(255,255,255,0.6)" }}>{item.label}</span>
                    </div>
                  ))}
                </div>
                <a href="mailto:zenipay@zeniva.ca" style={{ display: "inline-block", background: GLASS, border: `1px solid ${BORDER}`, color: "#fff", textDecoration: "none", padding: "12px 28px", borderRadius: 12, fontSize: 14, fontWeight: 700 }}>
                  Contact Support
                </a>
                {/* DEV: Approve button (admin sets via admin panel in real life) */}
                <div style={{ marginTop: 20, padding: "10px", background: "rgba(123,79,191,0.1)", border: "1px solid rgba(123,79,191,0.3)", borderRadius: 10, fontSize: 11, color: ZP_PURPLE }}>
                  Demo: <button onClick={onApproved} style={{ background: "none", border: "none", color: ZP_PURPLE, cursor: "pointer", fontWeight: 700, fontSize: 11, padding: "0 4px" }}>Simulate approval →</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
