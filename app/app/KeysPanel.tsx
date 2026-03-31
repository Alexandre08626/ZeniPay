"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useT } from "../../modules/zenipay/i18n";

// ─── Brand / Theme ──────────────────────────────────────
const ZP_GREEN  = "#2DBE60";
const ZP_CYAN   = "#15B8C9";
const ZP_PURPLE = "#7B4FBF";
const CARD_BG   = "#ffffff";
const BORDER    = "#e2e8f0";
const TEXT      = "#0f172a";
const MUTED     = "#64748b";
const LIGHT     = "#94a3b8";
const KEY_BG    = "#F8FAFC";
const CODE_BG   = "#1e293b";
const GRAD_BORDER = "linear-gradient(90deg, #2DBE60, #15B8C9, #7B4FBF)";

// ─── Props ──────────────────────────────────────────────
interface KeysPanelProps {
  merchantId: string;
  mode: "sandbox" | "live";
  sandboxKey?: string;
  sandboxSecret?: string;
  liveKey?: string;
}

// ─── Helpers ────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <button
      onClick={copy}
      style={{
        background: copied ? "rgba(45,190,96,0.1)" : "#E2E8F0",
        border: `1px solid ${copied ? "rgba(45,190,96,0.4)" : BORDER}`,
        color: copied ? ZP_GREEN : MUTED,
        padding: "6px 14px",
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 700,
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.15s ease",
      }}
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

function EyeToggle({ revealed, onToggle }: { revealed: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      title={revealed ? "Hide" : "Reveal"}
      style={{
        background: "none",
        border: `1px solid ${BORDER}`,
        borderRadius: 8,
        padding: "6px 10px",
        cursor: "pointer",
        color: MUTED,
        fontSize: 14,
        lineHeight: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {revealed ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );
}

function SectionTitle({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
      {icon}
      <h3 style={{ fontSize: 17, fontWeight: 800, color: TEXT, margin: 0 }}>{children}</h3>
    </div>
  );
}

function KeyRow({
  label,
  value,
  masked,
  maskChar = "•",
  revealable = true,
  alwaysMaskedExceptLast4 = false,
}: {
  label: string;
  value: string;
  masked?: boolean;
  maskChar?: string;
  revealable?: boolean;
  alwaysMaskedExceptLast4?: boolean;
}) {
  const [revealed, setRevealed] = useState(false);

  const displayValue = (() => {
    if (alwaysMaskedExceptLast4) {
      return maskChar.repeat(Math.max(0, value.length - 4)) + value.slice(-4);
    }
    if (!revealable) return value;
    if (revealed) return value;
    return maskChar.repeat(value.length);
  })();

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: MUTED, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div
        className="kp-key-display"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: KEY_BG,
          padding: "14px 18px",
          borderRadius: 10,
          border: `1px solid ${BORDER}`,
        }}
      >
        <code
          style={{
            flex: 1,
            fontFamily: "monospace",
            fontSize: 13,
            color: TEXT,
            wordBreak: "break-all",
            lineHeight: 1.5,
          }}
        >
          {displayValue}
        </code>
        {revealable && !alwaysMaskedExceptLast4 && (
          <EyeToggle revealed={revealed} onToggle={() => setRevealed(!revealed)} />
        )}
        <CopyBtn text={value} />
      </div>
    </div>
  );
}

