"use client";
import { useState, useEffect } from "react";
import { useT } from "../../modules/zenipay/i18n";

const G = "linear-gradient(135deg, #2DBE60 0%, #15B8C9 45%, #7B4FBF 100%)";
const B = "#e2e8f0";
const M = "#64748b";
const TX = "#0f172a";
const STEPS = ["Business", "Owner KYC", "Bank", "Tests", "Submit"];

export function SetupWizard({ accountId, onComplete }: { accountId: string; onComplete: () => void }) {
  const { t } = useT();
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Record<string, Record<string,string>>>({ business: {}, owner: {}, bank: {} });
  const [tests, setTests] = useState<Record<string, boolean|null>>({ paylink: null, success: null, fail: null });
  const [sub, setSub] = useState(false);
  const upd = (s: string, k: string, v: string) => setD(p => ({ ...p, [s]: { ...p[s], [k]: v } }));
  const save = async (sn: string) => { try { await fetch("/api/zenipay/onboarding/save-step", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ merchant_id: accountId, step: sn, data: d[sn]||{} }) }); } catch {} };
  const F = (s: string, l: string, k: string, p?: string, h?: boolean) => (<div style={{ flex:h?"1 1 48%":"1 1 100%", minWidth:h?180:"auto" }}><label style={{ display:"block",fontSize:11,fontWeight:700,color:M,textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:6 }}>{l}</label><input type="text" placeholder={p||""} value={d[s]?.[k]||""} onChange={e=>upd(s,k,e.target.value)} style={{ width:"100%",padding:"12px 14px",borderRadius:10,border:"1px solid "+B,fontSize:14,background:"#F8FAFC",outline:"none",boxSizing:"border-box" }}/></div>);
  const runTest = async (key: string, fn: () => Promise<boolean>) => { try { const ok = await fn(); setTests(p=>({...p,[key]:ok})); } catch { setTests(p=>({...p,[key]:false})); } };
  const [submitError, setSubmitError] = useState("");
  const submit = async () => { setSub(true); setSubmitError(""); try { const r = await fetch("/api/zenipay/onboarding/submit", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ business: d.business, owner: d.owner, bank: d.bank, merchant_id: accountId }) }); const j = await r.json(); if (j.success) onComplete(); else setSubmitError(j.error||"Submission failed. Please try again."); } catch(e) { setSubmitError(String(e)); } finally { setSub(false); } };
  return (<div>
    <h2 style={{ fontSize:20,fontWeight:900,margin:"0 0 8px",color:TX }}>{t("setup.sandboxSetup")}</h2>
    <p style={{ fontSize:13,color:M,margin:"0 0 24px" }}>{t("setup.completeSteps")}</p>
    <div style={{ display:"flex",gap:4,marginBottom:28 }}>{STEPS.map((s,i)=>(<div key={s} style={{ flex:1,textAlign:"center" }}><div style={{ height:4,borderRadius:2,background:i<=step?G:B,marginBottom:6 }}/><div style={{ fontSize:10,fontWeight:700,color:i<=step?"#2DBE60":M }}>{i+1}. {s}</div></div>))}</div>
    {step===0&&<div style={{ background:"white",borderRadius:16,padding:24,border:"1px solid "+B }}><div style={{ fontWeight:800,marginBottom:16 }}>{t("setup.businessInfo")}</div><div style={{ display:"flex",flexWrap:"wrap",gap:14 }}>{F("business","Legal Name","business_name","Zeniva Travel LLC")}{F("business","DBA","doing_business_as","Zeniva",true)}{F("business","Type","business_type","LLC",true)}{F("business","Email","email","info@biz.com",true)}{F("business","Phone","phone","+1 555 1234",true)}{F("business","Website","website","https://...",true)}{F("business","Tax ID","tax_id","XX-XXXXXXX",true)}{F("business","MCC","mcc","4722",true)}{F("business","Address","line1","123 Main St")}{F("business","City","city","Miami",true)}{F("business","State","region","FL",true)}{F("business","Postal","postal_code","33101",true)}{F("business","Country","country","USA",true)}{F("business","Annual Vol $","annual_volume","1000000",true)}{F("business","Max Tx $","max_transaction","15000",true)}</div></div>}
    {step===1&&<div style={{ background:"white",borderRadius:16,padding:24,border:"1px solid "+B }}><div style={{ fontWeight:800,marginBottom:16 }}>{t("setup.ownerKyc")}</div><div style={{ display:"flex",flexWrap:"wrap",gap:14 }}>{F("owner","First Name","first_name","John",true)}{F("owner","Last Name","last_name","Doe",true)}{F("owner","Title","title","CEO",true)}{F("owner","Ownership %","ownership_pct","100",true)}{F("owner","DOB Month","dob_month","01",true)}{F("owner","DOB Day","dob_day","15",true)}{F("owner","DOB Year","dob_year","1990",true)}{F("owner","SSN Last 4","ssn_last4","1234",true)}{F("owner","Address","line1","123 Main St")}{F("owner","City","city","Miami",true)}{F("owner","State","region","FL",true)}{F("owner","Postal","postal_code","33101",true)}</div></div>}
    {step===2&&<div style={{ background:"white",borderRadius:16,padding:24,border:"1px solid "+B }}><div style={{ fontWeight:800,marginBottom:16 }}>{t("setup.bankAccount")}</div><div style={{ display:"flex",flexWrap:"wrap",gap:14 }}>{F("bank","Bank Name","bank_name","TD Bank")}{F("bank","Routing #","routing_number","021000021",true)}{F("bank","Account #","account_number","1234567890",true)}{F("bank","Type","account_type","CHECKING",true)}</div><div style={{ marginTop:16,padding:14,background:"rgba(21,184,201,0.06)",border:"1px solid rgba(21,184,201,0.2)",borderRadius:10,fontSize:12,color:M }}>You agree to use this bank account for business purposes only.</div></div>}
    {step===3&&<div style={{ background:"white",borderRadius:16,padding:24,border:"1px solid "+B }}><div style={{ fontWeight:800,marginBottom:16 }}>{t("setup.sandboxTests")}</div><div style={{ display:"grid",gap:12 }}>{[{key:"paylink",label:"Create test Pay Link",fn:async()=>{const r=await fetch("/api/zenipay/create-link",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({amount:1,currency:"USD",description:"Test",merchant_id:accountId})});const j=await r.json();return !!j.id}},{key:"success",label:"Test payment 4111...1111",fn:async()=>{const r=await fetch("/api/zenipay/admin/finix-fix");const j=await r.json();return j.test_success?.state==="SUCCEEDED"}},{key:"fail",label:"Test decline 4000...0002",fn:async()=>{const r=await fetch("/api/zenipay/admin/finix-fix");const j=await r.json();return j.test_fail?.state==="FAILED"}}].map(t=>(<div key={t.key} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",background:"#F8FAFC",borderRadius:12,border:"1px solid "+B}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:20}}>{tests[t.key]===true?"✅":tests[t.key]===false?"❌":"⬜"}</span><span style={{fontSize:14,fontWeight:600}}>{t.label}</span></div><button onClick={()=>runTest(t.key,t.fn)} disabled={tests[t.key]===true} style={{padding:"8px 18px",borderRadius:8,border:"none",background:tests[t.key]===true?"#d1fae5":G,color:tests[t.key]===true?"#065f46":"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>{tests[t.key]===true?"Passed":"Run"}</button></div>))}</div><div style={{marginTop:16,padding:14,background:"#fffbeb",border:"1px solid #fde68a",borderRadius:10,fontSize:12,color:"#92400e"}}>Cards: 4111 1111 1111 1111 | 4000 0000 0000 0002 | 12/29 CVV 123</div></div>}
    {step===4&&<div style={{ background:"white",borderRadius:16,padding:24,border:"1px solid "+B }}><div style={{ fontWeight:800,marginBottom:16 }}>{t("setup.reviewSubmit")}</div>{[{l:"Business",v:d.business.business_name||"--"},{l:"Email",v:d.business.email||"--"},{l:"Owner",v:(d.owner.first_name||"")+" "+(d.owner.last_name||"")},{l:"Bank",v:(d.bank.bank_name||"--")+" ..."+(d.bank.account_number||"").slice(-4)},{l:"Tests",v:Object.values(tests).filter(Boolean).length+"/3"}].map(r=>(<div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid "+B,fontSize:13}}><span style={{color:M}}>{r.l}</span><span style={{fontWeight:600}}>{r.v}</span></div>))}{submitError&&<div style={{marginTop:12,padding:"10px 14px",borderRadius:8,background:"rgba(220,38,38,0.08)",color:"#DC2626",fontSize:13,fontWeight:600}}>{submitError}</div>}<button onClick={submit} disabled={sub} style={{marginTop:20,width:"100%",padding:14,borderRadius:12,border:"none",background:sub?"#94A3B8":G,color:"#fff",fontSize:15,fontWeight:800,cursor:"pointer"}}>{sub?t("setup.submitting"):t("setup.submitForApproval")}</button></div>}
    <div style={{ display:"flex",justifyContent:"space-between",marginTop:20 }}>{step>0?<button onClick={()=>setStep(s=>s-1)} style={{padding:"12px 24px",borderRadius:10,border:"1px solid "+B,background:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>{t("common.back")}</button>:<div/>}{step<4?<button onClick={async()=>{const sec=["business","owner","bank","tests"];await save(sec[step]);setStep(s=>s+1)}} style={{padding:"12px 32px",borderRadius:10,border:"none",background:G,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>{t("common.continue")}</button>:null}</div>
  </div>);
}

export function OnboardingStatus({ accountId, onGoLive }: { accountId: string; onGoLive: () => void }) {
  const { t } = useT();
  const [status, setStatus] = useState<Record<string,unknown>|null>(null);
  const [going, setGoing] = useState(false);
  const [error, setError] = useState("");

  const fetchStatus = () => { fetch("/api/zenipay/onboarding/status?merchant_id="+accountId).then(r=>r.json()).then(setStatus).catch(()=>{}); };
  useEffect(() => { fetchStatus(); const iv = setInterval(fetchStatus, 15000); return () => clearInterval(iv); }, [accountId]);

  const st = (status?.onboarding_state as string) || "pending";
  const prog = (status?.setup_progress as Record<string,boolean>) || {};
  const cs: Record<string,{bg:string;fg:string;label:string;desc:string}> = {
    pending:{bg:"#F3F4F6",fg:"#6B7280",label:"PENDING",desc:"Complete the Setup wizard to submit your application."},
    provisioning:{bg:"#FEF3C7",fg:"#D97706",label:"PROVISIONING",desc:"Your application is being reviewed by Finix. This typically takes 1-2 business days."},
    approved:{bg:"#D1FAE5",fg:"#059669",label:"APPROVED",desc:"Congratulations! You're approved. Switch to Live to start accepting real payments."},
    rejected:{bg:"#FEE2E2",fg:"#DC2626",label:"REJECTED",desc:"Your application was not approved. Please contact support@zenipay.ca for details."},
  };
  const sc = cs[st] || cs.pending;

  const handleGoLive = async () => {
    setGoing(true); setError("");
    try {
      const r = await fetch("/api/zenipay/onboarding/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ merchant_id: accountId, action: "go_live" }) });
      const j = await r.json();
      if (j.success) { onGoLive(); } else { setError(j.error || "Failed to switch to live"); }
    } catch { setError("Network error"); } finally { setGoing(false); }
  };

  return (<div style={{ maxWidth:600,margin:"0 auto" }}>
    <div style={{ textAlign:"center",padding:"40px 24px",background:"white",borderRadius:20,border:"1px solid "+B,marginBottom:24 }}>
      <div style={{ display:"inline-block",padding:"12px 32px",borderRadius:16,background:sc.bg,color:sc.fg,fontSize:24,fontWeight:900,marginBottom:16 }}>{sc.label}</div>
      <div style={{ fontSize:15,color:M,lineHeight:1.6,maxWidth:400,margin:"0 auto" }}>{sc.desc}</div>
      {st==="provisioning"&&<div style={{marginTop:16,fontSize:12,color:"#D97706"}}>Auto-refreshing every 15 seconds...</div>}
      {st==="approved"&&<button onClick={handleGoLive} disabled={going} style={{marginTop:20,padding:"14px 32px",borderRadius:12,border:"none",background:going?"#94A3B8":G,color:"#fff",fontSize:15,fontWeight:800,cursor:"pointer"}}>{going?t("setup.activating"):t("setup.switchToLive")}</button>}
      {error&&<div style={{marginTop:12,color:"#DC2626",fontSize:13}}>{error}</div>}
    </div>
    <div style={{ background:"white",borderRadius:16,padding:24,border:"1px solid "+B }}>
      <div style={{ fontWeight:800,marginBottom:16 }}>{t("setup.onboardingChecklist")}</div>
      {[{k:"business",l:"Business Verification"},{k:"owner",l:"Owner KYC"},{k:"bank",l:"Bank Account"},{k:"tests",l:"Sandbox Tests"},{k:"submitted",l:"Application Submitted"}].map(i=>(<div key={i.k} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 0",borderBottom:"1px solid "+B}}><span style={{fontSize:18}}>{prog[i.k]?"✅":"⬜"}</span><span style={{fontSize:14,fontWeight:prog[i.k]?700:400,color:prog[i.k]?TX:M}}>{i.l}</span></div>))}
    </div>
    {status?.finix_merchant_id ? <div style={{ marginTop:16, background:"white",borderRadius:16,padding:24,border:"1px solid "+B }}>
      <div style={{ fontWeight:800,marginBottom:12 }}>Finix Details</div>
      <div style={{ fontSize:12,color:M }}><span style={{fontWeight:700}}>Identity:</span> {String(status.finix_identity_id || "—")}</div>
      <div style={{ fontSize:12,color:M,marginTop:6 }}><span style={{fontWeight:700}}>Merchant:</span> {String(status.finix_merchant_id)}</div>
    </div> : null}
  </div>);
}
