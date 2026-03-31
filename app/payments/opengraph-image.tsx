import { ImageResponse } from "next/og";
export const runtime = "edge";
export const alt = "ZeniPay Payments — Accept every card, everywhere";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    (<div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0d1633 0%, #1a2a5e 50%, #2DBE60 100%)", fontFamily: "system-ui" }}>
      <div style={{ fontSize: 48, marginBottom: 20 }}>💳</div>
      <div style={{ fontSize: 64, fontWeight: 900, color: "#fff", letterSpacing: "-2px", marginBottom: 12 }}>Accept Every Payment</div>
      <div style={{ fontSize: 28, color: "rgba(255,255,255,0.7)", marginBottom: 32 }}>Visa · Mastercard · Amex · Discover · 135+ currencies</div>
      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 20px", color: "#fff", fontSize: 18, fontWeight: 600 }}>2.9% + $0.30</div>
        <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 20px", color: "#fff", fontSize: 18, fontWeight: 600 }}>PCI DSS Level 1</div>
        <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 20px", color: "#fff", fontSize: 18, fontWeight: 600 }}>3D Secure</div>
      </div>
      <div style={{ position: "absolute", bottom: 24, fontSize: 18, color: "rgba(255,255,255,0.4)" }}>zenipay.ca/payments</div>
    </div>),
    { ...size }
  );
}