function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
  loading,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          background: CARD_BG,
          border: `1px solid ${BORDER}`,
          borderRadius: 20,
          width: "100%",
          maxWidth: 440,
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "20px 24px",
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 800, color: TEXT }}>{title}</div>
        </div>
        <div style={{ padding: "20px 24px" }}>
          <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, margin: "0 0 20px" }}>{message}</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              onClick={onCancel}
              style={{
                background: KEY_BG,
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
                padding: "10px 20px",
                fontSize: 13,
                fontWeight: 700,
                color: TEXT,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              style={{
                background: "#EF4444",
                border: "none",
                borderRadius: 10,
                padding: "10px 20px",
                fontSize: 13,
                fontWeight: 700,
                color: "#fff",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? "Rolling..." : "Roll Keys"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Code Tabs ──────────────────────────────────────────
const LANGS = ["Node.js", "Python", "cURL"] as const;
type Lang = (typeof LANGS)[number];

function getSnippets(publishableKey: string): Record<Lang, { install: string; init: string; payment: string; webhook: string }> {
  return {
    "Node.js": {
      install: `npm install @zenipay/node`,
      init: `import ZeniPay from "@zenipay/node";

const zenipay = new ZeniPay("${publishableKey}");`,
      payment: `const payment = await zenipay.payments.create({
  amount: 2500,       // $25.00 in cents
  currency: "cad",
  description: "Order #1234",
  customer_email: "user@example.com",
  return_url: "https://yoursite.com/success",
});

console.log(payment.checkout_url);`,
      webhook: `import { verifyWebhookSignature } from "@zenipay/node";

app.post("/webhooks/zenipay", (req, res) => {
  const sig = req.headers["zenipay-signature"];
  const event = verifyWebhookSignature(
    req.body,
    sig,
    process.env.ZENIPAY_WEBHOOK_SECRET
  );

  switch (event.type) {
    case "payment.completed":
      console.log("Payment received:", event.data.id);
      break;
    case "payment.failed":
      console.log("Payment failed:", event.data.id);
      break;
  }

  res.json({ received: true });
});`,
    },
    Python: {
      install: `pip install zenipay`,
      init: `import zenipay

client = zenipay.Client("${publishableKey}")`,
      payment: `payment = client.payments.create(
    amount=2500,          # $25.00 in cents
    currency="cad",
    description="Order #1234",
    customer_email="user@example.com",
    return_url="https://yoursite.com/success",
)

print(payment.checkout_url)`,
      webhook: `from zenipay import verify_webhook_signature
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/webhooks/zenipay", methods=["POST"])
def webhook():
    sig = request.headers.get("zenipay-signature")
    event = verify_webhook_signature(
        request.data,
        sig,
        WEBHOOK_SECRET,
    )

    if event["type"] == "payment.completed":
        print("Payment received:", event["data"]["id"])

    return jsonify(received=True)`,
    },
    cURL: {
      install: `# No installation needed`,
      init: `# Set your API key
export ZENIPAY_KEY="${publishableKey}"`,
      payment: `curl -X POST https://api.zenipay.ca/v1/payments \\
  -H "Authorization: Bearer $ZENIPAY_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 2500,
    "currency": "cad",
    "description": "Order #1234",
    "customer_email": "user@example.com",
    "return_url": "https://yoursite.com/success"
  }'`,
      webhook: `# Verify webhooks by comparing HMAC-SHA256 signatures
# The signing secret is used as the HMAC key

# Example in bash:
PAYLOAD='{"type":"payment.completed",...}'
SIGNATURE=$(echo -n "$PAYLOAD" | \\
  openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | \\
  awk '{print $2}')

echo "Computed: $SIGNATURE"`,
    },
  };
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div style={{ position: "relative" }}>
      <pre
        style={{
          background: CODE_BG,
          borderRadius: 10,
          padding: "16px 18px",
          margin: 0,
          overflowX: "auto",
          fontSize: 12.5,
          lineHeight: 1.65,
          fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace",
          color: "#e2e8f0",
          border: "1px solid #334155",
        }}
      >
        <code>{code}</code>
      </pre>
      <div style={{ position: "absolute", top: 10, right: 10 }}>
        <CopyBtn text={code} />
      </div>
    </div>
  );
}

function QuickStartGuide({ publishableKey }: { publishableKey: string }) {
  const [lang, setLang] = useState<Lang>("Node.js");
  const snippets = getSnippets(publishableKey);
  const s = snippets[lang];

  const steps = [
    { title: "Install", code: s.install },
    { title: "Initialize", code: s.init },
    { title: "Create a Payment", code: s.payment },
    { title: "Verify Webhooks", code: s.webhook },
  ];

  return (
    <div>
      {/* Language tabs */}
      <div className="kp-lang-tabs" style={{ display: "flex", gap: 4, marginBottom: 20, background: KEY_BG, borderRadius: 10, padding: 4, border: `1px solid ${BORDER}` }}>
        {LANGS.map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            style={{
              flex: 1,
              padding: "8px 14px",
              borderRadius: 8,
              border: "none",
              background: lang === l ? CARD_BG : "transparent",
              color: lang === l ? TEXT : MUTED,
              fontWeight: 700,
              fontSize: 12.5,
              cursor: "pointer",
              boxShadow: lang === l ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {steps.map((step, i) => (
          <div key={i}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${ZP_GREEN}, ${ZP_CYAN})`,
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {i + 1}
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{step.title}</span>
            </div>
            <CodeBlock code={step.code} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────
export default function KeysPanel({ merchantId, mode, sandboxKey: propSbKey, sandboxSecret: propSbSecret, liveKey: propLiveKey }: KeysPanelProps) {
  const { t } = useT();
  const [sbKey, setSbKey] = useState(propSbKey || "");
  const [sbSecret, setSbSecret] = useState(propSbSecret || "");
  const [liveKey, setLiveKey] = useState(propLiveKey || "");
  const [liveSecret, setLiveSecret] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [rolling, setRolling] = useState(false);
  const [showRollConfirm, setShowRollConfirm] = useState(false);
  const [error, setError] = useState("");

  // ── Load keys on mount ────────────────────────────────
  const loadKeys = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/zenipay/merchant-info?id=${merchantId}`);
      if (!res.ok) throw new Error("Failed to load keys");
      const data = await res.json();
      if (data.sandboxKey) setSbKey(data.sandboxKey);
      if (data.sandboxSecret) setSbSecret(data.sandboxSecret);
      if (data.liveKey) setLiveKey(data.liveKey);
      if (data.liveSecret) setLiveSecret(data.liveSecret);
      if (data.webhookSecret) setWebhookSecret(data.webhookSecret);
    } catch (e: any) {
      setError(e.message || "Failed to load keys");
    } finally {
      setLoading(false);
    }
  }, [merchantId]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  // ── Roll sandbox keys ─────────────────────────────────
  const rollSandboxKeys = async () => {
    try {
      setRolling(true);
      const res = await fetch("/api/zenipay/merchants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "roll_sandbox_keys", merchant_id: merchantId }),
      });
      if (!res.ok) throw new Error("Failed to roll keys");
      const data = await res.json();
      if (data.sandboxKey) setSbKey(data.sandboxKey);
      if (data.sandboxSecret) setSbSecret(data.sandboxSecret);
      setShowRollConfirm(false);
    } catch (e: any) {
      setError(e.message || "Failed to roll keys");
    } finally {
      setRolling(false);
    }
  };

  // ── Shared card style ─────────────────────────────────
  const cardStyle: React.CSSProperties = {
    background: CARD_BG,
    borderRadius: 16,
    padding: 24,
    border: `1px solid ${BORDER}`,
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  };

  const isLive = mode === "live";
  const activeKey = isLive && liveKey ? liveKey : sbKey;

  // ── Loading state ─────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ ...cardStyle, height: 120 }}>
            <div
              style={{
                width: "40%",
                height: 14,
                background: "#e2e8f0",
                borderRadius: 6,
                marginBottom: 14,
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
            <div
              style={{
                width: "80%",
                height: 44,
                background: "#f1f5f9",
                borderRadius: 10,
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          </div>
        ))}
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <style>{`
        @media (max-width: 768px) {
          .kp-lang-tabs { overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; flex-wrap: nowrap !important; }
          .kp-lang-tabs button { flex: 0 0 auto !important; white-space: nowrap !important; min-width: unset !important; padding: 8px 12px !important; }
          .kp-key-display code { font-size: 11px !important; word-break: break-all !important; }
          .kp-key-display { flex-wrap: wrap !important; gap: 6px !important; }
          .kp-card { padding: 16px !important; }
          .kp-roll-row { flex-direction: column !important; align-items: stretch !important; gap: 8px !important; }
          .kp-roll-row button { width: 100% !important; }
        }
      `}</style>
      {/* ─── Error Banner ──────────────────────────────── */}
      {error && (
        <div
          style={{
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: 12,
            padding: "12px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 13, color: "#DC2626", fontWeight: 600 }}>{error}</span>
          <button
            onClick={() => setError("")}
            style={{ background: "none", border: "none", color: "#DC2626", cursor: "pointer", fontWeight: 800, fontSize: 16 }}
          >
            ×
          </button>
        </div>
      )}

      {/* ═══ Section 1: Sandbox API Keys ═══════════════ */}
      <div style={cardStyle}>
        <SectionTitle
          icon={
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: "rgba(245,166,35,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 9.9-1" />
              </svg>
            </div>
          }
        >
          {t("keys.sandboxApiKeys")}
        </SectionTitle>

        <KeyRow label={t("keys.publishableKey")} value={sbKey || "zpk_sb_..."} revealable />
        <KeyRow label={t("keys.secretKey")} value={sbSecret || "zps_sb_..."} revealable />

        <div style={{ marginTop: 8 }}>
          <button
            onClick={() => setShowRollConfirm(true)}
            style={{
              background: "none",
              border: `1px solid ${BORDER}`,
              borderRadius: 10,
              padding: "10px 18px",
              fontSize: 13,
              fontWeight: 700,
              color: "#EF4444",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "#FEF2F2";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#FECACA";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "none";
              (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER;
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            {t("keys.rollKeys")}
          </button>
        </div>
      </div>

      {/* ═══ Section 2: Live API Keys ══════════════════ */}
      {isLive ? (
        <div style={cardStyle}>
          <SectionTitle
            icon={
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: "rgba(45,190,96,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ZP_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
            }
          >
            {t("keys.liveApiKeys")}
          </SectionTitle>

          <KeyRow label={t("keys.publishableKey")} value={liveKey || "zpk_live_..."} revealable />
          <KeyRow
            label={t("keys.secretKey")}
            value={liveSecret || "zps_live_••••••••••••"}
            alwaysMaskedExceptLast4
          />

          <div style={{ marginTop: 6 }}>
            <p style={{ fontSize: 12, color: LIGHT, margin: 0, lineHeight: 1.5 }}>
              Live secret keys are never fully displayed. If you need a new secret key, contact support.
            </p>
          </div>
        </div>
      ) : (
        /* ── Locked live keys card ──────────────────── */
        <div style={{ position: "relative", borderRadius: 18, padding: 2, background: GRAD_BORDER }}>
          <div
            style={{
              ...cardStyle,
              borderRadius: 16,
              border: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "40px 24px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: "linear-gradient(135deg, rgba(45,190,96,0.08), rgba(123,79,191,0.08))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={ZP_PURPLE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h4 style={{ fontSize: 16, fontWeight: 800, color: TEXT, margin: "0 0 8px" }}>
              {t("keys.liveApiKeys")}
            </h4>
            <p style={{ fontSize: 14, color: MUTED, margin: "0 0 20px", lineHeight: 1.6, maxWidth: 340 }}>
              {t("keys.lockedMessage")}
            </p>
            <a
              href="/app/go-live"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: `linear-gradient(135deg, ${ZP_GREEN}, ${ZP_CYAN})`,
                color: "#fff",
                padding: "10px 24px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(45,190,96,0.3)",
              }}
            >
              {t("nav.goLive")}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      )}

      {/* ═══ Section 3: Webhook Signing Secret ═════════ */}
      <div style={cardStyle}>
        <SectionTitle
          icon={
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: "rgba(42,143,224,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2A8FE0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </div>
          }
        >
          {t("keys.webhookSigningSecret")}
        </SectionTitle>

        <p style={{ fontSize: 13, color: MUTED, margin: "0 0 14px", lineHeight: 1.6 }}>
          {t("keys.webhookSigningDesc")}
        </p>

        <KeyRow label={t("keys.signingSecret")} value={webhookSecret || "whsec_..."} revealable />
      </div>

      {/* ═══ Section 4: Quick Start Guide ═════════════ */}
      <div style={cardStyle}>
        <SectionTitle
          icon={
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: "rgba(123,79,191,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ZP_PURPLE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </div>
          }
        >
          {t("keys.quickStartGuide")}
        </SectionTitle>

        <QuickStartGuide publishableKey={activeKey || "zpk_sb_your_key_here"} />
      </div>

      {/* ─── Roll Keys Confirm Dialog ─────────────────── */}
      {showRollConfirm && (
        <ConfirmDialog
          title={t("keys.rollSandboxKeys")}
          message={t("keys.rollKeysMessage")}
          onConfirm={rollSandboxKeys}
          onCancel={() => setShowRollConfirm(false)}
          loading={rolling}
        />
      )}
    </div>
  );
}
