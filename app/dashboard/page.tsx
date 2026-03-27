"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const ZP_GRAD = "linear-gradient(135deg, #2DBE60 0%, #15B8C9 45%, #7B4FBF 100%)";
const DARK = "#0A0F1E";
const GLASS = "rgba(255,255,255,0.05)";

function DashboardContent() {
  const params = useSearchParams();
  const mode = params.get("mode") || "sandbox";
  const role = params.get("role") || "admin";

  const isSandbox = mode === "sandbox";

  return (
    <div style={{ minHeight: "100vh", background: DARK, color: "#fff" }}>
      {/* Top bar */}
      <div style={{
        background: "rgba(10,15,30,0.9)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        padding: "0 5%", height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: ZP_GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 16, color: "#fff" }}>Z</div>
          <span style={{ fontWeight: 800, fontSize: 17, background: ZP_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>ZeniPay</span>
          <div style={{
            padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
            background: isSandbox ? "rgba(245,166,35,0.15)" : "rgba(45,190,96,0.15)",
            color: isSandbox ? "#F5A623" : "#2DBE60",
            border: `1px solid ${isSandbox ? "rgba(245,166,35,0.3)" : "rgba(45,190,96,0.3)"}`,
          }}>
            {isSandbox ? "🧪 SANDBOX" : "🔴 LIVE"}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
            {role === "admin" ? "⚙️ Admin" : "👤 Client"} · {isSandbox ? "sandbox" : "live"}
          </span>
          <a href="/login" style={{
            padding: "6px 16px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.15)",
            color: "rgba(255,255,255,0.6)", fontSize: 13, textDecoration: "none",
          }}>Sign out</a>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "48px 5%", maxWidth: 1000, margin: "0 auto" }}>
        {/* Welcome */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 8px", letterSpacing: "-0.5px" }}>
            {role === "admin" ? "ZeniPay Dashboard" : "My Account"}
          </h1>
          <p style={{ color: "rgba(255,255,255,0.4)", margin: 0, fontSize: 15 }}>
            {isSandbox
              ? "You are in sandbox mode. Transactions are simulated."
              : "You are in live mode. Real transactions only."}
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 40 }}>
          {(role === "admin" ? [
            { label: "Total Volume", value: isSandbox ? "$0.00" : "$0.00", icon: "💰" },
            { label: "Transactions", value: "0", icon: "📊" },
            { label: "Success Rate", value: "—", icon: "✅" },
            { label: "Merchants", value: "1", icon: "🏪" },
          ] : [
            { label: "Balance", value: "$0.00", icon: "💰" },
            { label: "Payments", value: "0", icon: "💳" },
            { label: "Pending", value: "$0.00", icon: "⏳" },
          ]).map(s => (
            <div key={s.label} style={{
              background: GLASS, border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16, padding: "20px 20px",
            }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 900 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px", color: "rgba(255,255,255,0.6)" }}>Quick Actions</h2>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {(role === "admin" ? [
              { label: "New Payment Link", icon: "🔗" },
              { label: "Send Payout", icon: "💸" },
              { label: "View Ledger", icon: "📒" },
              { label: "Manage Merchants", icon: "🏪" },
              { label: "API Keys", icon: "🔑" },
            ] : [
              { label: "Pay Invoice", icon: "📄" },
              { label: "View History", icon: "📋" },
              { label: "Download Statement", icon: "📥" },
            ]).map(a => (
              <button key={a.label} style={{
                padding: "10px 20px", borderRadius: 10,
                background: GLASS, border: "1px solid rgba(255,255,255,0.1)",
                color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                {a.icon} {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sandbox notice */}
        {isSandbox && (
          <div style={{
            padding: "20px 24px", borderRadius: 16,
            background: "rgba(245,166,35,0.06)", border: "1px solid rgba(245,166,35,0.2)",
          }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#F5A623", marginBottom: 8 }}>
              🧪 Sandbox Mode Active
            </div>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, margin: "0 0 12px", lineHeight: 1.6 }}>
              All transactions are simulated. No real money moves. Use these test cards:
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {[
                { label: "Visa", number: "4111 1111 1111 1111" },
                { label: "Mastercard", number: "5454 5454 5454 5454" },
              ].map(c => (
                <div key={c.label} style={{
                  padding: "8px 16px", borderRadius: 8,
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                  fontSize: 13,
                }}>
                  <span style={{ color: "#F5A623", fontWeight: 700 }}>{c.label}: </span>
                  <code style={{ color: "#fff" }}>{c.number}</code>
                  <span style={{ color: "rgba(255,255,255,0.4)" }}> · any future exp · CVC 999</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live notice */}
        {!isSandbox && (
          <div style={{
            padding: "20px 24px", borderRadius: 16,
            background: "rgba(45,190,96,0.06)", border: "1px solid rgba(45,190,96,0.2)",
          }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#2DBE60", marginBottom: 8 }}>
              🔴 Live Mode — Real Transactions
            </div>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, margin: 0, lineHeight: 1.6 }}>
              You are connected to the live Finix payment gateway.
              All transactions are real and will be settled to your bank account.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div style={{ background: "#0A0F1E", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>Loading…</div>}>
      <DashboardContent />
    </Suspense>
  );
}
