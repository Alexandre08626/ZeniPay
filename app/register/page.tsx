"use client";
import { useState } from "react";

const STEPS = ["Business Info", "Owner Info", "Bank Account", "Review"];
const G = "linear-gradient(135deg, #2DBE60, #15B8C9, #7B4FBF)";

export default function RegisterPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<Record<string,string>>({
    business_name: "", doing_business_as: "", business_type: "LIMITED_LIABILITY_COMPANY",
    email: "", phone: "", website: "",
    first_name: "", last_name: "", dob_month: "", dob_day: "", dob_year: "",
    tax_id: "", password: "",
    line1: "", city: "", region: "", postal_code: "", country: "USA",
    bank_name: "", account_number: "", routing_number: "", account_type: "CHECKING",
  });
  const u = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    setLoading(true); setError("");
    try {
      const r1 = await fetch("/api/zenipay/onboarding/create-identity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const d1 = await r1.json();
      if (!d1.identity_id) throw new Error(d1.error || "Identity creation failed");
      const mid = "merchant_" + Date.now().toString(36);
      const r2 = await fetch("/api/zenipay/onboarding/create-merchant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identity_id: d1.identity_id, merchant_id_internal: mid, business_name: form.business_name, email: form.email, phone: form.phone, website: form.website, owner_name: form.first_name + " " + form.last_name, password: form.password, business_type: form.business_type, country: form.country }) });
      const d2 = await r2.json();
      if (!d2.finix_merchant_id) throw new Error(d2.error || "Merchant creation failed");
      if (form.account_number && form.routing_number) {
        await fetch("/api/zenipay/onboarding/create-bank-account", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identity_id: d1.identity_id, account_number: form.account_number, routing_number: form.routing_number, account_type: form.account_type, name: form.business_name }) });
      }
      setDone(true);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  };

  const I = (l: string, k: string, p?: string, h?: boolean, t?: string) => (
    <div style={{ flex: h ? "1 1 48%" : "1 1 100%", minWidth: h ? 180 : "auto" }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>{l}</label>
      <input type={t||"text"} placeholder={p||""} value={form[k]||""} onChange={e=>u(k,e.target.value)} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 14, background: "#F8FAFC", outline: "none", boxSizing: "border-box" }}/>
    </div>
  );

  if (done) return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0F172A,#1E293B)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 24, padding: 48, maxWidth: 500, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>&#127881;</div>
        <h1 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 12px" }}>Welcome to ZeniPay!</h1>
        <p style={{ color: "#64748B", margin: "0 0 24px" }}>Your merchant account is being verified by Finix.</p>
        <a href="/app" style={{ display: "inline-block", padding: "14px 32px", borderRadius: 12, background: G, color: "#fff", fontWeight: 700, textDecoration: "none" }}>Go to Dashboard</a>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0F172A,#1E293B)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 24, maxWidth: 640, width: "100%", overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "32px 36px 24px", borderBottom: "1px solid #F1F5F9" }}>
          <div style={{ fontSize: 28, fontWeight: 900, background: G, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>ZeniPay</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>Merchant Registration</div>
          <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
            {STEPS.map((s, i) => <div key={s} style={{ flex: 1, textAlign: "center" }}><div style={{ height: 4, borderRadius: 2, background: i <= step ? G : "#E2E8F0", marginBottom: 6 }}/><div style={{ fontSize: 10, fontWeight: 700, color: i <= step ? "#2DBE60" : "#94A3B8" }}>{s}</div></div>)}
          </div>
        </div>
        <div style={{ padding: "28px 36px 36px" }}>
          {step===0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            {I("Business Name","business_name","Zeniva Travel LLC")}
            {I("DBA","doing_business_as","Zeniva",true)}
            {I("Email","email","info@business.com",true,"email")}
            {I("Phone","phone","+1 555 1234",true)}
            {I("Website","website","https://...",true)}
            {I("Address","line1","123 Main St")}
            {I("City","city","Miami",true)}{I("State","region","FL",true)}
            {I("Postal Code","postal_code","33101",true)}
          </div>}
          {step===1 && <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            {I("First Name","first_name","John",true)}{I("Last Name","last_name","Doe",true)}
            {I("Tax ID","tax_id","XX-XXXXXXX")}
            {I("DOB Month","dob_month","01",true)}{I("DOB Day","dob_day","15",true)}{I("DOB Year","dob_year","1990",true)}
            {I("Password","password","Min 8 chars",false,"password")}
          </div>}
          {step===2 && <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            {I("Bank Name","bank_name","TD Bank")}
            {I("Routing #","routing_number","021000021",true)}{I("Account #","account_number","1234567890",true)}
          </div>}
          {step===3 && <div>
            <div style={{ fontWeight: 700, marginBottom: 16 }}>Review</div>
            {["business_name","email","first_name","last_name","line1","city","region","bank_name"].map(k=>form[k]?<div key={k} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #F1F5F9",fontSize:13}}><span style={{color:"#64748B"}}>{k.replace(/_/g," ")}</span><span style={{fontWeight:600}}>{form[k]}</span></div>:null)}
          </div>}
          {error && <div style={{ marginTop: 16, padding: 12, background: "#FEF2F2", borderRadius: 8, color: "#DC2626", fontSize: 13 }}>{error}</div>}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28 }}>
            {step > 0 ? <button onClick={()=>setStep(s=>s-1)} style={{ padding: "12px 24px", borderRadius: 10, border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer" }}>Back</button> : <div/>}
            <button onClick={()=>step<3?setStep(s=>s+1):submit()} disabled={loading} style={{ padding: "12px 32px", borderRadius: 10, border: "none", background: loading?"#94A3B8":G, color: "#fff", fontWeight: 700, cursor: "pointer" }}>{step<3?"Continue":loading?"Submitting...":"Create Account"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
