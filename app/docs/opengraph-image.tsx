import { ImageResponse } from "next/og";
export const runtime = "edge";
export const alt = "ZeniPay API Documentation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    (<div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0d1633 0%, #111f38 50%, #1a2a5e 100%)", fontFamily: "system-ui" }}>
      <div style={{ fontSize: 48, marginBottom: 20 }}>📚</div>
      <div style={{ fontSize: 64, fontWeight: 900, color: "#fff", letterSpacing: "-2px", marginBottom: 12 }}>API Reference</div>
      <div style={{ fontSize: 28, color: "rgba(255,255,255,0.7)", marginBottom: 32 }}>Clean REST API · Built for developers · Sandbox included</div>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ background: "#1e293b", borderRadius: 10, padding: "8px 16px", color: "#15B8C9", fontSize: 16, fontFamily: "monospace" }}>POST /v1/payments</div>
        <div style={{ background: "#1e293b", borderRadius: 10, padding: "8px 16px", color: "#2DBE60", fontSize: 16, fontFamily: "monospace" }}>GET /v1/balance</div>
        <div style={{ background: "#1e293b", borderRadius: 10, padding: "8px 16px", color: "#7B4FBF", fontSize: 16, fontFamily: "monospace" }}>POST /v1/payouts</div>
      </div>
      <div style={{ position: "absolute", bottom: 24, fontSize: 18, color: "rgba(255,255,255,0.4)" }}>zenipay.ca/docs</div>
    </div>),
    { ...size }
  );
}
