"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useT } from "../../modules/zenipay/i18n";

// ─── Brand ─────────────────────────────────────────────
const ZP_GREEN  = "#2DBE60";
const ZP_CYAN   = "#15B8C9";
const ZP_PURPLE = "#7B4FBF";
const ZP_BLUE   = "#2A8FE0";
const ZP_GRAD   = "linear-gradient(135deg, #2DBE60 0%, #15B8C9 45%, #7B4FBF 100%)";
const DARK      = "#0A0F1E";
const DARK2     = "#111827";
const DARK_CARD = "#1e293b";
const GLASS     = "rgba(255,255,255,0.06)";

// ─── Theme ─────────────────────────────────────────────
const PAGE_BG = "#f0f4f8";
const CARD_BG = "#ffffff";
const BORDER  = "#e2e8f0";
const TEXT    = "#0f172a";
const MUTED   = "#64748b";
const LIGHT   = "#94a3b8";

// ─── Types ─────────────────────────────────────────────
interface SandboxPanelProps {
  merchantId: string;
  sandboxKey?: string;
}

interface TestCard {
  label: string;
  number: string;
  result: "Approved" | "Declined" | "Insufficient";
  brand: "Visa" | "Mastercard";
}

interface TestPayment {
  id: string;
  amount: number;
  card: TestCard;
  customerName: string;
  customerEmail: string;
  description: string;
  status: "succeeded" | "failed";
  reason?: string;
  createdAt: string;
}

interface WebhookEvent {
  id: string;
  type: string;
  timestamp: string;
  payload: Record<string, unknown>;
  expanded: boolean;
}

interface ChecklistItem {
  key: string;
  label: string;
  checked: boolean;
}

// ─── Constants ─────────────────────────────────────────
const TEST_CARDS: TestCard[] = [
  { label: "Visa (Success)",      number: "4111 1111 1111 1111", result: "Approved",     brand: "Visa" },
  { label: "Mastercard (Success)",number: "5454 5454 5454 5454", result: "Approved",     brand: "Mastercard" },
  { label: "Visa (Decline)",      number: "4000 0000 0000 0002", result: "Declined",     brand: "Visa" },
  { label: "Insufficient Funds",  number: "4000 0000 0000 9995", result: "Insufficient", brand: "Visa" },
];

const RESULT_COLORS: Record<string, string> = {
  Approved: ZP_GREEN,
  Declined: "#EF4444",
  Insufficient: "#F59E0B",
};

const DEFAULT_CHECKLIST: Omit<ChecklistItem, "checked">[] = [
  { key: "paylink",     label: "Create a test Pay Link" },
  { key: "success",     label: "Process a successful payment" },
  { key: "decline",     label: "Process a declined payment" },
  { key: "view_tx",     label: "View transaction in dashboard" },
  { key: "webhook",     label: "Test webhook endpoint" },
];

// ─── Helpers ───────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(n);
const uid = () => "txn_" + Math.random().toString(36).slice(2, 10).toUpperCase();
const evtId = () => "evt_" + Math.random().toString(36).slice(2, 12);
const ts = () => new Date().toISOString();
const shortTs = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) +
    "." + String(d.getMilliseconds()).padStart(3, "0");
};

// ─── Shared Styles ─────────────────────────────────────
const CARD_STYLE: React.CSSProperties = {
  background: CARD_BG,
  borderRadius: 16,
  padding: 24,
  border: `1px solid ${BORDER}`,
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 10,
  background: "#f8fafc",
  border: `1px solid ${BORDER}`,
  color: TEXT,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const BTN_GRAD: React.CSSProperties = {
  background: ZP_GRAD,
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "12px 24px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  letterSpacing: "0.01em",
  transition: "opacity 0.2s, transform 0.15s",
};

// ═══════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 28,
        right: 28,
        background: DARK_CARD,
        color: "#fff",
        padding: "12px 20px",
        borderRadius: 12,
        fontSize: 13,
        fontWeight: 600,
        boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 8,
        animation: "zpToastIn 0.25s ease-out",
      }}
    >
      <span style={{ color: ZP_GREEN, fontSize: 16 }}>&#10003;</span>
      {message}
    </div>
  );
}

