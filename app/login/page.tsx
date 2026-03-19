"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const ZP_GRAD = "linear-gradient(90deg, #2DBE60 0%, #15B8C9 45%, #7B4FBF 100%)";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const login = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    setTimeout(() => {
      if (email === "client@zenipay.ca" && pw === "client2026") {
        sessionStorage.setItem("zp_client", "zeniva");
        router.replace("/app");
      } else {
        setLoading(false);
        setError("Invalid credentials · client@zenipay.ca / client2026");
      }
    }, 500);
  };

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(170deg,#060B18 0%,#0A1530 55%,#0D1A40 100%)", display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"'Inter',system-ui,sans-serif" }}>
      <div style={{ width:"100%", maxWidth:420 }}>

        <div style={{ textAlign:"center", marginBottom:40 }}>
          <img src="/zenipay-logo.png" alt="ZeniPay" style={{ width:72, height:72, objectFit:"contain", marginBottom:14, filter:"drop-shadow(0 4px 24px rgba(45,190,96,0.6))" }} />
          <div style={{ fontWeight:900, fontSize:28, background:ZP_GRAD, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>ZeniPay</div>
          <p style={{ color:"rgba(255,255,255,0.35)", fontSize:14, marginTop:6 }}>Client Portal — Live Mode</p>
        </div>

        <div style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:22, padding:"32px 32px", backdropFilter:"blur(20px)" }}>
          <form onSubmit={login}>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:11, color:"rgba(255,255,255,0.45)", fontWeight:700, display:"block", marginBottom:7, letterSpacing:"0.08em" }}>EMAIL</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="client@zenipay.ca"
                style={{ width:"100%", padding:"13px 15px", borderRadius:10, background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", color:"#fff", fontSize:14, outline:"none", boxSizing:"border-box" }} />
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:11, color:"rgba(255,255,255,0.45)", fontWeight:700, display:"block", marginBottom:7, letterSpacing:"0.08em" }}>PASSWORD</label>
              <input type="password" value={pw} onChange={e=>setPw(e.target.value)} required placeholder="••••••••"
                style={{ width:"100%", padding:"13px 15px", borderRadius:10, background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", color:"#fff", fontSize:14, outline:"none", boxSizing:"border-box" }} />
            </div>
            {error && <div style={{ marginBottom:16, padding:"10px 14px", borderRadius:10, background:"rgba(245,166,35,0.1)", border:"1px solid rgba(245,166,35,0.3)", color:"#F5A623", fontSize:13 }}>{error}</div>}
            <button type="submit" disabled={loading} style={{ width:"100%", padding:14, borderRadius:12, background:loading?"rgba(255,255,255,0.1)":ZP_GRAD, color:"#fff", border:"none", fontSize:15, fontWeight:800, cursor:loading?"not-allowed":"pointer" }}>
              {loading ? "Connexion…" : "Sign In →"}
            </button>
          </form>

          <div style={{ marginTop:20, padding:"12px 14px", borderRadius:12, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", fontSize:12 }}>
            <div style={{ color:"rgba(255,255,255,0.4)", marginBottom:4 }}>Demo access (Zeniva Travel)</div>
            <div style={{ color:"rgba(255,255,255,0.7)", lineHeight:1.7 }}>
              <code style={{color:"#15B8C9"}}>client@zenipay.ca</code> / <code style={{color:"#15B8C9"}}>client2026</code>
            </div>
          </div>
        </div>

        <p style={{ textAlign:"center", marginTop:24, color:"rgba(255,255,255,0.2)", fontSize:12 }}>
          <a href="/" style={{ color:"rgba(255,255,255,0.3)", textDecoration:"none" }}>← Home</a>
          <span style={{ margin:"0 12px" }}>·</span>
          <a href="/admin/login" style={{ color:"rgba(255,255,255,0.2)", textDecoration:"none" }}>Admin</a>
        </p>
      </div>
    </div>
  );
}
