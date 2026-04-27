import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";
export const alt = "ZeniPay — The first online bank with AI-intelligent wallets";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Social-share preview rendered when zenipay.ca is unfurled on
// Twitter / LinkedIn / Slack / Facebook / iMessage. Logo on top,
// positioning headline below, agent strip + URL at the foot. Dark
// brand gradient, same palette as the dashboard hero.

export default async function Image() {
  const logoData = await readFile(
    join(process.cwd(), "public", "zenipay-logo-nobg.png")
  );
  const logoBase64 = `data:image/png;base64,${logoData.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "56px 80px",
          background:
            "linear-gradient(135deg, #0A0F1E 0%, #0d1633 30%, #1a2a5e 60%, #0A0F1E 100%)",
          fontFamily: "system-ui, sans-serif",
          color: "#fff",
        }}
      >
        {/* Logo */}
        <img
          src={logoBase64}
          width={140}
          height={140}
          style={{ objectFit: "contain", marginBottom: 8 }}
        />

        {/* Wordmark */}
        <div
          style={{
            fontSize: 36,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "#fff",
            marginBottom: 22,
          }}
        >
          ZeniPay
        </div>

        {/* Headline — line 1 */}
        <div
          style={{
            display: "flex",
            fontSize: 52,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.08,
            color: "#fff",
          }}
        >
          The first online bank with
        </div>
        {/* Headline — line 2 (accent color) */}
        <div
          style={{
            display: "flex",
            fontSize: 52,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.08,
            color: "#34d399",
            marginTop: 4,
          }}
        >
          AI-intelligent wallets.
        </div>

        {/* Agent strip */}
        <div
          style={{
            marginTop: 28,
            fontSize: 20,
            color: "rgba(255,255,255,0.7)",
            fontWeight: 500,
            letterSpacing: "0.01em",
            textAlign: "center",
          }}
        >
          Leo · Ben · Atlas · Vera · Kai — built into every account
        </div>

        {/* URL */}
        <div
          style={{
            position: "absolute",
            bottom: 28,
            fontSize: 18,
            color: "rgba(255,255,255,0.45)",
            letterSpacing: "0.04em",
          }}
        >
          zenipay.ca
        </div>
      </div>
    ),
    { ...size }
  );
}