function CopyButton({ text, onCopy }: { text: string; onCopy: (msg: string) => void }) {
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text.replace(/\s/g, ""));
        onCopy(`Copied ${text}`);
      }}
      style={{
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.15)",
        color: "#cbd5e1",
        padding: "4px 10px",
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 700,
        cursor: "pointer",
        transition: "background 0.15s",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.15)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)"; }}
    >
      Copy
    </button>
  );
}

function ResultBadge({ result }: { result: string }) {
  const color = RESULT_COLORS[result] || MUTED;
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 800,
        padding: "3px 10px",
        borderRadius: 20,
        background: color + "20",
        color,
        border: `1px solid ${color}40`,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {result}
    </span>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: TEXT }}>{title}</h3>
      {subtitle && <p style={{ margin: "4px 0 0", fontSize: 13, color: MUTED }}>{subtitle}</p>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════

export default function SandboxPanel({ merchantId, sandboxKey }: SandboxPanelProps) {
  const { t } = useT();
  // ── State ──────────────────────────────────────────
  const [toast, setToast] = useState<string | null>(null);
  const [payments, setPayments] = useState<TestPayment[]>([]);
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([]);
  const [processing, setProcessing] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(() =>
    DEFAULT_CHECKLIST.map((c) => ({ ...c, checked: false }))
  );

  // Form state
  const [amount, setAmount] = useState("25.00");
  const [selectedCard, setSelectedCard] = useState(0);
  const [custName, setCustName] = useState("Test Customer");
  const [custEmail, setCustEmail] = useState("test@example.com");
  const [description, setDescription] = useState("Sandbox test payment");

  const paymentsEndRef = useRef<HTMLDivElement>(null);

  // ── Checklist persistence ──────────────────────────
  const checklistKey = `zp_sandbox_checklist_${merchantId}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(checklistKey);
      if (saved) {
        const parsed: Record<string, boolean> = JSON.parse(saved);
        setChecklist((prev) =>
          prev.map((c) => ({ ...c, checked: parsed[c.key] ?? c.checked }))
        );
      }
    } catch { /* ignore */ }
  }, [checklistKey]);

  const persistChecklist = useCallback(
    (items: ChecklistItem[]) => {
      const map: Record<string, boolean> = {};
      items.forEach((c) => { map[c.key] = c.checked; });
      try { localStorage.setItem(checklistKey, JSON.stringify(map)); } catch { /* ignore */ }
    },
    [checklistKey]
  );

  const markChecklist = useCallback(
    (key: string) => {
      setChecklist((prev) => {
        const next = prev.map((c) => (c.key === key ? { ...c, checked: true } : c));
        persistChecklist(next);
        return next;
      });
    },
    [persistChecklist]
  );

  const toggleChecklist = useCallback(
    (key: string) => {
      setChecklist((prev) => {
        const next = prev.map((c) => (c.key === key ? { ...c, checked: !c.checked } : c));
        persistChecklist(next);
        return next;
      });
    },
    [persistChecklist]
  );

  // ── Webhook event generator ────────────────────────
  const pushEvents = useCallback((payment: TestPayment) => {
    const base = {
      merchant_id: merchantId,
      payment_id: payment.id,
      amount: payment.amount,
      currency: "cad",
      card_brand: payment.card.brand.toLowerCase(),
      card_last4: payment.card.number.slice(-4),
      customer: { name: payment.customerName, email: payment.customerEmail },
    };

    const events: WebhookEvent[] = [
      {
        id: evtId(),
        type: "payment.created",
        timestamp: ts(),
        payload: { ...base, status: "pending" },
        expanded: false,
      },
    ];

    if (payment.status === "succeeded") {
      events.push({
        id: evtId(),
        type: "payment.succeeded",
        timestamp: ts(),
        payload: { ...base, status: "succeeded" },
        expanded: false,
      });
      events.push({
        id: evtId(),
        type: "transfer.created",
        timestamp: ts(),
        payload: {
          merchant_id: merchantId,
          transfer_id: "xfr_" + Math.random().toString(36).slice(2, 10),
          amount: payment.amount,
          currency: "cad",
          source_payment: payment.id,
          destination: "ba_sandbox",
          status: "pending",
        },
        expanded: false,
      });
    } else {
      events.push({
        id: evtId(),
        type: "payment.failed",
        timestamp: ts(),
        payload: { ...base, status: "failed", failure_reason: payment.reason || "card_declined" },
        expanded: false,
      });
    }

    setWebhookEvents((prev) => [...events, ...prev]);
  }, [merchantId]);

  // ── Process payment ────────────────────────────────
  const processPayment = async () => {
    const card = TEST_CARDS[selectedCard];
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setToast("Please enter a valid amount");
      return;
    }

    setProcessing(true);

    const willSucceed = card.result === "Approved";
    const paymentId = uid();

    // Step 1: Tokenize test card via sandbox test-certification endpoint
    // Step 2: Process payment with the tokenized instrument_id
    try {
      const cardKey = card.result === "Approved"
        ? (card.brand === "Mastercard" ? "success_mc" : "success")
        : card.result === "Declined" ? "decline" : "insufficient";

      const tokenRes = await fetch("/api/finix/test-certification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card: cardKey }),
      });
      const tokenData = await tokenRes.json().catch(() => ({}));
      if (!tokenRes.ok || !tokenData.instrument_id) {
        throw new Error(tokenData.error || "Failed to tokenize test card");
      }

      const res = await fetch("/api/zenipay/finix/process-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parsedAmount,
          currency: "cad",
          instrument_id: tokenData.instrument_id,
          customer_name: custName,
          customer_email: custEmail,
          description,
          pay_link_id: `sandbox_${merchantId}`,
          merchant_id: merchantId,
        }),
      });

      const data = await res.json().catch(() => ({}));

      const payment: TestPayment = {
        id: data.transaction_id || paymentId,
        amount: parsedAmount,
        card,
        customerName: custName,
        customerEmail: custEmail,
        description,
        status: willSucceed ? "succeeded" : "failed",
        reason: !willSucceed
          ? card.result === "Declined"
            ? "card_declined"
            : "insufficient_funds"
          : undefined,
        createdAt: ts(),
      };

      setPayments((prev) => [payment, ...prev].slice(0, 10));
      pushEvents(payment);

      // Auto-check checklist items
      if (willSucceed) markChecklist("success");
      else markChecklist("decline");
      markChecklist("view_tx");

      setToast(
        willSucceed
          ? `Payment ${payment.id} succeeded`
          : `Payment ${payment.id} was declined`
      );
    } catch {
      // If API is unavailable, simulate locally
      const payment: TestPayment = {
        id: paymentId,
        amount: parsedAmount,
        card,
        customerName: custName,
        customerEmail: custEmail,
        description,
        status: willSucceed ? "succeeded" : "failed",
        reason: !willSucceed
          ? card.result === "Declined"
            ? "card_declined"
            : "insufficient_funds"
          : undefined,
        createdAt: ts(),
      };

      setPayments((prev) => [payment, ...prev].slice(0, 10));
      pushEvents(payment);

      if (willSucceed) markChecklist("success");
      else markChecklist("decline");
      markChecklist("view_tx");

      setToast(
        willSucceed
          ? `Payment ${payment.id} succeeded (simulated)`
          : `Payment ${payment.id} was declined (simulated)`
      );
    } finally {
      setProcessing(false);
    }
  };

  // ── Toggle webhook event expand ────────────────────
  const toggleEvent = (id: string) => {
    setWebhookEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, expanded: !e.expanded } : e))
    );
  };

  // ── Stats ──────────────────────────────────────────
  const successCount = payments.filter((p) => p.status === "succeeded").length;
  const totalVolume = payments.reduce((s, p) => s + p.amount, 0);
  const successRate = payments.length > 0 ? Math.round((successCount / payments.length) * 100) : 0;
  const lastPaymentTime = payments.length > 0 ? payments[0].createdAt : null;

  // ── Copy helper ────────────────────────────────────
  const showCopyToast = (msg: string) => setToast(msg);

  // ══════════════════════════════════════════════════
  // Render
  // ══════════════════════════════════════════════════
  return (
    <div style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      {/* Toast animation keyframes */}
      <style>{`
        @keyframes zpToastIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes zpPulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.6; }
        }
        @media (max-width: 768px) {
          .sb-test-cards { overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; }
          .sb-test-cards > div { min-width: 500px !important; }
          .sb-form-grid { grid-template-columns: 1fr !important; }
          .sb-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .sb-bottom-row { grid-template-columns: 1fr !important; }
          .sb-card { padding: 16px !important; }
        }
      `}</style>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

        {/* ═══ 1. TEST CARDS BANNER ═══════════════════════ */}
        <div style={{ ...CARD_STYLE, padding: 0, overflow: "hidden" }}>
          <div
            style={{
              background: DARK_CARD,
              padding: "20px 24px 12px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 18 }}>&#128179;</span>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#fff" }}>
                {t("sandbox.testCards")}
              </h3>
            </div>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>
              Use these cards in sandbox mode &mdash; Exp: <span style={{ fontFamily: "monospace", color: "#cbd5e1" }}>12/29</span>, CVV: <span style={{ fontFamily: "monospace", color: "#cbd5e1" }}>123</span>
            </p>
          </div>

          <div className="sb-test-cards" style={{ background: DARK_CARD }}>
            {/* Header row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 200px 100px 60px",
                padding: "10px 24px",
                fontSize: 10,
                fontWeight: 700,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span>{t("sandbox.card")}</span>
              <span>{t("sandbox.number")}</span>
              <span>{t("sandbox.result")}</span>
              <span></span>
            </div>

            {TEST_CARDS.map((card, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 200px 100px 60px",
                  padding: "12px 24px",
                  alignItems: "center",
                  borderBottom:
                    i < TEST_CARDS.length - 1
                      ? "1px solid rgba(255,255,255,0.04)"
                      : "none",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.03)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>
                  {card.label}
                </span>
                <span
                  style={{
                    fontFamily: "'SF Mono', 'Fira Code', monospace",
                    fontSize: 13,
                    color: "#cbd5e1",
                    letterSpacing: "0.04em",
                  }}
                >
                  {card.number}
                </span>
                <ResultBadge result={card.result} />
                <CopyButton text={card.number} onCopy={showCopyToast} />
              </div>
            ))}
          </div>
        </div>

        {/* ═══ 2. SIMULATE PAYMENT ════════════════════════ */}
        <div style={CARD_STYLE}>
          <SectionTitle
            title={t("sandbox.simulatePayment")}
            subtitle={t("sandbox.simulatePaymentSub")}
          />

          <div className="sb-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {/* Amount */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: MUTED, display: "block", marginBottom: 6 }}>
                {t("sandbox.amount")}
              </label>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: MUTED,
                    fontSize: 14,
                    fontWeight: 600,
                    pointerEvents: "none",
                  }}
                >
                  $
                </span>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{ ...INPUT_STYLE, paddingLeft: 28 }}
                  placeholder="25.00"
                />
              </div>
            </div>

            {/* Card selector */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: MUTED, display: "block", marginBottom: 6 }}>
                {t("sandbox.testCard")}
              </label>
              <select
                value={selectedCard}
                onChange={(e) => setSelectedCard(Number(e.target.value))}
                style={{ ...INPUT_STYLE, cursor: "pointer", appearance: "auto" as React.CSSProperties["appearance"] }}
              >
                {TEST_CARDS.map((card, i) => (
                  <option key={i} value={i}>
                    {card.label} ({card.number})
                  </option>
                ))}
              </select>
            </div>

            {/* Customer name */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: MUTED, display: "block", marginBottom: 6 }}>
                {t("sandbox.customerName")}
              </label>
              <input
                type="text"
                value={custName}
                onChange={(e) => setCustName(e.target.value)}
                style={INPUT_STYLE}
                placeholder="Test Customer"
              />
            </div>

            {/* Customer email */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: MUTED, display: "block", marginBottom: 6 }}>
                {t("sandbox.customerEmail")}
              </label>
              <input
                type="email"
                value={custEmail}
                onChange={(e) => setCustEmail(e.target.value)}
                style={INPUT_STYLE}
                placeholder="test@example.com"
              />
            </div>

            {/* Description — full width */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: MUTED, display: "block", marginBottom: 6 }}>
                {t("sandbox.description")}
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={INPUT_STYLE}
                placeholder="Sandbox test payment"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={processPayment}
            disabled={processing}
            style={{
              ...BTN_GRAD,
              marginTop: 18,
              width: "100%",
              opacity: processing ? 0.7 : 1,
              animation: processing ? "zpPulse 1.2s infinite" : "none",
            }}
            onMouseEnter={(e) => { if (!processing) (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; }}
          >
            {processing ? t("sandbox.processing") : t("sandbox.processTestPayment")}
          </button>

          {/* Payment results */}
          {payments.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: MUTED, marginBottom: 10 }}>
                {t("sandbox.recentTestPayments")}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  maxHeight: 320,
                  overflowY: "auto",
                }}
              >
                {payments.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 16px",
                      borderRadius: 10,
                      background: p.status === "succeeded" ? "rgba(45,190,96,0.06)" : "rgba(239,68,68,0.06)",
                      border: `1px solid ${p.status === "succeeded" ? "rgba(45,190,96,0.15)" : "rgba(239,68,68,0.15)"}`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: p.status === "succeeded" ? ZP_GREEN : "#EF4444",
                          flexShrink: 0,
                        }}
                      />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>
                          {fmt(p.amount)} &mdash; {p.card.label}
                        </div>
                        <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
                          {p.id} &middot; {p.customerName} &middot;{" "}
                          {new Date(p.createdAt).toLocaleTimeString("en-CA", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                            hour12: false,
                          })}
                        </div>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: p.status === "succeeded" ? ZP_GREEN : "#EF4444",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {p.status}
                    </span>
                  </div>
                ))}
                <div ref={paymentsEndRef} />
              </div>
            </div>
          )}
        </div>

        {/* ═══ 3. WEBHOOK EVENTS LOG ══════════════════════ */}
        <div style={CARD_STYLE}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <SectionTitle
              title={t("sandbox.webhookEventsLog")}
              subtitle={t("sandbox.webhookEventsLogSub")}
            />
            {webhookEvents.length > 0 && (
              <button
                onClick={() => setWebhookEvents([])}
                style={{
                  background: "#f8fafc",
                  border: `1px solid ${BORDER}`,
                  color: MUTED,
                  padding: "6px 14px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f1f5f9"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f8fafc"; }}
              >
                {t("sandbox.clearLog")}
              </button>
            )}
          </div>

          {webhookEvents.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "32px 16px",
                color: LIGHT,
                fontSize: 13,
              }}
            >
              No events yet. Process a test payment to see webhook events.
            </div>
          ) : (
            <div
              style={{
                position: "relative",
                paddingLeft: 24,
                maxHeight: 480,
                overflowY: "auto",
              }}
            >
              {/* Timeline line */}
              <div
                style={{
                  position: "absolute",
                  left: 7,
                  top: 8,
                  bottom: 8,
                  width: 2,
                  background: `linear-gradient(to bottom, ${ZP_GREEN}, ${ZP_CYAN}, ${ZP_PURPLE})`,
                  borderRadius: 2,
                }}
              />

              {webhookEvents.map((evt, i) => {
                const isSuccess = evt.type.includes("succeeded") || evt.type === "transfer.created";
                const isFailed = evt.type.includes("failed");
                const dotColor = isFailed ? "#EF4444" : isSuccess ? ZP_GREEN : ZP_BLUE;

                return (
                  <div key={evt.id} style={{ position: "relative", marginBottom: i < webhookEvents.length - 1 ? 16 : 0 }}>
                    {/* Dot */}
                    <div
                      style={{
                        position: "absolute",
                        left: -21,
                        top: 6,
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: dotColor,
                        border: `2px solid ${CARD_BG}`,
                        boxShadow: `0 0 0 2px ${dotColor}40`,
                      }}
                    />

                    <div
                      onClick={() => toggleEvent(evt.id)}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 10,
                        background: "#f8fafc",
                        border: `1px solid ${BORDER}`,
                        cursor: "pointer",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#f1f5f9"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#f8fafc"; }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span
                            style={{
                              fontFamily: "'SF Mono', 'Fira Code', monospace",
                              fontSize: 12,
                              fontWeight: 700,
                              color: dotColor,
                              background: dotColor + "14",
                              padding: "2px 8px",
                              borderRadius: 6,
                            }}
                          >
                            {evt.type}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 11, color: LIGHT, fontFamily: "monospace" }}>
                            {shortTs(evt.timestamp)}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              color: MUTED,
                              transition: "transform 0.2s",
                              display: "inline-block",
                              transform: evt.expanded ? "rotate(180deg)" : "rotate(0deg)",
                            }}
                          >
                            &#9660;
                          </span>
                        </div>
                      </div>

                      {evt.expanded && (
                        <pre
                          style={{
                            marginTop: 10,
                            padding: 14,
                            borderRadius: 8,
                            background: DARK_CARD,
                            color: "#a5f3c4",
                            fontSize: 11,
                            fontFamily: "'SF Mono', 'Fira Code', monospace",
                            lineHeight: 1.6,
                            overflowX: "auto",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-all",
                            margin: "10px 0 0 0",
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {JSON.stringify(evt.payload, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ═══ Bottom row: Stats + Checklist ══════════════ */}
        <div className="sb-bottom-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

          {/* ═══ 4. SANDBOX STATS ═════════════════════════ */}
          <div style={CARD_STYLE}>
            <SectionTitle title={t("sandbox.sandboxStats")} />

            <div className="sb-stats-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                {
                  label: t("sandbox.testPayments"),
                  value: String(payments.length),
                  color: ZP_BLUE,
                },
                {
                  label: t("kpi.successRate"),
                  value: payments.length > 0 ? `${successRate}%` : "--",
                  color: ZP_GREEN,
                },
                {
                  label: t("sandbox.totalVolume"),
                  value: payments.length > 0 ? fmt(totalVolume) : "--",
                  color: ZP_PURPLE,
                },
                {
                  label: t("sandbox.lastPayment"),
                  value: lastPaymentTime
                    ? new Date(lastPaymentTime).toLocaleTimeString("en-CA", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })
                    : "--",
                  color: ZP_CYAN,
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    background: stat.color + "08",
                    border: `1px solid ${stat.color}18`,
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: stat.color,
                      marginBottom: 4,
                    }}
                  >
                    {stat.value}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ═══ 5. TEST CHECKLIST ════════════════════════ */}
          <div style={CARD_STYLE}>
            <SectionTitle
              title={t("sandbox.testChecklist")}
              subtitle={t("sandbox.testChecklistSub")}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {checklist.map((item) => (
                <div
                  key={item.key}
                  onClick={() => toggleChecklist(item.key)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 12px",
                    borderRadius: 10,
                    cursor: "pointer",
                    background: item.checked ? "rgba(45,190,96,0.05)" : "transparent",
                    border: `1px solid ${item.checked ? "rgba(45,190,96,0.15)" : "transparent"}`,
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (!item.checked) (e.currentTarget as HTMLDivElement).style.background = "#f8fafc";
                  }}
                  onMouseLeave={(e) => {
                    if (!item.checked) (e.currentTarget as HTMLDivElement).style.background = "transparent";
                  }}
                >
                  {/* Checkbox */}
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      border: item.checked
                        ? "none"
                        : `2px solid ${BORDER}`,
                      background: item.checked ? ZP_GREEN : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      transition: "all 0.2s",
                    }}
                  >
                    {item.checked && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path
                          d="M2.5 6L5 8.5L9.5 3.5"
                          stroke="#fff"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>

                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: item.checked ? MUTED : TEXT,
                      textDecoration: item.checked ? "line-through" : "none",
                      transition: "all 0.2s",
                    }}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Progress */}
            <div style={{ marginTop: 16 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  fontWeight: 700,
                  color: MUTED,
                  marginBottom: 6,
                }}
              >
                <span>{t("sandbox.progress")}</span>
                <span>
                  {checklist.filter((c) => c.checked).length}/{checklist.length}
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 3,
                  background: "#f1f5f9",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    borderRadius: 3,
                    background: ZP_GRAD,
                    width: `${(checklist.filter((c) => c.checked).length / checklist.length) * 100}%`,
                    transition: "width 0.4s ease-out",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
