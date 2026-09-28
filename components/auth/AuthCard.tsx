// Shared shell for the password pages — same look as /login.

import React from "react";
import ZeniPayLogo from "@/components/ZeniPayLogo";

export const ZP_GRAD = "linear-gradient(90deg, #2DBE60 0%, #15B8C9 45%, #7B4FBF 100%)";

export const authInput: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", padding: "13px 14px", fontSize: 16, borderRadius: 12,
  border: "1.5px solid #E2E8F0", outline: "none", background: "#F8FAFC", color: "#0F172A",
};

export const authButton: React.CSSProperties = {
  width: "100%", padding: "14px", border: "none", borderRadius: 12, cursor: "pointer",
  background: ZP_GRAD, color: "#fff", fontWeight: 800, fontSize: 15,
};

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: "100vh", background: "linear-gradient(150deg, #F0FDF4 0%, #EEF4FF 40%, #FFF7ED 100%)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20, background: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 32px rgba(21,184,201,0.15)", marginBottom: 12,
          }}>
            <ZeniPayLogo size={40} />
          </div>
          <div style={{ fontWeight: 900, fontSize: 24, background: ZP_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>ZeniPay</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 24, padding: "28px 24px", boxShadow: "0 4px 48px rgba(0,0,0,0.08)", border: "1px solid rgba(0,0,0,0.06)" }}>
          <h1 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 800, color: "#0F172A" }}>{title}</h1>
          {subtitle && <p style={{ margin: "0 0 20px", fontSize: 13, color: "#64748B", lineHeight: 1.5 }}>{subtitle}</p>}
          {children}
        </div>
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <a href="/login" style={{ fontSize: 13, color: "#15B8C9", fontWeight: 600, textDecoration: "none" }}>← Retour à la connexion</a>
        </div>
      </div>
    </div>
  );
}
