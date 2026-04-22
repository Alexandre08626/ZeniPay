// /agents/cards/[id]/mock-reveal?token=HMAC&exp=EPOCH
//
// Server component — validates the HMAC + TTL, then renders a fake PAN
// derived deterministically from the card id so Mock demos still look
// plausible. Expired or tampered tokens render a big red "EXPIRED".
//
// This page exists only for MockIssuingProvider cards. Real Stripe Issuing
// cards use the Stripe-hosted reveal iframe via ephemeralKeys.

import crypto from "node:crypto";

interface PageProps {
  params: Promise<{ id: string }> | { id: string };
  searchParams: Promise<{ token?: string; exp?: string }> | { token?: string; exp?: string };
}

function fakePan(cardId: string): { pan: string; cvc: string; exp: string } {
  const h = crypto.createHash("sha256").update(cardId).digest("hex");
  const digits = h.replace(/[^0-9]/g, "").padStart(32, "0");
  return {
    pan: `4242 ${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8, 12)}`,
    cvc: digits.slice(12, 15),
    exp: `${(parseInt(digits.slice(15, 17)) % 12) + 1}/${29}`,
  };
}

export default async function MockReveal({ params, searchParams }: PageProps) {
  const { id } = await Promise.resolve(params);
  const qs = await Promise.resolve(searchParams);
  const token = qs.token ?? "";
  const exp = Number(qs.exp ?? "0");
  const now = Math.floor(Date.now() / 1000);

  const secret = process.env.ZP_CARD_REVEAL_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const payload = `${id}.${exp}`;
  const want = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const validSig = token === want;
  const expired = !exp || exp < now;

  const style = { maxWidth: 480, margin: "80px auto", padding: 24, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" };

  if (!validSig || expired) {
    return (
      <main style={style}>
        <h1 style={{ fontSize: 28, color: "#DC2626" }}>{expired ? "Token expired" : "Invalid token"}</h1>
        <p style={{ color: "#64748b" }}>Request a new reveal URL from the dashboard.</p>
      </main>
    );
  }

  const { pan, cvc, exp: expMM } = fakePan(id);
  return (
    <main style={style}>
      <p style={{ fontSize: 11, letterSpacing: "0.12em", color: "#64748b", textTransform: "uppercase" }}>
        Mock card · Single-view reveal · Do not record
      </p>
      <div
        style={{
          marginTop: 16,
          padding: 28,
          borderRadius: 20,
          background: "linear-gradient(135deg, #0d1633 0%, #1a2a5e 40%, #2A8FE0 80%, #7B4FBF 100%)",
          color: "white",
          boxShadow: "0 24px 60px rgba(15,23,42,0.25)",
        }}
      >
        <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.2em" }}>ZENIPAY · VISA</p>
        <p style={{ margin: "18px 0 0", fontSize: 22, letterSpacing: "0.2em" }}>{pan}</p>
        <div style={{ display: "flex", marginTop: 18, justifyContent: "space-between", fontSize: 13 }}>
          <div>
            <div style={{ fontSize: 9, opacity: 0.6 }}>EXP</div>
            <div>{expMM}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, opacity: 0.6 }}>CVC</div>
            <div>{cvc}</div>
          </div>
        </div>
      </div>
      <p style={{ marginTop: 14, fontSize: 11, color: "#64748b" }}>
        Valid {Math.max(0, exp - now)}s. Reloads will refuse after expiry.
      </p>
    </main>
  );
}
