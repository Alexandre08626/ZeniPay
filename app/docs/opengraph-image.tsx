import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";
export const runtime = "nodejs";
export const alt = "ZeniPay API Docs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default async function Image() {
  const logoData = await readFile(join(process.cwd(), "public", "zenipay-logo-nobg.png"));
  const logo = `data:image/png;base64,${logoData.toString("base64")}`;
  return new ImageResponse(
    (<div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0A0F1E 0%, #111f38 50%, #1a2a5e 100%)", fontFamily: "system-ui" }}>
      <img src={logo} width={280} height={420} style={{ objectFit: "contain", marginRight: 40 }} />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 52, fontWeight: 900, color: "#fff", marginBottom: 12 }}>API Reference</div>
        <div style={{ fontSize: 24, color: "rgba(255,255,255,0.6)", marginBottom: 24 }}>REST API · Sandbox · Webhooks</div>
        <div style={{ fontSize: 18, color: "#15B8C9", fontWeight: 700 }}>zenipay.ca/docs</div>
      </div>
    </div>), { ...size }
  );
}
