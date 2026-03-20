"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ZeniPayLogo from "@/components/ZeniPayLogo";

const ZP_GRAD  = "linear-gradient(135deg, #2DBE60 0%, #15B8C9 45%, #7B4FBF 100%)";
const ZP_DARK  = "linear-gradient(150deg, #0d1633 0%, #1a2a5e 50%, #0f2040 100%)";

function formatCard(v: string) {
  return v.replace(/\D/g,"").slice(0,16).replace(/(.{4})/g,"$1 ").trim();
}
function cardType(v: string) {
  const n = v.replace(/\D/g,"");
  if (n.startsWith("4")) return "visa";
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return "mastercard";
  if (/^3[47]/.test(n)) return "amex";
  return "generic";
}
function fmtMoney(cents: number, cur = "CAD") {
  return new Intl.NumberFormat("en-CA", { style:"currency", currency: cur }).format(cents / 100);
}

function PayPageContent() {
  const params = useSearchParams();
  const title    = params.get("t")    || "Payment";
  const amountRaw= Number(params.get("a") || "0");   // cents
  const merchant = params.get("m")    || "Merchant";
  const apiKey   = params.get("k")    || "";
  const currency = (params.get("c")   || "CAD").toUpperCase();
  const desc     = params.get("d")    || "";

  const [cardNum,  setCardNum]  = useState("");
  const [name,     setName]     = useState("");
  const [expiry,   setExpiry]   = useState("");
  const [cvc,      setCvc]      = useState("");
  const [focused,  setFocused]  = useState<"card"|"name"|"expiry"|"cvc"|null>(null);
  const [flipped,  setFlipped]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [error,    setError]    = useState("");
  const [particles,setParticles]= useState<{x:number;y:number;c:string;r:number;vx:number;vy:number;a:number}[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);

  const ct = cardType(cardNum);

  // Confetti on success
  useEffect(() => {
    if (!success) return;
    const cols = ["#2DBE60","#15B8C9","#7B4FBF","#F5A623","#fff"];
    setParticles(Array.from({length:80},()=>({
      x: Math.random()*window.innerWidth,
      y: -20,
      c: cols[Math.floor(Math.random()*cols.length)],
      r: 4+Math.random()*6,
      vx: (Math.random()-0.5)*4,
      vy: 3+Math.random()*4,
      a: 1,
    })));
  },[success]);

  useEffect(() => {
    if (!success || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext("2d")!;
    let pts = [...particles];
    const tick = () => {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      pts = pts.map(p=>({...p,x:p.x+p.vx,y:p.y+p.vy,vy:p.vy+0.1,a:p.a-0.008})).filter(p=>p.a>0);
      pts.forEach(p=>{ ctx.globalAlpha=p.a; ctx.fillStyle=p.c; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); });
      ctx.globalAlpha=1;
      if (pts.length>0) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(rafRef.current);
  },[particles,success]);

  const pay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || cardNum.replace(/\s/g,"").length < 13 || expiry.length < 5 || cvc.length < 3) {
      setError("Please fill in all card details."); return;
    }
    setError(""); setLoading(true);
    setTimeout(()=>{ setLoading(false); setSuccess(true); }, 1800);
  };

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  if (success) return (
    <div style={{ minHeight:"100vh", background: ZP_DARK, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:24, padding:24, position:"relative", overflow:"hidden" }}>
      <canvas ref={canvasRef} style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:10 }} />
      {/* Glow blobs */}
      <div style={{ position:"absolute",top:-100,left:-100,width:400,height:400,borderRadius:"50%",background:"rgba(45,190,96,0.12)",filter:"blur(80px)" }} />
      <div style={{ position:"absolute",bottom:-80,right:-80,width:350,height:350,borderRadius:"50%",background:"rgba(21,184,201,0.1)",filter:"blur(70px)" }} />
      <div style={{ textAlign:"center", zIndex:2, maxWidth:480, width:"100%" }}>
        <div style={{ width:96,height:96,borderRadius:"50%",background:"linear-gradient(135deg,#2DBE60,#15B8C9)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 24px",boxShadow:"0 0 0 16px rgba(45,190,96,0.12), 0 0 0 32px rgba(45,190,96,0.06)",animation:"pop 0.4s ease-out" }}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div style={{ fontSize:32,fontWeight:900,color:"#fff",marginBottom:8,letterSpacing:"-0.5px" }}>Payment Successful!</div>
        <div style={{ fontSize:18,color:"rgba(255,255,255,0.6)",marginBottom:28 }}>
          {fmtMoney(amountRaw,currency)} paid to <strong style={{color:"#fff"}}>{merchant}</strong>
        </div>
        <div style={{ background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:20,padding:"24px 28px",textAlign:"left",marginBottom:28,backdropFilter:"blur(12px)" }}>
          <div style={{ fontSize:11,color:"rgba(255,255,255,0.4)",fontWeight:700,letterSpacing:"0.08em",marginBottom:16 }}>RECEIPT</div>
          {[["Description", title],["Amount", fmtMoney(amountRaw,currency)],["Card", `•••• •••• •••• ${cardNum.replace(/\s/g,"").slice(-4)}`],["Date", new Date().toLocaleDateString("en-CA",{month:"long",day:"numeric",year:"numeric"})],["Reference", "ZP-"+Math.random().toString(36).slice(2,10).toUpperCase()]].map(([l,v])=>(
            <div key={l} style={{ display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.06)",fontSize:13 }}>
              <span style={{ color:"rgba(255,255,255,0.5)" }}>{l}</span>
              <span style={{ color:"#fff",fontWeight:600 }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:8,color:"rgba(255,255,255,0.4)",fontSize:12 }}>
          <ZeniPayLogo size={18} />
          <span>Secured &amp; processed by <strong style={{color:"rgba(255,255,255,0.7)"}}>ZeniPay</strong></span>
        </div>
      </div>
      <style>{`@keyframes pop{from{transform:scale(0.6);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
    </div>
  );

  const cardDisplayNum = cardNum || "•••• •••• •••• ••••";
  const cardDisplayName = name || "YOUR NAME";
  const cardDisplayExp  = expiry || "MM/YY";

  return (
    <div style={{ minHeight:"100vh", background:"#f0f4f8", fontFamily:"'Inter',system-ui,sans-serif", display:"flex", flexDirection:"column" }}>
      {/* Top bar */}
      <div style={{ background:"#fff", borderBottom:"1px solid #E2E8F0", padding:"0 5%", height:56, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky",top:0,zIndex:100,boxShadow:"0 1px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <ZeniPayLogo size={28} />
          <span style={{ fontWeight:900,fontSize:17,background:ZP_GRAD,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>ZeniPay</span>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:6,color:"#64748B",fontSize:12,fontWeight:600 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="#2DBE60" strokeWidth="2"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="#2DBE60" strokeWidth="2"/></svg>
          256-bit SSL encrypted
        </div>
      </div>

      <div style={{ flex:1,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"32px 16px 48px",gap:32,maxWidth:960,margin:"0 auto",width:"100%",flexWrap:"wrap" as const }}>

        {/* Left — Order summary */}
        <div style={{ flex:"1 1 320px",maxWidth:400 }}>
          {/* Merchant card */}
          <div style={{ background: ZP_DARK, borderRadius:24, padding:"28px 28px 24px", color:"#fff", marginBottom:16, position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute",top:-60,right:-60,width:200,height:200,borderRadius:"50%",background:"rgba(21,184,201,0.08)",filter:"blur(40px)" }} />
            <div style={{ position:"absolute",bottom:-40,left:-40,width:160,height:160,borderRadius:"50%",background:"rgba(45,190,96,0.06)",filter:"blur(40px)" }} />
            <div style={{ fontSize:11,color:"rgba(255,255,255,0.4)",fontWeight:700,letterSpacing:"0.1em",marginBottom:12,textTransform:"uppercase" as const }}>Requesting Payment</div>
            <div style={{ fontSize:22,fontWeight:900,marginBottom:4,zIndex:1,position:"relative" as const }}>{merchant}</div>
            {apiKey && <div style={{ fontSize:11,color:"rgba(255,255,255,0.35)",marginBottom:20,fontFamily:"monospace" }}>{apiKey.slice(0,20)}…</div>}
            <div style={{ background:"rgba(255,255,255,0.06)",borderRadius:16,padding:"16px 20px",border:"1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ fontSize:13,color:"rgba(255,255,255,0.6)",marginBottom:4 }}>{title}</div>
              {desc && <div style={{ fontSize:11,color:"rgba(255,255,255,0.35)",marginBottom:12 }}>{desc}</div>}
              <div style={{ fontSize:36,fontWeight:900,background:ZP_GRAD,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:"-1px" }}>
                {fmtMoney(amountRaw,currency)}
              </div>
              <div style={{ fontSize:12,color:"rgba(255,255,255,0.4)",marginTop:2 }}>{currency}</div>
            </div>
          </div>

          {/* Trust badges */}
          <div style={{ display:"flex",gap:10,flexWrap:"wrap" as const }}>
            {[["🔒","SSL Encrypted"],["🛡","Fraud Protected"],["⚡","Instant Confirm"]].map(([i,l])=>(
              <div key={l} style={{ flex:"1 1 100px",background:"#fff",border:"1px solid #E2E8F0",borderRadius:12,padding:"10px 12px",display:"flex",alignItems:"center",gap:8,boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
                <span style={{ fontSize:18 }}>{i}</span>
                <span style={{ fontSize:11,fontWeight:600,color:"#475569" }}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Checkout form */}
        <div style={{ flex:"1 1 340px",maxWidth:440 }}>
          {/* 3-D card preview */}
          <div style={{ perspective:1000,marginBottom:24,height:180 }}>
            <div style={{ position:"relative",width:"100%",height:"100%",transformStyle:"preserve-3d",transition:"transform 0.6s",transform:flipped?"rotateY(180deg)":"rotateY(0deg)" }}>
              {/* Front */}
              <div style={{ position:"absolute",inset:0,backfaceVisibility:"hidden",borderRadius:20,padding:"24px 28px",background:`linear-gradient(135deg,#0d1633 0%,#1a2a5e 40%,${ct==="visa"?"#1a56c5":ct==="mastercard"?"#C41E3A":ct==="amex"?"#007BC1":"#2DBE60"} 100%)`,color:"#fff",boxShadow:"0 20px 60px rgba(0,0,0,0.3)",overflow:"hidden" }}>
                <div style={{ position:"absolute",top:-40,right:-40,width:180,height:180,borderRadius:"50%",border:"1px solid rgba(255,255,255,0.08)" }} />
                <div style={{ position:"absolute",top:-20,right:-20,width:140,height:140,borderRadius:"50%",border:"1px solid rgba(255,255,255,0.05)" }} />
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20 }}>
                  {/* EMV chip */}
                  <div style={{ width:40,height:30,borderRadius:6,background:"linear-gradient(135deg,#d4af37,#ffd700,#b8860b)",border:"1px solid rgba(255,255,255,0.3)",display:"flex",flexDirection:"column" as const,justifyContent:"center",padding:"4px 6px",gap:3 }}>
                    {[0,1,2].map(i=><div key={i} style={{ height:3,background:"rgba(0,0,0,0.25)",borderRadius:2 }} />)}
                  </div>
                  {/* Card brand */}
                  {ct==="visa" && <div style={{ fontSize:22,fontWeight:900,fontStyle:"italic",letterSpacing:"-1px",color:"#fff",textShadow:"0 1px 4px rgba(0,0,0,0.4)" }}>VISA</div>}
                  {ct==="mastercard" && (
                    <div style={{ display:"flex",gap:-8 }}>
                      <div style={{ width:28,height:28,borderRadius:"50%",background:"#EB001B",opacity:0.9 }} />
                      <div style={{ width:28,height:28,borderRadius:"50%",background:"#F79E1B",opacity:0.9,marginLeft:-10 }} />
                    </div>
                  )}
                  {ct==="amex"    && <div style={{ fontSize:11,fontWeight:900,color:"#7EC8E3",letterSpacing:"0.1em" }}>AMERICAN EXPRESS</div>}
                  {ct==="generic" && <div style={{ width:32,height:32,borderRadius:8,background:ZP_GRAD,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:14 }}>Z</div>}
                </div>
                <div style={{ fontSize:17,letterSpacing:"0.18em",fontFamily:"'Courier New',monospace",fontWeight:600,marginBottom:14,textShadow:"0 1px 3px rgba(0,0,0,0.3)",color:focused==="card"?"#15B8C9":"#fff",transition:"color 0.2s" }}>
                  {cardDisplayNum}
                </div>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-end" }}>
                  <div>
                    <div style={{ fontSize:9,color:"rgba(255,255,255,0.5)",letterSpacing:"0.1em",marginBottom:3 }}>CARD HOLDER</div>
                    <div style={{ fontSize:13,fontWeight:700,letterSpacing:"0.05em",color:focused==="name"?"#15B8C9":"#fff",transition:"color 0.2s" }}>{cardDisplayName}</div>
                  </div>
                  <div style={{ textAlign:"right" as const }}>
                    <div style={{ fontSize:9,color:"rgba(255,255,255,0.5)",letterSpacing:"0.1em",marginBottom:3 }}>EXPIRES</div>
                    <div style={{ fontSize:13,fontWeight:700,color:focused==="expiry"?"#15B8C9":"#fff",transition:"color 0.2s" }}>{cardDisplayExp}</div>
                  </div>
                </div>
              </div>
              {/* Back */}
              <div style={{ position:"absolute",inset:0,backfaceVisibility:"hidden",transform:"rotateY(180deg)",borderRadius:20,background:"linear-gradient(135deg,#1a2a5e,#0d1633)",boxShadow:"0 20px 60px rgba(0,0,0,0.3)",overflow:"hidden" }}>
                <div style={{ background:"rgba(0,0,0,0.4)",height:44,marginTop:24,marginBottom:20 }} />
                <div style={{ padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"flex-end",gap:12 }}>
                  <div style={{ flex:1,height:36,background:"rgba(255,255,255,0.07)",borderRadius:6 }} />
                  <div style={{ background:"#fff",borderRadius:8,padding:"8px 16px",minWidth:54,textAlign:"center" as const }}>
                    <div style={{ fontSize:9,color:"#64748B",marginBottom:2 }}>CVV</div>
                    <div style={{ fontSize:13,fontWeight:700,color:"#0d1633",letterSpacing:"0.15em" }}>{cvc||"•••"}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={pay} style={{ background:"#fff",borderRadius:24,padding:"28px 24px",boxShadow:"0 4px 32px rgba(0,0,0,0.08)",border:"1px solid #E2E8F0" }}>
            <div style={{ fontSize:15,fontWeight:800,color:"#0D1B3A",marginBottom:20 }}>Card Details</div>

            {/* Card number */}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:11,color:"#64748B",fontWeight:700,display:"block",marginBottom:6,letterSpacing:"0.07em" }}>CARD NUMBER</label>
              <div style={{ position:"relative" }}>
                <input value={cardNum} onChange={e=>setCardNum(formatCard(e.target.value))} onFocus={()=>setFocused("card")} onBlur={()=>setFocused(null)}
                  placeholder="1234 5678 9012 3456" autoComplete="cc-number" inputMode="numeric"
                  style={{ width:"100%",padding:"13px 44px 13px 14px",borderRadius:12,border:`1.5px solid ${focused==="card"?"#15B8C9":"#E2E8F0"}`,fontSize:15,fontFamily:"'Courier New',monospace",color:"#0D1B3A",outline:"none",boxSizing:"border-box" as const,transition:"border-color 0.15s",background:"#F8FAFC",letterSpacing:"0.05em" }} />
                <div style={{ position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",fontSize:18 }}>
                  {ct==="visa"&&"💳"}{ct==="mastercard"&&"🔴"}{ct==="amex"&&"💙"}{ct==="generic"&&"💳"}
                </div>
              </div>
            </div>

            {/* Name */}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:11,color:"#64748B",fontWeight:700,display:"block",marginBottom:6,letterSpacing:"0.07em" }}>CARDHOLDER NAME</label>
              <input value={name} onChange={e=>setName(e.target.value.toUpperCase())} onFocus={()=>setFocused("name")} onBlur={()=>setFocused(null)}
                placeholder="FIRST LAST" autoComplete="cc-name"
                style={{ width:"100%",padding:"13px 14px",borderRadius:12,border:`1.5px solid ${focused==="name"?"#15B8C9":"#E2E8F0"}`,fontSize:14,color:"#0D1B3A",outline:"none",boxSizing:"border-box" as const,transition:"border-color 0.15s",background:"#F8FAFC",fontFamily:"inherit",letterSpacing:"0.04em" }} />
            </div>

            {/* Expiry + CVC */}
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20 }}>
              <div>
                <label style={{ fontSize:11,color:"#64748B",fontWeight:700,display:"block",marginBottom:6,letterSpacing:"0.07em" }}>EXPIRY DATE</label>
                <input value={expiry} onChange={e=>{ const v=e.target.value.replace(/\D/g,"").slice(0,4); setExpiry(v.length>2?v.slice(0,2)+"/"+v.slice(2):v); }} onFocus={()=>setFocused("expiry")} onBlur={()=>setFocused(null)}
                  placeholder="MM/YY" autoComplete="cc-exp" inputMode="numeric"
                  style={{ width:"100%",padding:"13px 14px",borderRadius:12,border:`1.5px solid ${focused==="expiry"?"#15B8C9":"#E2E8F0"}`,fontSize:14,color:"#0D1B3A",outline:"none",boxSizing:"border-box" as const,transition:"border-color 0.15s",background:"#F8FAFC",fontFamily:"monospace",letterSpacing:"0.08em" }} />
              </div>
              <div>
                <label style={{ fontSize:11,color:"#64748B",fontWeight:700,display:"block",marginBottom:6,letterSpacing:"0.07em" }}>CVC / CVV</label>
                <input value={cvc} onChange={e=>setCvc(e.target.value.replace(/\D/g,"").slice(0,4))} onFocus={()=>{ setFocused("cvc"); setFlipped(true); }} onBlur={()=>{ setFocused(null); setFlipped(false); }}
                  placeholder="•••" autoComplete="cc-csc" inputMode="numeric"
                  style={{ width:"100%",padding:"13px 14px",borderRadius:12,border:`1.5px solid ${focused==="cvc"?"#15B8C9":"#E2E8F0"}`,fontSize:14,color:"#0D1B3A",outline:"none",boxSizing:"border-box" as const,transition:"border-color 0.15s",background:"#F8FAFC",fontFamily:"monospace",letterSpacing:"0.15em" }} />
              </div>
            </div>

            {error && (
              <div style={{ marginBottom:16,padding:"10px 14px",borderRadius:10,background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.2)",color:"#DC2626",fontSize:13 }}>{error}</div>
            )}

            <button type="submit" disabled={loading} style={{ width:"100%",padding:16,borderRadius:14,background:loading?"#E2E8F0":ZP_GRAD,color:loading?"#94A3B8":"#fff",border:"none",fontSize:16,fontWeight:900,cursor:loading?"not-allowed":"pointer",boxShadow:loading?"none":"0 6px 24px rgba(21,184,201,0.3)",transition:"all 0.2s",letterSpacing:"-0.2px" }}>
              {loading
                ? <span style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:10 }}>
                    <span style={{ display:"inline-block",width:16,height:16,border:"2px solid #94A3B8",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.7s linear infinite" }} />
                    Processing…
                  </span>
                : `Pay ${fmtMoney(amountRaw,currency)} →`
              }
            </button>

            <div style={{ textAlign:"center" as const,marginTop:16,display:"flex",alignItems:"center",justifyContent:"center",gap:6,color:"#94A3B8",fontSize:12 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="#94A3B8" strokeWidth="2"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="#94A3B8" strokeWidth="2"/></svg>
              Secured by ZeniPay · SSL encrypted · PCI compliant
            </div>
          </form>
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export default function PayPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight:"100vh",background:"#0d1633",display:"flex",alignItems:"center",justifyContent:"center" }}>
        <div style={{ width:36,height:36,border:"3px solid #15B8C9",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <PayPageContent />
    </Suspense>
  );
}
