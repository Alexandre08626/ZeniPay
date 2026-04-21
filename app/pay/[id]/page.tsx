"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useParams } from "next/navigation";
import ZeniPayLogo from "@/components/ZeniPayLogo";
import { useT, LangToggle } from "../../../modules/zenipay/i18n";

declare global {
  interface Window { Finix?: any; }
}

const ZP_GRAD = "linear-gradient(135deg, #2DBE60 0%, #15B8C9 45%, #7B4FBF 100%)";
const ZP_DARK = "linear-gradient(150deg, #0d1633 0%, #1a2a5e 50%, #0f2040 100%)";

const FINIX_APP_ID = process.env.NEXT_PUBLIC_FINIX_APPLICATION_ID || "APtwKWGqFSEfsecvWcphUgbR";
const FINIX_ENV = process.env.NEXT_PUBLIC_FINIX_ENV === "production" ? "live" : "sandbox";
const FINIX_MERCHANT_ID = process.env.NEXT_PUBLIC_FINIX_MERCHANT_ID || "MUcTenaz57m9JrwwRZwpSfDc";

function PayLinkContent() {
  const SANDBOX_MODE = false; // Live — Finix.js tokenization active
  const { t } = useT();

  const params   = useSearchParams();
  const { id }   = useParams<{ id: string }>();

  // Support both long-form params (from create-link) and short-form (legacy)
  const amount   = Number(params.get("amount") || params.get("a") || "0");
  const currency = (params.get("currency") || params.get("c") || "USD").toUpperCase();
  const desc     = params.get("desc") || params.get("d") || "";
  const merchant = params.get("m") || "Merchant";

  const [name,    setName]    = useState("");
  const [email,   setEmail]   = useState("");
  const [focused, setFocused] = useState<"name" | "email" | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState("");
  const [finixReady, setFinixReady] = useState(false);
  const [fraudSessionId, setFraudSessionId] = useState<string>("");
  const [paymentResult, setPaymentResult] = useState<{ paymentId?: string; transferId?: string; card?: { brand?: string; last4?: string }; state?: string } | null>(null);
  const [linkMerchantId, setLinkMerchantId] = useState<string | null>(null);
  const [particles, setParticles] = useState<{ x: number; y: number; c: string; r: number; vx: number; vy: number; a: number }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const finixFormRef = useRef<any>(null);

  // Fetch merchant_id from pay link
  useEffect(() => {
    if (!id) return;
    fetch(`/api/zenipay/link-info?id=${encodeURIComponent(id)}`)
      .then(r => r.json())
      .then(d => { if (d.merchant_id) setLinkMerchantId(d.merchant_id); })
      .catch(() => {});
  }, [id]);

  const fmtMoney = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);

  // Load Finix.js and mount tokenized card fields (PCI-compliant iframes)
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://js.finix.com/v/1/finix.js";
    script.async = true;
    script.onload = () => {
      if (!window.Finix) return;
      const form = window.Finix.CardTokenForm("finix-form", {
        applicationId: FINIX_APP_ID,
        environment: FINIX_ENV,
        showAddress: false,
        hideFields: ["name"],
        showLabels: true,
        labels: {
          number: "CARD NUMBER",
          expiration_date: "EXPIRY",
          security_code: "CVC",
        },
        placeholders: {
          number: "4111 1111 1111 1111",
          expiration_date: "MM / YY",
          security_code: "CVV",
        },
        onLoad: () => setFinixReady(true),
        styles: {
          default: {
            fontSize: "15px",
            fontFamily: "system-ui, -apple-system, sans-serif",
            color: "#0D1B3A",
            border: "1.5px solid #E2E8F0",
            borderRadius: "10px",
            padding: "12px 14px",
            backgroundColor: "#F8FAFC",
            boxSizing: "border-box",
          },
          focus: { border: "1.5px solid #15B8C9" },
          error: { border: "1.5px solid #DC2626", color: "#DC2626" },
        },
      });
      finixFormRef.current = form;

      // Finix fraud-detection session (required for cert Step 3 on every transfer).
      try {
        window.Finix.Auth(FINIX_ENV, FINIX_MERCHANT_ID, (sessionKey: string) => {
          if (sessionKey) setFraudSessionId(sessionKey);
        });
      } catch (e) {
        console.error("Finix.Auth init failed:", e);
      }
    };
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, []);

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
    if (!name) {
      setError(t("checkout.fillAllFields")); return;
    }
    if (!finixFormRef.current) {
      setError("Payment form is still loading. Please wait a moment and try again."); return;
    }
    setError(""); setLoading(true);

    try {
      // Tokenize card via Finix.js (card data never touches our server)
      finixFormRef.current.submit(FINIX_ENV, FINIX_APP_ID, async (err: any, res: any) => {
        try {
          if (err) {
            console.error("Finix tokenization error:", err);
            setError(err?.message || "Card tokenization failed. Please check your card details.");
            setLoading(false);
            return;
          }

          const instrumentId = res?.data?.id;
          if (!instrumentId) {
            setError("Card tokenization failed. Please try again.");
            setLoading(false);
            return;
          }

          // Send instrument ID to server (no card data)
          const response = await fetch("/api/zenipay/finix/process-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pay_link_id: id,
              amount,
              currency,
              description: desc,
              customer_name: name,
              customer_email: email,
              instrument_id: instrumentId,
              merchant_id: linkMerchantId || undefined,
              fraud_session_id: fraudSessionId || undefined,
            }),
          });

          const data = await response.json();

          if (!response.ok || !data.success) {
            setError(data.message || data.error || t("checkout.paymentDeclined"));
            setLoading(false);
            return;
          }

          // 3D Secure: redirect customer for card issuer authentication
          if (data.requires_3ds && data.redirect_url) {
            window.location.href = data.redirect_url;
            return;
          }

          // Payment succeeded or pending — store result for confirmation screen
          if (data.state === "SUCCEEDED" || data.state === "PENDING") {
            setPaymentResult(data);
            setSuccess(true);
          } else {
            setError(t("checkout.paymentCouldNotProcess"));
          }
        } catch (innerErr) {
          console.error("Payment error:", innerErr);
          setError(t("checkout.paymentFailed"));
        } finally {
          setLoading(false);
        }
      });
    } catch (err) {
      console.error("Payment error:", err);
      setError(t("checkout.paymentFailed"));
      setLoading(false);
    }
  };

  if (success) {
    const pr = paymentResult;
    return (
      <div style={{ minHeight: "100vh", background: ZP_DARK, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', system-ui, sans-serif" }}>
        <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 10 }} />
        <div style={{ textAlign: "center", color: "#fff", padding: 32, maxWidth: 480 }}>
          <div style={{ fontSize: 72, marginBottom: 16 }}>✅</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 8px" }}>{t("checkout.paymentConfirmed")}</h1>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 16, margin: "0 0 16px" }}>{fmtMoney(amount)} — {desc || "Payment"}</p>

          {/* Payment details */}
          <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "20px 24px", textAlign: "left" }}>
            {[
              { label: t("checkout.transactionId"), value: pr?.paymentId || "—" },
              { label: t("checkout.status"), value: pr?.state === "SUCCEEDED" ? "Succeeded" : pr?.state || "Confirmed" },
              { label: t("checkout.amount"), value: fmtMoney(amount) },
              { label: t("checkout.card"), value: pr?.card ? `${pr.card.brand || "Card"} ••••${pr.card.last4 || ""}` : "—" },
              { label: t("checkout.description"), value: desc || "—" },
              { label: t("checkout.payLink"), value: id },
              { label: t("checkout.date"), value: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>{r.label}</span>
                <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{r.value}</span>
              </div>
            ))}
          </div>

          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 16 }}>{t("checkout.receiptSent")}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: ZP_DARK, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @media (max-width: 768px) {
          .zp-checkout-form { padding: 20px 18px 18px !important; }
          .zp-checkout-amount { font-size: 32px !important; }
          .zp-checkout-logo { transform: scale(0.85); }
        }
      `}</style>
      <div style={{ width: "100%", maxWidth: 440 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 24, position: "relative" }}>
          <span className="zp-checkout-logo"><ZeniPayLogo size={180} showWordmark /></span>
          <div style={{ position: "absolute", top: 0, right: 0 }}><LangToggle /></div>
        </div>

        {/* Amount card */}
        <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "20px 24px", marginBottom: 20, textAlign: "center" }}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 6 }}>{t("checkout.amountDue")}</div>
          <div className="zp-checkout-amount" style={{ fontSize: 42, fontWeight: 900, background: ZP_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-1px" }}>
            {fmtMoney(amount)}
          </div>
          {desc && <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 6 }}>{desc}</div>}
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 4 }}>via {merchant}</div>
        </div>

        {/* Payment form */}
        <form onSubmit={handlePay} className="zp-checkout-form" style={{ background: "#fff", borderRadius: 20, padding: "28px 28px 24px", boxShadow: "0 8px 48px rgba(0,0,0,0.3)" }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 20px", color: "#0D1B3A" }}>{t("checkout.cardDetails")}</h2>

          {/* Name */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", display: "block", marginBottom: 6, letterSpacing: "0.06em" }}>{t("checkout.cardholderName")}</label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="Jane Smith"
              onFocus={() => setFocused("name")} onBlur={() => setFocused(null)}
              style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${focused === "name" ? "#15B8C9" : "#E2E8F0"}`, fontSize: 14, outline: "none", boxSizing: "border-box", color: "#0D1B3A", background: "#F8FAFC" }}
            />
          </div>

          {/* Email */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", display: "block", marginBottom: 6, letterSpacing: "0.06em" }}>{t("checkout.emailReceipt")}</label>
            <input
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@email.com" type="email"
              onFocus={() => setFocused("email")} onBlur={() => setFocused(null)}
              style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${focused === "email" ? "#15B8C9" : "#E2E8F0"}`, fontSize: 14, outline: "none", boxSizing: "border-box", color: "#0D1B3A", background: "#F8FAFC" }}
            />
          </div>

          {/* Finix.js secure iframes (card number, expiry, CVC) */}
          <div id="finix-form" style={{ marginBottom: 16 }} />
          {!finixReady && <div style={{ padding: "10px 14px", color: "#64748B", fontSize: 13, marginBottom: 14 }}>{t("checkout.processing")}…</div>}

          {error && <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(220,38,38,0.08)", color: "#DC2626", fontSize: 13, marginBottom: 14, fontWeight: 600 }}>{error}</div>}

          {SANDBOX_MODE && (
            <div style={{ padding: 14, borderRadius: 12, background: "#FEF3C7", border: "1px solid #FBBF24", marginBottom: 14 }}>
              <p style={{ margin: "0 0 10px", fontWeight: 700, color: "#92400E", fontSize: 14 }}>
                ⚠️ {t("checkout.maintenanceTitle")}
              </p>
              <p style={{ margin: "0 0 12px", color: "#78350F", fontSize: 13, lineHeight: 1.5 }}>
                {t("checkout.maintenanceDesc")}
              </p>
              <button
                type="button"
                onClick={() => window.location.href = "mailto:zenipay@zeniva.ca"}
                style={{
                  background: "#F59E0B", color: "white",
                  padding: "10px 18px", borderRadius: 8, border: "none",
                  fontWeight: 700, fontSize: 13, cursor: "pointer"
                }}
              >
                📧 {t("checkout.maintenanceEmail")}
              </button>
            </div>
          )}

          <button
            type="submit" disabled={loading}
            style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: loading ? "#94A3B8" : ZP_GRAD, color: "#fff", fontSize: 16, fontWeight: 900, cursor: loading ? "not-allowed" : "pointer", letterSpacing: "0.02em" }}
          >
            {loading ? t("checkout.processing") : `Pay ${fmtMoney(amount)}`}
          </button>

          <div style={{ textAlign: "center", marginTop: 14, fontSize: 11, color: "#94A3B8", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            🔒 {t("checkout.securedByZeniPay")} | <a href="/terms" style={{color:"rgba(255,255,255,0.4)",textDecoration:"none"}}>{t("checkout.terms")}</a> | <a href="/privacy" style={{color:"rgba(255,255,255,0.4)",textDecoration:"none"}}>{t("checkout.privacy")}</a> · {id}
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
