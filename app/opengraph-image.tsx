import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ZeniPay — Accept Payments. Move Money. Scale Your Business.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0d1633 0%, #1a2a5e 40%, #7B4FBF 80%, #E5247B 100%)", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ fontSize: 80, fontWeight: 900, color: "#fff", letterSpacing: "-2px", marginBottom: 16, display: "flex", alignItems: "center", gap: 20 }}>
          <span style={{ background: "linear-gradient(90deg, #2DBE60, #15B8C9, #7B4FBF)", backgroundClip: "text", color: "transparent" }}>ZeniPay</span>
        </div>
        <div style={{ fontSize: 32, color: "rgba(255,255,255,0.8)", fontWeight: 600, marginBottom: 40, textAlign: "center", maxWidth: 800 }}>
          Accept Payments. Move Money. Scale Your Business.
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          <div style={{ background: "rgba(45,190,96,0.2)", border: "2px solid rgba(45,190,96,0.5)", borderRadius: 16, padding: "12px 24px", color: "#2DBE60", fontSize: 20, fontWeight: 700 }}>Visa & Mastercard</div>
          <div style={{ background: "rgba(21,184,201,0.2)", border: "2px solid rgba(21,184,201,0.5)", borderRadius: 16, padding: "12px 24px", color: "#15B8C9", fontSize: 20, fontWeight: 700 }}>Instant Deposits</div>
          <div style={{ background: "rgba(123,79,191,0.2)", border: "2px solid rgba(123,79,191,0.5)", borderRadius: 16, padding: "12px 24px", color: "#7B4FBF", fontSize: 20, fontWeight: 700 }}>ZeniCard Banking</div>
        </div>
        <div style={{ position: "absolute", bottom: 24, fontSize: 18, color: "rgba(255,255,255,0.4)" }}>zenipay.ca</div>
      </div>
    ),
    { ...size }
  );
}
