"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const ZP_GRAD = "linear-gradient(90deg, #2DBE60 0%, #15B8C9 45%, #7B4FBF 100%)";
const DARK = "#0B1B4D";

const SANDBOX_CREDS = {
  admin:  { email: "admin@zenipay.ca",  password: "admin2026"  },
  client: { email: "client@zenipay.ca", password: "client2026" },
};

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole]     = useState<"admin"|"client">("admin");
  const [email, setEmail]   = useState("");
  const [pw, setPw]         = useState("");
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    const cred = SANDBOX_CREDS[role];
    if (email === cred.email && pw === cred.password) {
      setTimeout(() => router.push(`/app?role=${role}`), 600);
    } else {
      setLoading(false);
      setError(`Credentials incorrect. Use: ${cred.email} / ${role === "admin" ? "admin2026" : "client2026"}`);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(170deg,#080C1A 0%,#0B1740 45%,#0F1F5C 100%)", display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"'Inter',system-ui,sans-serif" }}>
      <div style={{ width:"100%", maxWidth:420 }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <img src="/zenipay-logo.png" alt="ZeniPay" style={{ width:72, height:72, objectFit:"contain", marginBottom:16, filter:"drop-shadow(0 4px 20px rgba(45,190,96,0.6))" }} />
          <div style={{ fontSize:28, fontWeight:900, background:ZP_GRAD, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>ZeniPay</div>
          <p style={{ color:"rgba(255,255,255,0.35)", fontSize:14, marginTop:6 }}>Payment Infrastructure Platform</p>
        </div>

        <div style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:24, padding:"32px 32px", backdropFilter:"blur(20px)" }}>
          {/* Role toggle */}
          <div style={{ display:"flex", background:"rgba(255,255,255,0.06)", borderRadius:12, padding:4, marginBottom:28, gap:4 }}>
            {(["admin","client"] as const).map(r => (
              <button key={r} onClick={()=>setRole(r)} style={{ flex:1, padding:"9px 0", borderRadius:8, border:"none", cursor:"pointer", fontSize:13, fontWeight:700,
                background: role===r ? ZP_GRAD : "transparent",
                color: role===r ? "#fff" : "rgba(255,255,255,0.4)",
                transition:"all 0.2s",
              }}>
                {r==="admin" ? "⚙️ Admin ZeniPay" : "👤 Client (Zeniva Travel)"}
              </button>
            ))}
          </div>

          <form onSubmit={login}>
            {["email","password"].map(f => (
              <div key={f} style={{ marginBottom:16 }}>
                <label style={{ fontSize:11, color:"rgba(255,255,255,0.5)", fontWeight:700, display:"block", marginBottom:7, letterSpacing:"0.08em" }}>
                  {f.toUpperCase()}
                </label>
                {f==="email"
                  ? <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@zenipay.ca" style={{ width:"100%", padding:"12px 14px", borderRadius:10, background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", color:"#fff", fontSize:14, outline:"none", boxSizing:"border-box" }} />
                  : <input type="password" value={pw} onChange={e=>setPw(e.target.value)} required placeholder="••••••••" style={{ width:"100%", padding:"12px 14px", borderRadius:10, background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", color:"#fff", fontSize:14, outline:"none", boxSizing:"border-box" }} />
                }
              </div>
            ))}

            {error && <div style={{ marginBottom:16, padding:"10px 14px", borderRadius:10, background:"rgba(245,166,35,0.1)", border:"1px solid rgba(245,166,35,0.3)", color:"#F5A623", fontSize:13 }}>{error}</div>}

            <button type="submit" disabled={loading} style={{ width:"100%", padding:14, marginTop:8, borderRadius:12, background:loading?"rgba(255,255,255,0.1)":ZP_GRAD, color:"#fff", border:"none", fontSize:15, fontWeight:800, cursor:loading?"not-allowed":"pointer" }}>
              {loading ? "Connexion…" : role==="admin" ? "Admin Access →" : "Client Access →"}
            </button>
          </form>

          {/* Helper */}
          <div style={{ marginTop:20, padding:"12px 14px", borderRadius:12, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", fontSize:12 }}>
            <div style={{ color:"rgba(255,255,255,0.5)", marginBottom:6 }}>Sandbox credentials</div>
            <div style={{ color:"rgba(255,255,255,0.7)", lineHeight:1.7 }}>
              Admin: <code style={{color:"#2DBE60"}}>admin@zenipay.ca</code> / <code style={{color:"#2DBE60"}}>admin2026</code><br/>
              Client: <code style={{color:"#15B8C9"}}>client@zenipay.ca</code> / <code style={{color:"#15B8C9"}}>client2026</code>
            </div>
          </div>
        </div>

        <p style={{ textAlign:"center", marginTop:24, color:"rgba(255,255,255,0.2)", fontSize:12 }}>
          © 2026 ZeniPay · <a href="/" style={{ color:"rgba(255,255,255,0.3)", textDecoration:"none" }}>Home</a>
        </p>
      </div>
    </div>
  );
}
