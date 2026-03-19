"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

// ─── Brand ─────────────────────────────────────────────────────────────────
const ZP_GREEN  = "#2DBE60";
const ZP_CYAN   = "#15B8C9";
const ZP_PURPLE = "#7B4FBF";
const ZP_BLUE   = "#2A8FE0";
const ZP_GRAD   = "linear-gradient(135deg, #2DBE60 0%, #15B8C9 45%, #7B4FBF 100%)";
const CARD_GRAD = "linear-gradient(135deg, #E5247B 0%, #F5A623 50%, #7B4FBF 100%)";
const DARK      = "#0A0F1E";
const DARK2     = "#111827";
const GLASS     = "rgba(255,255,255,0.06)";
const BORDER    = "rgba(255,255,255,0.10)";

// ─── Types ──────────────────────────────────────────────────────────────────
interface Account {
  id: string; businessName: string; ownerName: string; email: string;
  phone: string; website: string; businessType: string; country: string;
  monthlyVolume: string; status: string; plan: string;
  sandboxKey: string; sandboxSecret: string; liveKey: string;
  createdAt: string; volume: number; txCount: number; balance: number; notes: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(n);

function copyText(text: string, cb: () => void) {
  navigator.clipboard.writeText(text).then(cb).catch(() => {});
}

// ─── ZeniCard Visual ─────────────────────────────────────────────────────────
function ZeniCard({ account, compact }: { account: Account; compact?: boolean }) {
  const [revealed, setRevealed] = useState(false);
  const h = compact ? 140 : 200;
  return (
    <div
      onClick={() => setRevealed(r => !r)}
      style={{
        width: "100%", height: h, borderRadius: compact ? 16 : 22, position: "relative",
        overflow: "hidden", background: CARD_GRAD, cursor: "pointer",
        boxShadow: "0 20px 60px rgba(229,36,123,0.35), 0 8px 24px rgba(0,0,0,0.25)",
        userSelect: "none",
      }}
    >
      <style>{`@keyframes shimCard{0%{transform:translateX(-120%) skewX(-20deg)}100%{transform:translateX(350%) skewX(-20deg)}}`}</style>
      {/* Logo watermark */}
      <img src="/zenipay-logo.png" alt="" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", opacity:0.15, filter:"brightness(2) saturate(0)", mixBlendMode:"overlay", transform:"scale(1.2) rotate(-8deg)" }} />
      {/* Shimmer */}
      <div style={{ position:"absolute", inset:0, background:"linear-gradient(105deg,transparent 35%,rgba(255,255,255,0.2) 50%,transparent 65%)", animation:"shimCard 5s ease-in-out infinite" }} />
      {/* Dark overlay */}
      <div style={{ position:"absolute", inset:0, background:"linear-gradient(160deg,rgba(0,0,0,0.25) 0%,rgba(0,0,0,0.05) 60%,rgba(0,0,0,0.2) 100%)" }} />

      {/* Content */}
      <div style={{ position:"relative", height:"100%", padding: compact ? "14px 18px" : "18px 22px", display:"flex", flexDirection:"column", justifyContent:"space-between", color:"#fff" }}>
        {/* Top */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontWeight:800, fontSize: compact ? 12 : 14, letterSpacing:"-0.2px", textShadow:"0 1px 4px rgba(0,0,0,0.4)" }}>ZeniPay</div>
            <div style={{ fontSize: compact ? 9 : 10, opacity:0.6, letterSpacing:"0.12em", textTransform:"uppercase", marginTop:1 }}>ZeniCard Business</div>
          </div>
          {/* Chip */}
          <div style={{ width: compact ? 28 : 36, height: compact ? 20 : 26, borderRadius:4, background:"linear-gradient(145deg,#c9a84c,#f2d76a,#e5c035)", boxShadow:"0 2px 6px rgba(0,0,0,0.4)", position:"relative" }}>
            <div style={{ position:"absolute", inset:2.5, border:"1px solid rgba(0,0,0,0.15)", borderRadius:2 }} />
            <div style={{ position:"absolute", left:"50%", top:0, bottom:0, width:1, background:"rgba(0,0,0,0.12)", transform:"translateX(-50%)" }} />
          </div>
        </div>
        {/* Balance */}
        {!compact && (
          <div>
            <div style={{ fontSize:10, opacity:0.5, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:3 }}>Available Balance</div>
            <div style={{ fontSize:26, fontWeight:900, letterSpacing:"-1px", textShadow:"0 2px 10px rgba(0,0,0,0.4)" }}>{fmt(account.balance)}</div>
          </div>
        )}
        {/* Bottom */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
          <div>
            <div style={{ fontFamily:"monospace", fontSize: compact ? 11 : 13, letterSpacing:"0.2em", opacity:0.9, textShadow:"0 1px 4px rgba(0,0,0,0.3)", marginBottom: compact ? 2 : 4 }}>
              {revealed ? `4275 9031 6847 4242` : `•••• •••• •••• 4242`}
            </div>
            <div style={{ fontSize: compact ? 9 : 10, opacity:0.55 }}>{account.businessName || "Your Business"}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize: compact ? 9 : 10, opacity:0.55, marginBottom:2 }}>VALID THRU</div>
            <div style={{ fontFamily:"monospace", fontSize: compact ? 11 : 12, fontWeight:700 }}>03/28</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Copy button ─────────────────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => copyText(text, () => { setCopied(true); setTimeout(() => setCopied(false), 1800); })}
      style={{ background:copied ? "rgba(45,190,96,0.15)" : GLASS, border:`1px solid ${copied ? "rgba(45,190,96,0.4)" : BORDER}`, color: copied ? ZP_GREEN : "rgba(255,255,255,0.7)", padding:"5px 12px", borderRadius:8, fontSize:11, fontWeight:700, cursor:"pointer", transition:"all 0.2s", whiteSpace:"nowrap" }}
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

