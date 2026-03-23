"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useParams } from "next/navigation";
import ZeniPayLogo from "@/components/ZeniPayLogo";

const ZP_GRAD = "linear-gradient(135deg, #2DBE60 0%, #15B8C9 45%, #7B4FBF 100%)";
const ZP_DARK = "linear-gradient(150deg, #0d1633 0%, #1a2a5e 50%, #0f2040 100%)";

function formatCard(v: string) {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}
function cardType(v: string) {
  const n = v.replace(/\D/g, "");
  if (n.startsWith("4")) return "visa";
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return "mastercard";
  if (/^3[47]/.test(n)) return "amex";
  return "generic";
}

function PayLinkContent() {
  const SANDBOX_MODE = true; // Maintenance mode active

  const params   = useSearchParams();
  const { id }   = useParams<{ id: string }>();

  // Support both long-form params (from create-link) and short-form (legacy)
  const amount   = Number(params.get("amount") || params.get("a") || "0");
  const currency = (params.get("currency") || params.get("c") || "USD").toUpperCase();
  const desc     = params.get("desc") || params.get("d") || "";
  const merchant = params.get("m") || "Zeniva Travel";

  const [cardNum, setCardNum] = useState("");
  const [name,    setName]    = useState("");
  const [expiry,  setExpiry]  = useState("");
  const [cvc,     setCvc]     = useState("");
  const [focused, setFocused] = useState<"card" | "name" | "expiry" | "cvc" | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState("");
  const [particles, setParticles] = useState<{ x: number; y: number; c: string; r: number; vx: number; vy: number; a: number }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);

  const ct = cardType(cardNum);
  const fmtMoney = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);

  // Confetti on success
  useEffect(() => {
    if (!success) return;
    const cols = ["#2DBE60", "#15B8C9", "#7B4FBF", "#F5A623", "#fff"];
    setParticles(Array.from({ length: 80 }, () => ({
      x: Math.random() * window.innerWidth, y: -20,
      c: cols[Math.floor(Math.random() * cols.length)],
      r: 4 + Math.random() * 6,
      vx: (Math.random() - 0.5) * 4, vy: 3 + Math.random() * 4, a: 1,
    })));
  }, [success]);

  useEffect(() => {
    if (!success || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const ctx = canvas.getContext("2d")!;
    let pts = [...particles];
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts = pts.map(p => ({ ...p, y: p.y + p.vy, x: p.x + p.vx, a: p.a - 0.012 })).filter(p => p.a > 0);
      pts.forEach(p => {
        ctx.save(); ctx.globalAlpha = p.a; ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      });
      if (pts.length > 0) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [success, particles]);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNum.replace(/\s/g, "") || !name || !expiry || !cvc) {
      setError("Please fill in all card details."); return;
    }
    setError(""); setLoading(true);
    try {
      await fetch("/api/zenipay/record-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pay_link_id: id,
          amount,
          currency,
          description: desc,
          customer_name: name,
          card_last4: cardNum.replace(/\s/g, "").slice(-4),
        }),
      });
      setSuccess(true);
    } catch {
      setError("Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ minHeight: "100vh", background: ZP_DARK, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', system-ui, sans-serif" }}>
        <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 10 }} />
        <div style={{ textAlign: "center", color: "#fff", padding: 32 }}>
          <div style={{ fontSize: 72, marginBottom: 16 }}>✅</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 8px" }}>Payment Confirmed!</h1>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 16, margin: "0 0 8px" }}>{fmtMoney(amount)} — {desc || "Payment"}</p>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Ref: {id}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: ZP_DARK, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <ZeniPayLogo size={180} showWordmark />
        </div>

        {/* Amount card */}
        <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "20px 24px", marginBottom: 20, textAlign: "center" }}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 6 }}>AMOUNT DUE</div>
          <div style={{ fontSize: 42, fontWeight: 900, background: ZP_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-1px" }}>
            {fmtMoney(amount)}
          </div>
          {desc && <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 6 }}>{desc}</div>}
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 4 }}>via {merchant}</div>
        </div>

        {/* Payment form */}
        <form onSubmit={handlePay} style={{ background: "#fff", borderRadius: 20, padding: "28px 28px 24px", boxShadow: "0 8px 48px rgba(0,0,0,0.3)" }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 20px", color: "#0D1B3A" }}>Card Details</h2>

          {/* Card number */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", display: "block", marginBottom: 6, letterSpacing: "0.06em" }}>CARD NUMBER</label>
            <input
              value={cardNum} onChange={e => setCardNum(formatCard(e.target.value))}
              placeholder="1234 5678 9012 3456" maxLength={19}
              onFocus={() => setFocused("card")} onBlur={() => setFocused(null)}
              style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${focused === "card" ? "#15B8C9" : "#E2E8F0"}`, fontSize: 15, fontFamily: "monospace", outline: "none", boxSizing: "border-box", color: "#0D1B3A", background: "#F8FAFC" }}
            />
            {ct !== "generic" && <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>✓ {ct.charAt(0).toUpperCase() + ct.slice(1)} detected</div>}
          </div>

          {/* Name */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", display: "block", marginBottom: 6, letterSpacing: "0.06em" }}>CARDHOLDER NAME</label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="Jane Smith"
              onFocus={() => setFocused("name")} onBlur={() => setFocused(null)}
              style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${focused === "name" ? "#15B8C9" : "#E2E8F0"}`, fontSize: 14, outline: "none", boxSizing: "border-box", color: "#0D1B3A", background: "#F8FAFC" }}
            />
          </div>

          {/* Expiry + CVC */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", display: "block", marginBottom: 6, letterSpacing: "0.06em" }}>EXPIRY</label>
              <input
                value={expiry}
                onChange={e => {
                  let v = e.target.value.replace(/\D/g, "").slice(0, 4);
                  if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2);
                  setExpiry(v);
                }}
                placeholder="MM/YY" maxLength={5}
                onFocus={() => setFocused("expiry")} onBlur={() => setFocused(null)}
                style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${focused === "expiry" ? "#15B8C9" : "#E2E8F0"}`, fontSize: 14, outline: "none", boxSizing: "border-box", color: "#0D1B3A", background: "#F8FAFC" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", display: "block", marginBottom: 6, letterSpacing: "0.06em" }}>CVC</label>
              <input
                value={cvc} onChange={e => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="123" maxLength={4}
                onFocus={() => { setFocused("cvc"); setFlipped(true); }}
                onBlur={() => { setFocused(null); setFlipped(false); }}
                style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${focused === "cvc" ? "#15B8C9" : "#E2E8F0"}`, fontSize: 14, outline: "none", boxSizing: "border-box", color: "#0D1B3A", background: "#F8FAFC" }}
              />
            </div>
          </div>

          {error && <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(220,38,38,0.08)", color: "#DC2626", fontSize: 13, marginBottom: 14, fontWeight: 600 }}>{error}</div>}

          {SANDBOX_MODE && (
            <div style={{ padding: 14, borderRadius: 12, background: "#FEF3C7", border: "1px solid #FBBF24", marginBottom: 14 }}>
              <p style={{ margin: "0 0 10px", fontWeight: 700, color: "#92400E", fontSize: 14 }}>
                ⚠️ Payment system temporarily unavailable
              </p>
              <p style={{ margin: "0 0 12px", color: "#78350F", fontSize: 13, lineHeight: 1.5 }}>
                Please contact us directly to complete your booking.
              </p>
              <a href="mailto:info@zeniva.ca" style={{
                display: "inline-block", background: "#F59E0B", color: "white",
                padding: "10px 18px", borderRadius: 8, textDecoration: "none",
                fontWeight: 700, fontSize: 13, cursor: "pointer"
              }}>
                📧 Email info@zeniva.ca
              </a>
            </div>
          )}

          <button
            type="submit" disabled={loading || SANDBOX_MODE}
            style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: loading || SANDBOX_MODE ? "#94A3B8" : ZP_GRAD, color: "#fff", fontSize: 16, fontWeight: 900, cursor: loading || SANDBOX_MODE ? "not-allowed" : "pointer", letterSpacing: "0.02em", opacity: SANDBOX_MODE ? 0.6 : 1 }}
          >
            {SANDBOX_MODE ? "🔒 Payment Disabled" : loading ? "Processing…" : `Pay ${fmtMoney(amount)}`}
          </button>

          <div style={{ textAlign: "center", marginTop: 14, fontSize: 11, color: "#94A3B8", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            🔒 Secured by ZeniPay · {id}
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PayLinkPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#0d1633", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #15B8C9", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <PayLinkContent />
    </Suspense>
  );
}
