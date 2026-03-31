import { ImageResponse } from "next/og";
export const runtime = "edge";
export const alt = "Get Started with ZeniPay — Free Sandbox Access";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    (<div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0d1633 0%, #2DBE60 50%, #15B8C9 100%)", fontFamily: "system-ui" }}>
      <div style={{ fontSize: 48, marginBottom: 20 }}>🚀</div>
      <div style={{ fontSize: 64, fontWeight: 900, color: "#fff", letterSpacing: "-2px", marginBottom: 12 }}>Get Started Free</div>
      <div style={{ fontSize: 28, color: "rgba(255,255,255,0.8)", marginBottom: 32 }}>Create your account · Get API keys · Accept payments today</div>
      <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 16, padding: "14px 32px", color: "#fff", fontSize: 22, fontWeight: 700 }}>No credit card required</div>
      <div style={{ position: "absolute", bottom: 24, fontSize: 18, color: "rgba(255,255,255,0.4)" }}>zenipay.ca/signup</div>
    </div>),
    { ...size }
  );
}
