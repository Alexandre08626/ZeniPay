"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const ZP_GRAD = "linear-gradient(90deg, #2DBE60 0%, #15B8C9 45%, #7B4FBF 100%)";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const login = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    setTimeout(() => {
      if (email === "admin@zenipay.ca" && pw === "admin2026") {
        sessionStorage.setItem("zp_admin", "1");
        router.replace("/admin");
      } else {
        setLoading(false);
        setError("Invalid credentials");
      }
    }, 500);
  };

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(170deg,#060B18 0%,#0A1530 55%,#0D1A40 100%)", display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"'Inter',system-ui,sans-serif" }}>
      <div style={{ width:"100%", maxWidth:400 }}>
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <img src="/zenipay-logo.png" alt="ZeniPay" style={{ width:64, height:64, objectFit:"contain", marginBottom:12, filter:"drop-shadow(0 4px 20px rgba(45,190,96,0.5))" }} />
          <div style={{ fontWeight:900, fontSize:24, background:ZP_GRAD, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>ZeniPay Admin</div>
          <p style={{ color:"rgba(255,255,255,0.3)", fontSize:13, marginTop:6 }}>Platform management console</p>
        </div>

        <div style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:20, padding:"28px 28px" }}>
          <form onSubmit={login}>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:11, color:"rgba(255,255,255,0.45)", fontWeight:700, display:"block", marginBottom:7, letterSpacing:"0.08em" }}>EMAIL</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="admin@zenipay.ca"
                style={{ width:"100%", padding:"12px 14px", borderRadius:10, background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", color:"#fff", fontSize:14, outline:"none", boxSizing:"border-box" }} />
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:11, color:"rgba(255,255,255,0.45)", fontWeight:700, display:"block", marginBottom:7, letterSpacing:"0.08em" }}>PASSWORD</label>
              <input type="password" value={pw} onChange={e=>setPw(e.target.value)} required placeholder="••••••••"
                style={{ width:"100%", padding:"12px 14px", borderRadius:10, background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", color:"#fff", fontSize:14, outline:"none", boxSizing:"border-box" }} />
            </div>
            {error && <div style={{ marginBottom:16, padding:"10px 14px", borderRadius:10, background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", color:"#EF4444", fontSize:13 }}>{error}</div>}
            <button type="submit" disabled={loading} style={{ width:"100%", padding:13, borderRadius:11, background:loading?"rgba(255,255,255,0.1)":ZP_GRAD, color:"#fff", border:"none", fontSize:14, fontWeight:800, cursor:loading?"not-allowed":"pointer" }}>
              {loading ? "Logging in…" : "Admin Access →"}
            </button>
          </form>
          <div style={{ marginTop:16, textAlign:"center", fontSize:12, color:"rgba(255,255,255,0.25)" }}>
            admin@zenipay.ca · admin2026
          </div>
        </div>
        <p style={{ textAlign:"center", marginTop:20, color:"rgba(255,255,255,0.2)", fontSize:12 }}>
          <a href="/login" style={{ color:"rgba(255,255,255,0.3)", textDecoration:"none" }}>← Client Login</a>
        </p>
      </div>
    </div>
  );
}
