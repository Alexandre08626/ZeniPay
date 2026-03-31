import { ImageResponse } from "next/og";
export const runtime = "edge";
export const alt = "ZeniPay Payouts — Pay anyone, in seconds";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    (<div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0d1633 0%, #1a2a5e 50%, #7B4FBF 100%)", fontFamily: "system-ui" }}>
      <div style={{ fontSize: 48, marginBottom: 20 }}>💸</div>
      <div style={{ fontSize: 64, fontWeight: 900, color: "#fff", letterSpacing: "-2px", marginBottom: 12 }}>Pay Anyone. In Seconds.</div>
      <div style={{ fontSize: 28, color: "rgba(255,255,255,0.7)", marginBottom: 32 }}>ACH · Wire · RTP/FedNow · SWIFT · Batch Payouts</div>
      <div style={{ position: "absolute", bottom: 24, fontSize: 18, color: "rgba(255,255,255,0.4)" }}>zenipay.ca/payouts</div>
    </div>),
    { ...size }
  );
}
