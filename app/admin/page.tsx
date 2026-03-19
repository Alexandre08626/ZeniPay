"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const ZP_GRAD = "linear-gradient(90deg, #2DBE60 0%, #15B8C9 45%, #7B4FBF 100%)";
const CARD_BG = "rgba(255,255,255,0.05)";
const BORDER = "rgba(255,255,255,0.09)";
const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const statusColor = (s: string) => s === "active" ? "#2DBE60" : s === "pending" ? "#F5A623" : "#EF4444";

const CLIENTS = [
  { id: "cl-001", name: "Zeniva Travel LLC", domain: "zenivatravel.com", status: "active", volume: 0, txCount: 0, balance: 0, apiKey: "zpk_live_zeniva_****3k9", plan: "Business", since: "2026-02-24" },
];

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"overview"|"clients"|"transactions"|"api"|"settings">("overview");

  useEffect(() => {
    if (typeof window !== "undefined" && !sessionStorage.getItem("zp_admin")) {
      router.replace("/admin/login");
    }
  }, [router]);

  const logout = () => {
    sessionStorage.removeItem("zp_admin");
    router.replace("/admin/login");
  };

  const NAV = [
    ["overview","📊","Overview"],
    ["clients","🏪","Clients"],
    ["transactions","💳","Transactions"],
    ["api","🔑","API & Keys"],
    ["settings","⚙️","Settings"],
  ] as const;

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(170deg,#060B18 0%,#0A1530 55%,#0D1A40 100%)", color:"#fff", fontFamily:"'Inter',system-ui,sans-serif", display:"flex" }}>

      {/* Sidebar */}
      <div style={{ width:220, background:"rgba(255,255,255,0.03)", borderRight:"1px solid rgba(255,255,255,0.07)", display:"flex", flexDirection:"column", padding:"24px 0", flexShrink:0 }}>
        <div style={{ padding:"0 20px 28px" }}>
          <img src="/zenipay-logo.png" alt="ZeniPay" style={{ width:36, height:36, objectFit:"contain", marginBottom:8 }} />
          <div style={{ fontWeight:900, fontSize:17, background:ZP_GRAD, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>ZeniPay</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginTop:2 }}>Admin Console</div>
        </div>

        {NAV.map(([key, icon, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            display:"flex", alignItems:"center", gap:10, padding:"10px 20px",
            border:"none", cursor:"pointer", textAlign:"left",
            background: tab===key ? "rgba(45,190,96,0.12)" : "transparent",
            borderLeft: tab===key ? "3px solid #2DBE60" : "3px solid transparent",
            color: tab===key ? "#fff" : "rgba(255,255,255,0.45)",
            fontSize:14, fontWeight: tab===key ? 700 : 400, transition:"all 0.15s",
          }}>
            <span>{icon}</span>{label}
          </button>
        ))}

        <div style={{ flex:1 }} />
        <button onClick={logout} style={{ margin:"0 12px 12px", padding:"10px 16px", borderRadius:10, background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", color:"#EF4444", cursor:"pointer", fontSize:13, fontWeight:700 }}>
          🔓 Sign Out
        </button>
      </div>

      {/* Main */}
      <div style={{ flex:1, padding:"32px 40px", overflowY:"auto" }}>
        <div style={{ marginBottom:32 }}>
          <h1 style={{ margin:"0 0 4px", fontSize:26, fontWeight:900, letterSpacing:"-0.5px" }}>
            {tab==="overview" && "Platform Overview"}{tab==="clients" && "Clients"}{tab==="transactions" && "Transactions"}{tab==="api" && "API & Keys"}{tab==="settings" && "Settings"}
          </h1>
          <p style={{ margin:0, color:"rgba(255,255,255,0.35)", fontSize:14 }}>
            ZeniPay Admin · {new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}
          </p>
        </div>

        {/* OVERVIEW */}
        {tab==="overview" && <>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))", gap:16, marginBottom:32 }}>
            {[
              {label:"Total Volume",    value:fmt(0),   icon:"💰", color:"#2DBE60"},
              {label:"Platform Fees",   value:fmt(0),   icon:"📈", color:"#15B8C9"},
              {label:"Active Clients",  value:"1",      icon:"🏪", color:"#7B4FBF"},
              {label:"Pending Payouts", value:fmt(0),   icon:"⏳", color:"#F5A623"},
              {label:"Success Rate",    value:"—",      icon:"✅", color:"#2DBE60"},
            ].map(s => (
              <div key={s.label} style={{ background:CARD_BG, border:`1px solid ${BORDER}`, borderRadius:16, padding:"20px" }}>
                <div style={{ fontSize:22, marginBottom:10 }}>{s.icon}</div>
                <div style={{ fontSize:22, fontWeight:900, color:s.color }}>{s.value}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginTop:4, letterSpacing:"0.04em" }}>{s.label.toUpperCase()}</div>
              </div>
            ))}
          </div>

          <div style={{ background:CARD_BG, border:`1px solid ${BORDER}`, borderRadius:18, padding:"24px 28px", marginBottom:20 }}>
            <div style={{ fontWeight:800, fontSize:15, marginBottom:20 }}>Active Clients</div>
            {CLIENTS.map(c => (
              <div key={c.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 0", borderTop:`1px solid ${BORDER}` }}>
                <div style={{ width:40, height:40, borderRadius:10, background:ZP_GRAD, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:15, flexShrink:0 }}>Z</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:14 }}>{c.name}</div>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>{c.domain} · Since {c.since}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:14, fontWeight:800 }}>{fmt(c.volume)}</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)" }}>{c.txCount} transactions</div>
                </div>
                <div style={{ padding:"4px 12px", borderRadius:20, background:`${statusColor(c.status)}22`, border:`1px solid ${statusColor(c.status)}44`, color:statusColor(c.status), fontSize:12, fontWeight:700 }}>
                  {c.status.toUpperCase()}
                </div>
              </div>
            ))}
          </div>

          <div style={{ background:CARD_BG, border:`1px solid ${BORDER}`, borderRadius:18, padding:"24px 28px" }}>
            <div style={{ fontWeight:800, fontSize:15, marginBottom:16 }}>Recent Transactions</div>
            <div style={{ color:"rgba(255,255,255,0.3)", fontSize:14, textAlign:"center", padding:"32px 0" }}>
              No transactions yet · Tilled onboarding pending approval
            </div>
          </div>
        </>}

        {/* CLIENTS */}
        {tab==="clients" && (
          <div style={{ background:CARD_BG, border:`1px solid ${BORDER}`, borderRadius:18, padding:"24px 28px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
              <div style={{ fontWeight:800, fontSize:15 }}>Platform Clients ({CLIENTS.length})</div>
              <button style={{ padding:"8px 20px", borderRadius:20, background:ZP_GRAD, border:"none", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>+ New Client</button>
            </div>
            {CLIENTS.map(c => (
              <div key={c.id} style={{ borderTop:`1px solid ${BORDER}`, padding:"20px 0" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <div style={{ fontWeight:800, fontSize:16 }}>{c.name}</div>
                    <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", marginTop:4 }}>ID: {c.id} · Plan: {c.plan} · Depuis {c.since}</div>
                    <div style={{ marginTop:10, display:"flex", gap:8, flexWrap:"wrap" }}>
                      {[{k:"Volume",v:fmt(c.volume)},{k:"Balance",v:fmt(c.balance)},{k:"Transactions",v:`${c.txCount}`}].map(s => (
                        <div key={s.k} style={{ background:"rgba(255,255,255,0.06)", borderRadius:8, padding:"4px 12px", fontSize:12 }}>
                          <span style={{ color:"rgba(255,255,255,0.4)" }}>{s.k}: </span><span style={{ fontWeight:700 }}>{s.v}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop:10, padding:"8px 14px", borderRadius:10, background:"rgba(255,255,255,0.04)", border:`1px solid ${BORDER}`, fontSize:12 }}>
                      <span style={{ color:"rgba(255,255,255,0.4)" }}>API Key: </span><code style={{ color:"#15B8C9" }}>{c.apiKey}</code>
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ padding:"4px 14px", borderRadius:20, background:`${statusColor(c.status)}22`, border:`1px solid ${statusColor(c.status)}44`, color:statusColor(c.status), fontSize:12, fontWeight:700, display:"inline-block" }}>{c.status.toUpperCase()}</div>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginTop:6 }}>{c.domain}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TRANSACTIONS */}
        {tab==="transactions" && (
          <div style={{ background:CARD_BG, border:`1px solid ${BORDER}`, borderRadius:18, padding:"24px 28px" }}>
            <div style={{ fontWeight:800, fontSize:15, marginBottom:20 }}>All Transactions</div>
            <div style={{ color:"rgba(255,255,255,0.3)", fontSize:14, textAlign:"center", padding:"56px 0" }}>
              No transactions yet<br/><span style={{ fontSize:12, marginTop:8, display:"block" }}>Complete Tilled onboarding → payments will appear here</span>
            </div>
          </div>
        )}

        {/* API */}
        {tab==="api" && (
          <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
            <div style={{ background:CARD_BG, border:`1px solid ${BORDER}`, borderRadius:18, padding:"24px 28px" }}>
              <div style={{ fontWeight:800, fontSize:15, marginBottom:20 }}>Client API Keys</div>
              {CLIENTS.map(c => (
                <div key={c.id} style={{ padding:"16px 0", borderTop:`1px solid ${BORDER}` }}>
                  <div style={{ fontWeight:700, marginBottom:10 }}>{c.name}</div>
                  <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                    {[
                      {label:"Live Key",    value:c.apiKey,                        color:"#2DBE60"},
                      {label:"Sandbox Key", value:"zpk_sandbox_zeniva_****7x2",    color:"#F5A623"},
                    ].map(k => (
                      <div key={k.label} style={{ padding:"8px 14px", borderRadius:10, background:"rgba(255,255,255,0.04)", border:`1px solid ${BORDER}`, fontSize:13 }}>
                        <div style={{ fontSize:10, color:k.color, fontWeight:700, letterSpacing:"0.06em", marginBottom:4 }}>{k.label}</div>
                        <code style={{ color:"#fff" }}>{k.value}</code>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background:CARD_BG, border:`1px solid ${BORDER}`, borderRadius:18, padding:"24px 28px" }}>
              <div style={{ fontWeight:800, fontSize:15, marginBottom:20 }}>ZeniPay REST API</div>
              {[
                {m:"POST", p:"/api/v1/payments",     d:"Create a payment intent"},
                {m:"GET",  p:"/api/v1/transactions",  d:"List transactions"},
                {m:"GET",  p:"/api/v1/balance",       d:"Get wallet balance"},
                {m:"POST", p:"/api/v1/payouts",       d:"Trigger a payout"},
                {m:"POST", p:"/api/v1/pay-links",     d:"Create a payment link"},
                {m:"GET",  p:"/api/v1/clients",       d:"List platform clients (admin)"},
              ].map(e => (
                <div key={e.p} style={{ display:"flex", alignItems:"center", gap:14, padding:"11px 0", borderTop:`1px solid ${BORDER}` }}>
                  <div style={{ padding:"3px 10px", borderRadius:6, fontSize:11, fontWeight:800, minWidth:52, textAlign:"center", background:e.m==="POST"?"rgba(45,190,96,0.15)":"rgba(21,184,201,0.15)", color:e.m==="POST"?"#2DBE60":"#15B8C9", border:`1px solid ${e.m==="POST"?"rgba(45,190,96,0.3)":"rgba(21,184,201,0.3)"}` }}>{e.m}</div>
                  <code style={{ fontSize:13, color:"#fff", flex:1 }}>{e.p}</code>
                  <span style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>{e.d}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {tab==="settings" && (
          <div style={{ background:CARD_BG, border:`1px solid ${BORDER}`, borderRadius:18, padding:"24px 28px" }}>
            <div style={{ fontWeight:800, fontSize:15, marginBottom:24 }}>Platform Settings</div>
            {[
              {label:"Platform Name",      value:"ZeniPay"},
              {label:"Admin Email",        value:"admin@zenipay.ca"},
              {label:"Tilled Account ID",  value:"acct_XlRKvhpbdl1UxJ9zINmoL"},
              {label:"Tilled Environment", value:"Sandbox (live approval pending)"},
              {label:"Unit.co Routing #",  value:"812345678"},
              {label:"Bank Account #",     value:"••••5847"},
            ].map(s => (
              <div key={s.label} style={{ display:"flex", justifyContent:"space-between", padding:"14px 0", borderTop:`1px solid ${BORDER}` }}>
                <span style={{ color:"rgba(255,255,255,0.5)", fontSize:14 }}>{s.label}</span>
                <span style={{ fontWeight:700, fontSize:14 }}>{s.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
