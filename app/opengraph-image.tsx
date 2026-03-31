import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";
export const alt = "ZeniPay — Accept Payments. Move Money. Scale Your Business.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const logoData = await readFile(join(process.cwd(), "public", "zenipay-logo-nobg.png"));
  const logoBase64 = `data:image/png;base64,${logoData.toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0A0F1E 0%, #0d1633 30%, #1a2a5e 60%, #0A0F1E 100%)", fontFamily: "system-ui, sans-serif" }}>
        <img src={logoBase64} width={400} height={600} style={{ objectFit: "contain", marginBottom: -60 }} />
        <div style={{ fontSize: 28, color: "rgba(255,255,255,0.6)", fontWeight: 600, textAlign: "center" }}>
          Accept Payments. Move Money. Scale Your Business.
        </div>
        <div style={{ position: "absolute", bottom: 24, fontSize: 16, color: "rgba(255,255,255,0.3)" }}>zenipay.ca</div>
      </div>
    ),
    { ...size }
  );
}