// ─── Bottom Tab Bar ───────────────────────────────────────────────────────────
const TABS = [
  { id:"home",   icon:"⌂",  label:"Home"    },
  { id:"card",   icon:"💳", label:"ZeniCard" },
  { id:"keys",   icon:"🔑", label:"API Keys" },
  { id:"settings",icon:"⚙", label:"Settings" },
];

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function ClientApp() {
  const router = useRouter();
  const [tab, setTab] = useState("home");
  const [account, setAccount] = useState<Account | null>(null);
  const [mode, setMode] = useState<"sandbox" | "live">("sandbox");
  const [menuOpen, setMenuOpen] = useState(false);

  // ── Auth + load account from localStorage ────────────────────────────────
  useEffect(() => {
    const email = sessionStorage.getItem("zp_client_email");
    const m     = sessionStorage.getItem("zp_client_mode") as "sandbox"|"live" || "sandbox";
    const isAdmin = sessionStorage.getItem("zp_admin");

    if (!email && !isAdmin) { router.replace("/login"); return; }
    setMode(m);

    if (email) {
      try {
        const all: Account[] = JSON.parse(localStorage.getItem("zp_accounts") || "[]");
        const found = all.find(a => a.email === email);
        if (found) setAccount(found);
        else {
          // Build a placeholder from session data
          setAccount({
            id:"", businessName:"My Business", ownerName:"", email, phone:"", website:"",
            businessType:"", country:"CA", monthlyVolume:"", status:m, plan:"Sandbox",
            sandboxKey: sessionStorage.getItem("zp_client_sandbox_key") || "",
            sandboxSecret: sessionStorage.getItem("zp_client_sandbox_secret") || "",
            liveKey:"", createdAt:new Date().toISOString(),
            volume:0, txCount:0, balance:0, notes:"",
          });
        }
      } catch {}
    }
  }, [router]);

  const signOut = () => {
    sessionStorage.clear();
    router.replace("/login");
  };

  if (!account) {
    return (
      <div style={{ minHeight:"100vh", background:DARK, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ width:36, height:36, borderRadius:"50%", border:`3px solid ${ZP_CYAN}`, borderTopColor:"transparent", animation:"spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const isSandbox = mode === "sandbox";
  const activeKey = isSandbox ? account.sandboxKey : account.liveKey;

  // ── Header ─────────────────────────────────────────────────────────────────
  const header = (
    <header style={{ position:"fixed", top:0, left:0, right:0, zIndex:200, background:"rgba(10,15,30,0.95)", backdropFilter:"blur(20px)", borderBottom:`1px solid ${BORDER}`, height:60, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 16px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <Image src="/zenipay-logo-nobg.png" alt="ZeniPay" width={110} height={32} style={{ objectFit:"contain" }} />
        <span style={{ padding:"3px 10px", borderRadius:20, fontSize:10, fontWeight:800, letterSpacing:"0.08em", textTransform:"uppercase" as const, background:isSandbox ? "rgba(245,166,35,0.15)" : "rgba(45,190,96,0.15)", color:isSandbox ? "#F5A623" : ZP_GREEN, border:`1px solid ${isSandbox ? "rgba(245,166,35,0.3)" : "rgba(45,190,96,0.3)"}` }}>
          {isSandbox ? "Sandbox" : "● Live"}
        </span>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        {/* Avatar */}
        <div
          onClick={() => setMenuOpen(o => !o)}
          style={{ width:36, height:36, borderRadius:"50%", background:ZP_GRAD, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:14, color:"#fff", cursor:"pointer", flexShrink:0 }}
        >
          {(account.businessName || account.email)[0].toUpperCase()}
        </div>
        {/* Dropdown */}
        {menuOpen && (
          <div style={{ position:"fixed", top:68, right:12, background:DARK2, border:`1px solid ${BORDER}`, borderRadius:16, padding:8, zIndex:300, minWidth:180, boxShadow:"0 12px 40px rgba(0,0,0,0.5)" }}>
            <div style={{ padding:"8px 12px", borderBottom:`1px solid ${BORDER}`, marginBottom:4 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{account.businessName}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginTop:2 }}>{account.email}</div>
            </div>
            <button onClick={() => { setMode(m => m==="sandbox" ? "live" : "sandbox"); setMenuOpen(false); }} style={{ width:"100%", textAlign:"left", background:"none", border:"none", color:"rgba(255,255,255,0.8)", fontSize:13, padding:"8px 12px", borderRadius:10, cursor:"pointer" }}>
              Switch to {isSandbox ? "Live" : "Sandbox"}
            </button>
            <button onClick={signOut} style={{ width:"100%", textAlign:"left", background:"none", border:"none", color:"#EF4444", fontSize:13, padding:"8px 12px", borderRadius:10, cursor:"pointer" }}>
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );

  // ── Bottom Tab Bar ──────────────────────────────────────────────────────────
  const tabBar = (
    <nav style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:200, background:"rgba(10,15,30,0.97)", backdropFilter:"blur(20px)", borderTop:`1px solid ${BORDER}`, display:"flex", alignItems:"stretch", height:64, paddingBottom:"env(safe-area-inset-bottom)" }}>
      {TABS.map(t => (
        <button key={t.id} onClick={() => setTab(t.id)} style={{ flex:1, background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:3, color: tab===t.id ? ZP_CYAN : "rgba(255,255,255,0.4)", transition:"color 0.15s", padding:"6px 4px" }}>
          <span style={{ fontSize:20, lineHeight:1 }}>{t.icon}</span>
          <span style={{ fontSize:10, fontWeight:700, letterSpacing:"0.03em" }}>{t.label}</span>
          {tab===t.id && <span style={{ position:"absolute", bottom:0, width:28, height:2, background:ZP_GRAD, borderRadius:2, marginBottom:0 }} />}
        </button>
      ))}
    </nav>
  );

  // ── Scroll container style ──────────────────────────────────────────────────
  const page: React.CSSProperties = { minHeight:"100vh", background:DARK, color:"#fff", fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", paddingTop:68, paddingBottom:76, overflowX:"hidden" };

  // ════════════════════════════════════════════════════════
  //  HOME TAB
  // ════════════════════════════════════════════════════════
  const homeTab = (
    <div style={{ padding:"16px 16px 0" }}>
      {/* Greeting */}
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontSize:22, fontWeight:900, margin:"0 0 4px", letterSpacing:"-0.5px" }}>
          Hey, {account.ownerName || account.businessName} 👋
        </h1>
        <p style={{ margin:0, fontSize:13, color:"rgba(255,255,255,0.45)" }}>
          {isSandbox ? "Sandbox mode — test freely" : "Live mode — real transactions"}
        </p>
      </div>

      {/* ZeniCard compact */}
      <div style={{ marginBottom:20 }}>
        <ZeniCard account={account} compact />
        <div style={{ display:"flex", justifyContent:"center", marginTop:8 }}>
          <span style={{ fontSize:11, color:"rgba(255,255,255,0.3)" }}>Tap card to reveal number</span>
        </div>
      </div>

      {/* Balance + Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:20 }}>
        {[
          { label:"Balance", value:fmt(account.balance), color:ZP_GREEN },
          { label:"Volume",  value:fmt(account.volume),  color:ZP_CYAN  },
          { label:"Transactions", value:String(account.txCount), color:ZP_PURPLE },
        ].map(s => (
          <div key={s.label} style={{ background:GLASS, border:`1px solid ${BORDER}`, borderRadius:14, padding:"12px 12px", textAlign:"center" }}>
            <div style={{ fontSize:16, fontWeight:900, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginTop:3, lineHeight:1.3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:12 }}>Quick Actions</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {[
            { icon:"🔗", label:"Payment Link", color:ZP_GREEN  },
            { icon:"💸", label:"Send Payout",  color:ZP_CYAN   },
            { icon:"🧾", label:"New Invoice",  color:ZP_BLUE   },
            { icon:"📊", label:"Analytics",   color:ZP_PURPLE },
          ].map(a => (
            <button key={a.label} style={{ background:GLASS, border:`1px solid ${BORDER}`, borderRadius:14, padding:"14px 14px", display:"flex", alignItems:"center", gap:10, cursor:"pointer", color:"#fff", textAlign:"left" }}>
              <span style={{ fontSize:22, lineHeight:1, width:36, height:36, borderRadius:10, background:a.color+"18", display:"flex", alignItems:"center", justifyContent:"center" }}>{a.icon}</span>
              <span style={{ fontSize:13, fontWeight:700 }}>{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Transactions */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:12 }}>Recent Transactions</div>
        <div style={{ background:GLASS, border:`1px solid ${BORDER}`, borderRadius:16, overflow:"hidden" }}>
          {account.txCount === 0 ? (
            <div style={{ padding:"36px 20px", textAlign:"center" }}>
              <div style={{ fontSize:36, marginBottom:12 }}>💳</div>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:6 }}>No transactions yet</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", lineHeight:1.6 }}>
                {isSandbox ? "Use a test card to simulate your first payment." : "Your live transactions will appear here."}
              </div>
            </div>
          ) : (
            <div style={{ padding:"12px 16px", color:"rgba(255,255,255,0.6)", fontSize:13 }}>
              {account.txCount} transaction{account.txCount !== 1 ? "s" : ""} on record
            </div>
          )}
        </div>
      </div>

      {/* Sandbox test cards */}
      {isSandbox && (
        <div style={{ marginBottom:20, background:"rgba(245,166,35,0.06)", border:"1px solid rgba(245,166,35,0.2)", borderRadius:16, padding:"16px" }}>
          <div style={{ fontSize:13, fontWeight:800, color:"#F5A623", marginBottom:10 }}>🧪 Test Cards</div>
          {[
            { brand:"Visa",       number:"4111 1111 1111 1111" },
            { brand:"Mastercard", number:"5454 5454 5454 5454" },
          ].map(c => (
            <div key={c.brand} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
              <div>
                <span style={{ fontSize:11, fontWeight:700, color:"#F5A623", marginRight:8 }}>{c.brand}</span>
                <code style={{ fontSize:12, color:"rgba(255,255,255,0.8)", letterSpacing:"0.05em" }}>{c.number}</code>
              </div>
              <CopyBtn text={c.number.replace(/ /g,"")} />
            </div>
          ))}
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:8 }}>Any future date · CVC: 999</div>
        </div>
      )}
    </div>
  );

  // ════════════════════════════════════════════════════════
  //  ZENICARD TAB
  // ════════════════════════════════════════════════════════
  const cardTab = (
    <div style={{ padding:"16px" }}>
      <h2 style={{ fontSize:20, fontWeight:900, margin:"0 0 20px", letterSpacing:"-0.5px" }}>Your ZeniCard</h2>
      <ZeniCard account={account} />
      <div style={{ marginTop:8, textAlign:"center", fontSize:11, color:"rgba(255,255,255,0.3)", marginBottom:20 }}>Tap card to reveal number</div>

      {/* Account details */}
      <div style={{ background:GLASS, border:`1px solid ${BORDER}`, borderRadius:18, overflow:"hidden", marginBottom:16 }}>
        <div style={{ padding:"14px 16px", borderBottom:`1px solid ${BORDER}`, fontSize:11, color:"rgba(255,255,255,0.4)", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase" }}>
          Account Details
        </div>
        {[
          { label:"Account Type", value:"Business Chequing" },
          { label:"Institution",  value:"ZeniPay (Powered by Unit.co)" },
          { label:"Account #",    value:"•••• •••• 4242" },
          { label:"Transit #",    value:"•••• 218" },
          { label:"Currency",     value:"CAD" },
          { label:"Status",       value: account.status === "live" ? "Active" : "Sandbox" },
        ].map(r => (
          <div key={r.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 16px", borderBottom:`1px solid rgba(255,255,255,0.04)` }}>
            <span style={{ fontSize:13, color:"rgba(255,255,255,0.5)" }}>{r.label}</span>
            <span style={{ fontSize:13, fontWeight:700 }}>{r.value}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        {[
          { icon:"⬆️", label:"Transfer Out" },
          { icon:"⬇️", label:"Receive Funds" },
          { icon:"📄", label:"Statement"    },
          { icon:"🔒", label:"Freeze Card"  },
        ].map(a => (
          <button key={a.label} style={{ background:GLASS, border:`1px solid ${BORDER}`, borderRadius:14, padding:"14px 14px", display:"flex", flexDirection:"column", alignItems:"center", gap:6, cursor:"pointer", color:"#fff" }}>
            <span style={{ fontSize:24 }}>{a.icon}</span>
            <span style={{ fontSize:12, fontWeight:700 }}>{a.label}</span>
          </button>
        ))}
      </div>

      {/* Pending verification notice */}
      <div style={{ marginTop:16, background:"rgba(42,143,224,0.07)", border:"1px solid rgba(42,143,224,0.2)", borderRadius:14, padding:"14px 16px" }}>
        <div style={{ fontSize:13, fontWeight:700, color:ZP_BLUE, marginBottom:6 }}>ℹ Debit Card Status</div>
        <p style={{ margin:0, fontSize:12, color:"rgba(255,255,255,0.55)", lineHeight:1.7 }}>
          Your Visa and Mastercard debit cards are pending verification. We will email {account.email} when they are ready for use.
        </p>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════
  //  API KEYS TAB
  // ════════════════════════════════════════════════════════
  const keysTab = (
    <div style={{ padding:"16px" }}>
      <h2 style={{ fontSize:20, fontWeight:900, margin:"0 0 6px", letterSpacing:"-0.5px" }}>API Keys</h2>
      <p style={{ fontSize:13, color:"rgba(255,255,255,0.45)", margin:"0 0 20px" }}>Use these keys to authenticate your API requests.</p>

      {/* Sandbox */}
      <div style={{ background:"rgba(245,166,35,0.06)", border:"1px solid rgba(245,166,35,0.25)", borderRadius:18, overflow:"hidden", marginBottom:16 }}>
        <div style={{ padding:"12px 16px", borderBottom:"1px solid rgba(245,166,35,0.15)", display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ width:8, height:8, borderRadius:"50%", background:"#F5A623", display:"inline-block" }} />
          <span style={{ fontSize:11, fontWeight:800, color:"#F5A623", letterSpacing:"0.1em", textTransform:"uppercase" }}>Sandbox</span>
        </div>
        {[
          { label:"Publishable Key", value: account.sandboxKey   || "Not generated" },
          { label:"Secret Key",      value: account.sandboxSecret || "Not generated" },
        ].map(k => (
          <div key={k.label} style={{ padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", fontWeight:700, marginBottom:6 }}>{k.label}</div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <code style={{ flex:1, fontSize:11, color:"rgba(255,255,255,0.85)", background:"rgba(0,0,0,0.2)", padding:"8px 10px", borderRadius:8, wordBreak:"break-all", lineHeight:1.5 }}>{k.value}</code>
              <CopyBtn text={k.value} />
            </div>
          </div>
        ))}
      </div>

      {/* Live */}
      <div style={{ background:"rgba(45,190,96,0.06)", border:"1px solid rgba(45,190,96,0.25)", borderRadius:18, overflow:"hidden", marginBottom:16 }}>
        <div style={{ padding:"12px 16px", borderBottom:"1px solid rgba(45,190,96,0.15)", display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ width:8, height:8, borderRadius:"50%", background:ZP_GREEN, display:"inline-block" }} />
          <span style={{ fontSize:11, fontWeight:800, color:ZP_GREEN, letterSpacing:"0.1em", textTransform:"uppercase" }}>Live</span>
        </div>
        <div style={{ padding:"16px" }}>
          {account.status === "live" ? (
            [{ label:"Live Key", value: account.liveKey }].map(k => (
              <div key={k.label}>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", fontWeight:700, marginBottom:6 }}>{k.label}</div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <code style={{ flex:1, fontSize:11, color:"rgba(255,255,255,0.85)", background:"rgba(0,0,0,0.2)", padding:"8px 10px", borderRadius:8, wordBreak:"break-all", lineHeight:1.5 }}>{k.value}</code>
                  <CopyBtn text={k.value} />
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign:"center", padding:"12px 0" }}>
              <div style={{ fontSize:28, marginBottom:10 }}>🔒</div>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:6 }}>Live keys locked</div>
              <p style={{ fontSize:12, color:"rgba(255,255,255,0.45)", margin:"0 0 14px", lineHeight:1.6 }}>
                Your account is in sandbox mode. Complete your business verification to unlock live processing.
              </p>
              <a href="mailto:info@zenipay.ca?subject=Live Access Request" style={{ display:"inline-block", background:ZP_GRAD, color:"#fff", textDecoration:"none", padding:"10px 24px", borderRadius:12, fontSize:13, fontWeight:800 }}>
                Request Live Access →
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Code snippet */}
      <div style={{ background:"#0d1117", border:`1px solid ${BORDER}`, borderRadius:16, overflow:"hidden" }}>
        <div style={{ padding:"10px 16px", borderBottom:`1px solid ${BORDER}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:11, color:"rgba(255,255,255,0.4)", fontWeight:700 }}>Example Request</span>
          <CopyBtn text={`curl https://api.zenipay.ca/v1/payments \\\n  -H "Authorization: Bearer ${activeKey}" \\\n  -d amount=1000 -d currency=cad`} />
        </div>
        <pre style={{ margin:0, padding:"14px 16px", fontSize:11, lineHeight:1.7, color:"#e6edf3", overflowX:"auto" }}>
{`curl https://api.zenipay.ca/v1/payments \\
  -H "Authorization: Bearer ${activeKey || "YOUR_KEY"}" \\
  -d amount=1000 \\
  -d currency=cad \\
  -d description="My first payment"`}
        </pre>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════
  //  SETTINGS TAB
  // ════════════════════════════════════════════════════════
  const settingsTab = (
    <div style={{ padding:"16px" }}>
      <h2 style={{ fontSize:20, fontWeight:900, margin:"0 0 20px", letterSpacing:"-0.5px" }}>Account Settings</h2>

      {/* Plan badge */}
      <div style={{ background:GLASS, border:`1px solid ${BORDER}`, borderRadius:18, padding:"16px", marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", marginBottom:4 }}>Current Plan</div>
          <div style={{ fontSize:18, fontWeight:900 }}>{account.plan}</div>
        </div>
        <a href="/payments" style={{ background:ZP_GRAD, color:"#fff", textDecoration:"none", padding:"10px 18px", borderRadius:12, fontSize:12, fontWeight:800 }}>Upgrade →</a>
      </div>

      {/* Business Info */}
      <div style={{ background:GLASS, border:`1px solid ${BORDER}`, borderRadius:18, overflow:"hidden", marginBottom:16 }}>
        <div style={{ padding:"12px 16px", borderBottom:`1px solid ${BORDER}`, fontSize:11, color:"rgba(255,255,255,0.4)", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase" }}>
          Business Info
        </div>
        {[
          { label:"Business Name", value:account.businessName || "—" },
          { label:"Owner",         value:account.ownerName    || "—" },
          { label:"Email",         value:account.email        || "—" },
          { label:"Phone",         value:account.phone        || "—" },
          { label:"Website",       value:account.website      || "—" },
          { label:"Type",          value:account.businessType || "—" },
          { label:"Country",       value:account.country      || "—" },
          { label:"Est. Volume",   value:account.monthlyVolume ? `$${account.monthlyVolume}/mo` : "—" },
        ].map(r => (
          <div key={r.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 16px", borderBottom:`1px solid rgba(255,255,255,0.04)` }}>
            <span style={{ fontSize:12, color:"rgba(255,255,255,0.45)" }}>{r.label}</span>
            <span style={{ fontSize:13, fontWeight:600, maxWidth:"55%", textAlign:"right", wordBreak:"break-all" }}>{r.value}</span>
          </div>
        ))}
      </div>

      {/* Member since */}
      <div style={{ background:GLASS, border:`1px solid ${BORDER}`, borderRadius:14, padding:"14px 16px", marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:13, color:"rgba(255,255,255,0.5)" }}>Member since</span>
        <span style={{ fontSize:13, fontWeight:700 }}>
          {new Date(account.createdAt).toLocaleDateString("en-CA", { year:"numeric", month:"short", day:"numeric" })}
        </span>
      </div>

      {/* Support */}
      <div style={{ background:"rgba(42,143,224,0.07)", border:"1px solid rgba(42,143,224,0.2)", borderRadius:14, padding:"14px 16px", marginBottom:16 }}>
        <div style={{ fontSize:13, fontWeight:700, color:ZP_BLUE, marginBottom:6 }}>Need help?</div>
        <p style={{ margin:"0 0 10px", fontSize:12, color:"rgba(255,255,255,0.55)", lineHeight:1.6 }}>Our team is available 9am–6pm ET, Mon–Fri.</p>
        <a href="mailto:info@zenipay.ca" style={{ fontSize:12, color:ZP_CYAN, fontWeight:700, textDecoration:"none" }}>info@zenipay.ca →</a>
      </div>

      {/* Sign out */}
      <button onClick={signOut} style={{ width:"100%", padding:"14px", borderRadius:14, background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.25)", color:"#EF4444", fontSize:14, fontWeight:800, cursor:"pointer" }}>
        Sign Out
      </button>
    </div>
  );

  // ── Click outside menu ──────────────────────────────────────────────────────
  const closeMenu = menuOpen ? (
    <div onClick={() => setMenuOpen(false)} style={{ position:"fixed", inset:0, zIndex:299 }} />
  ) : null;

  return (
    <div style={page}>
      {header}
      {closeMenu}
      {tab === "home"     && homeTab}
      {tab === "card"     && cardTab}
      {tab === "keys"     && keysTab}
      {tab === "settings" && settingsTab}
      {tabBar}
      <style>{`
        * { box-sizing: border-box; }
        button:active { opacity: 0.85; }
        @keyframes spin { to { transform: rotate(360deg); } }
        pre { font-family: 'SF Mono', 'Fira Code', monospace; }
      `}</style>
    </div>
  );
}
