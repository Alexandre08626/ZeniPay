"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useT } from "../../modules/zenipay/i18n";

// ═══════════════════════════════════════════════════════
//  ZeniPay — Settings Panel
//  Fully functional merchant settings with live save
// ═══════════════════════════════════════════════════════

const ZP_GRAD = "linear-gradient(90deg, #2DBE60 0%, #15B8C9 45%, #7B4FBF 100%)";
const DARK = "#0B1B4D";

// ── Types ───────────────────────────────────────────────

export interface SettingsPanelProps {
  merchantId: string;
  merchantEmail: string;
  businessName: string;
  mode: "sandbox" | "live";
}

interface BusinessInfo {
  businessName: string;
  dba: string;
  email: string;
  phone: string;
  website: string;
  businessType: string;
  country: string;
}

interface PaymentConfig {
  webhookUrl: string;
  successRedirectUrl: string;
  cancelRedirectUrl: string;
  statementDescriptor: string;
}

interface NotificationPrefs {
  paymentReceived: boolean;
  payoutCompleted: boolean;
  largeTransactionAlert: boolean;
  largeTransactionThreshold: number;
  lowBalanceAlert: boolean;
  lowBalanceThreshold: number;
  weeklySummaryEmail: boolean;
  cardTransactionAlerts: boolean;
}

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

// ── Styles ──────────────────────────────────────────────

const styles = {
  card: {
    background: "#fff",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
    marginBottom: 24,
  } as React.CSSProperties,
  label: {
    fontSize: 12,
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    marginBottom: 6,
    display: "block",
  } as React.CSSProperties,
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    fontSize: 14,
    background: "#F8FAFC",
    color: "#1e293b",
    outline: "none",
    boxSizing: "border-box" as const,
    transition: "border-color 0.2s",
  } as React.CSSProperties,
  gradientBtn: {
    background: ZP_GRAD,
    color: "#fff",
    fontWeight: 700,
    fontSize: 14,
    border: "none",
    borderRadius: 10,
    padding: "12px 28px",
    cursor: "pointer",
    transition: "opacity 0.2s, transform 0.1s",
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: "#1e293b",
    marginBottom: 4,
  } as React.CSSProperties,
  sectionSub: {
    fontSize: 13,
    color: "#94a3b8",
    marginBottom: 20,
  } as React.CSSProperties,
  fieldGroup: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
    marginBottom: 16,
  } as React.CSSProperties,
  readOnlyRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 0",
    borderBottom: "1px solid #f1f5f9",
  } as React.CSSProperties,
};

// ── Toast System ────────────────────────────────────────

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            background: t.type === "success" ? "#2DBE60" : "#EF4444",
            color: "#fff",
            padding: "14px 24px",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            animation: "slideInToast 0.3s ease-out",
            cursor: "pointer",
            minWidth: 280,
          }}
          onClick={() => onDismiss(t.id)}
        >
          <span style={{ fontSize: 18 }}>{t.type === "success" ? "\u2713" : "\u2717"}</span>
          {t.message}
        </div>
      ))}
      <style>{`
        @keyframes slideInToast {
          from { transform: translateX(120%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ── Toggle Switch ───────────────────────────────────────

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        border: "none",
        background: checked ? "#2DBE60" : "#cbd5e1",
        position: "relative",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.2s",
        flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          background: "#fff",
          position: "absolute",
          top: 3,
          left: checked ? 22 : 4,
          transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </button>
  );
}

// ── Main Component ──────────────────────────────────────

export default function SettingsPanel({ merchantId, merchantEmail, businessName, mode }: SettingsPanelProps) {
  const { t } = useT();
  // Toast state
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastCounter = useRef(0);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    const id = ++toastCounter.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Loading state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // Section 1: Business Information
  const [business, setBusiness] = useState<BusinessInfo>({
    businessName: businessName || "",
    dba: "",
    email: merchantEmail || "",
    phone: "",
    website: "",
    businessType: "llc",
    country: "US",
  });

  // Section 2: Payment Configuration
  const [payment, setPayment] = useState<PaymentConfig>({
    webhookUrl: "/api/zenipay/webhooks/finix",
    successRedirectUrl: "",
    cancelRedirectUrl: "",
    statementDescriptor: "",
  });

  // Section 3: Notification Preferences
  const [notifications, setNotifications] = useState<NotificationPrefs>({
    paymentReceived: true,
    payoutCompleted: true,
    largeTransactionAlert: false,
    largeTransactionThreshold: 10000,
    lowBalanceAlert: false,
    lowBalanceThreshold: 500,
    weeklySummaryEmail: true,
    cardTransactionAlerts: false,
  });

  // Section 6: Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");

  // ── Load existing settings on mount ─────────────────

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch(`/api/zenipay/merchant-data?merchant_id=${merchantId}`);
        const json = await res.json();
        const data = json.data || {};

        if (data.settings_business) {
          setBusiness((prev) => ({ ...prev, ...data.settings_business }));
        }
        if (data.settings_payment) {
          setPayment((prev) => ({ ...prev, ...data.settings_payment }));
        }
        if (data.settings_notifications) {
          setNotifications((prev) => ({ ...prev, ...data.settings_notifications }));
        }
      } catch {
        showToast("Failed to load settings", "error");
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [merchantId, showToast]);

  // ── Save helper ─────────────────────────────────────

  const saveSection = useCallback(
    async (key: string, value: Record<string, unknown>) => {
      setSaving(key);
      try {
        const res = await fetch(`/api/zenipay/merchant-data?merchant_id=${merchantId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [key]: value }),
        });
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        showToast("Settings saved successfully");
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Save failed";
        showToast(message, "error");
      } finally {
        setSaving(null);
      }
    },
    [merchantId, showToast]
  );

  // ── Auto-save notifications on toggle change ───────

  const notificationsRef = useRef(notifications);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  useEffect(() => {
    if (loading) return;
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      return;
    }
    const timer = setTimeout(() => {
      saveSection("settings_notifications", notificationsRef.current as unknown as Record<string, unknown>);
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    notifications.paymentReceived,
    notifications.payoutCompleted,
    notifications.largeTransactionAlert,
    notifications.lowBalanceAlert,
    notifications.weeklySummaryEmail,
    notifications.cardTransactionAlerts,
    loading,
    saveSection,
  ]);

  // ── Loading skeleton ────────────────────────────────

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: DARK, padding: "32px 24px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                ...styles.card,
                height: 200,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: "3px solid #e2e8f0",
                  borderTopColor: "#2DBE60",
                  animation: "spinLoader 0.8s linear infinite",
                }}
              />
            </div>
          ))}
          <style>{`@keyframes spinLoader { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", background: DARK, padding: "32px 24px" }}>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", marginBottom: 4 }}>{t("settings.title")}</h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", margin: 0 }}>
            {t("settings.subtitle")}
            <span
              style={{
                display: "inline-block",
                marginLeft: 10,
                padding: "2px 10px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                background: mode === "live" ? "rgba(45,190,96,0.15)" : "rgba(245,166,35,0.15)",
                color: mode === "live" ? "#2DBE60" : "#F5A623",
                textTransform: "uppercase",
              }}
            >
              {mode}
            </span>
          </p>
        </div>

        {/* ════════════════════════════════════════════════
            Section 1: Business Information
           ════════════════════════════════════════════════ */}
        <div style={styles.card}>
          <div style={styles.sectionTitle}>{t("settings.businessInfo")}</div>
          <div style={styles.sectionSub}>{t("settings.businessInfoSub")}</div>

          <div style={styles.fieldGroup}>
            <div>
              <label style={styles.label}>{t("settings.businessName")}</label>
              <input
                style={styles.input}
                value={business.businessName}
                onChange={(e) => setBusiness({ ...business, businessName: e.target.value })}
                placeholder="Your business name"
              />
            </div>
            <div>
              <label style={styles.label}>{t("settings.dba")}</label>
              <input
                style={styles.input}
                value={business.dba}
                onChange={(e) => setBusiness({ ...business, dba: e.target.value })}
                placeholder="Trade name"
              />
            </div>
          </div>

          <div style={styles.fieldGroup}>
            <div>
              <label style={styles.label}>{t("settings.email")}</label>
              <input
                style={styles.input}
                type="email"
                value={business.email}
                onChange={(e) => setBusiness({ ...business, email: e.target.value })}
                placeholder="contact@example.com"
              />
            </div>
            <div>
              <label style={styles.label}>{t("settings.phone")}</label>
              <input
                style={styles.input}
                type="tel"
                value={business.phone}
                onChange={(e) => setBusiness({ ...business, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={styles.label}>{t("settings.website")}</label>
            <input
              style={styles.input}
              type="url"
              value={business.website}
              onChange={(e) => setBusiness({ ...business, website: e.target.value })}
              placeholder="https://yourbusiness.com"
            />
          </div>

          <div style={styles.fieldGroup}>
            <div>
              <label style={styles.label}>{t("settings.businessType")}</label>
              <select
                style={{ ...styles.input, cursor: "pointer" }}
                value={business.businessType}
                onChange={(e) => setBusiness({ ...business, businessType: e.target.value })}
              >
                <option value="sole_proprietorship">Sole Proprietorship</option>
                <option value="llc">LLC</option>
                <option value="corporation">Corporation</option>
                <option value="partnership">Partnership</option>
                <option value="nonprofit">Non-Profit</option>
              </select>
            </div>
            <div>
              <label style={styles.label}>{t("settings.country")}</label>
              <select
                style={{ ...styles.input, cursor: "pointer" }}
                value={business.country}
                onChange={(e) => setBusiness({ ...business, country: e.target.value })}
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="GB">United Kingdom</option>
                <option value="AU">Australia</option>
                <option value="FR">France</option>
                <option value="DE">Germany</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <button
              style={{
                ...styles.gradientBtn,
                opacity: saving === "settings_business" ? 0.7 : 1,
              }}
              disabled={saving === "settings_business"}
              onClick={() => saveSection("settings_business", business as unknown as Record<string, unknown>)}
            >
              {saving === "settings_business" ? t("common.saving") : t("common.saveChanges")}
            </button>
          </div>
        </div>

        {/* ════════════════════════════════════════════════
            Section 2: Payment Configuration
           ════════════════════════════════════════════════ */}
        <div style={styles.card}>
          <div style={styles.sectionTitle}>{t("settings.paymentConfig")}</div>
          <div style={styles.sectionSub}>{t("settings.paymentConfigSub")}</div>

          <div style={{ marginBottom: 16 }}>
            <label style={styles.label}>{t("settings.webhookUrl")}</label>
            <input
              style={styles.input}
              value={payment.webhookUrl}
              onChange={(e) => setPayment({ ...payment, webhookUrl: e.target.value })}
              placeholder="/api/zenipay/webhooks/finix"
            />
            <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, marginBottom: 0 }}>
              We will send POST requests to this URL for payment events
            </p>
          </div>

          <div style={styles.fieldGroup}>
            <div>
              <label style={styles.label}>{t("settings.successRedirect")}</label>
              <input
                style={styles.input}
                value={payment.successRedirectUrl}
                onChange={(e) => setPayment({ ...payment, successRedirectUrl: e.target.value })}
                placeholder="https://yoursite.com/success"
              />
            </div>
            <div>
              <label style={styles.label}>{t("settings.cancelRedirect")}</label>
              <input
                style={styles.input}
                value={payment.cancelRedirectUrl}
                onChange={(e) => setPayment({ ...payment, cancelRedirectUrl: e.target.value })}
                placeholder="https://yoursite.com/cancel"
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={styles.label}>{t("settings.statementDescriptor")}</label>
            <input
              style={styles.input}
              value={payment.statementDescriptor}
              onChange={(e) => {
                const val = e.target.value.slice(0, 22);
                setPayment({ ...payment, statementDescriptor: val });
              }}
              placeholder="ZENIPAY*YOURSTORE"
              maxLength={22}
            />
            <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, marginBottom: 0 }}>
              {payment.statementDescriptor.length}/22 characters &mdash; appears on customer bank statements
            </p>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <button
              style={{
                ...styles.gradientBtn,
                opacity: saving === "settings_payment" ? 0.7 : 1,
              }}
              disabled={saving === "settings_payment"}
              onClick={() => saveSection("settings_payment", payment as unknown as Record<string, unknown>)}
            >
              {saving === "settings_payment" ? t("common.saving") : t("common.save")}
            </button>
          </div>
        </div>

        {/* ════════════════════════════════════════════════
            Section 3: Notification Preferences
           ════════════════════════════════════════════════ */}
        <div style={styles.card}>
          <div style={styles.sectionTitle}>{t("settings.notifications")}</div>
          <div style={styles.sectionSub}>{t("settings.notificationsSub")}</div>

          {/* Simple toggle rows */}
          {([
            { key: "paymentReceived", label: t("settings.notifPaymentReceived"), desc: t("settings.notifPaymentReceivedDesc") },
            { key: "payoutCompleted", label: t("settings.notifPayoutCompleted"), desc: t("settings.notifPayoutCompletedDesc") },
            { key: "weeklySummaryEmail", label: t("settings.notifWeeklySummary"), desc: t("settings.notifWeeklySummaryDesc") },
            { key: "cardTransactionAlerts", label: t("settings.notifCardAlerts"), desc: t("settings.notifCardAlertsDesc") },
          ] as { key: keyof NotificationPrefs; label: string; desc: string }[]).map(({ key, label, desc }) => (
            <div
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 0",
                borderBottom: "1px solid #f1f5f9",
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{label}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{desc}</div>
              </div>
              <Toggle
                checked={notifications[key] as boolean}
                onChange={(v) => setNotifications((prev) => ({ ...prev, [key]: v }))}
              />
            </div>
          ))}

          {/* Large transaction alert with threshold */}
          <div
            style={{
              padding: "16px 0",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>Large transaction alert</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                  Alert when a single transaction exceeds threshold
                </div>
              </div>
              <Toggle
                checked={notifications.largeTransactionAlert}
                onChange={(v) => setNotifications((prev) => ({ ...prev, largeTransactionAlert: v }))}
              />
            </div>
            {notifications.largeTransactionAlert && (
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Threshold:</label>
                <div style={{ position: "relative", width: 160 }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#94a3b8" }}>$</span>
                  <input
                    style={{ ...styles.input, paddingLeft: 24, width: 160 }}
                    type="number"
                    min={0}
                    value={notifications.largeTransactionThreshold}
                    onChange={(e) =>
                      setNotifications((prev) => ({
                        ...prev,
                        largeTransactionThreshold: Number(e.target.value) || 0,
                      }))
                    }
                    onBlur={() =>
                      saveSection("settings_notifications", notifications as unknown as Record<string, unknown>)
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* Low balance alert with threshold */}
          <div style={{ padding: "16px 0" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>Low balance alert</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                  Alert when your available balance drops below threshold
                </div>
              </div>
              <Toggle
                checked={notifications.lowBalanceAlert}
                onChange={(v) => setNotifications((prev) => ({ ...prev, lowBalanceAlert: v }))}
              />
            </div>
            {notifications.lowBalanceAlert && (
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Threshold:</label>
                <div style={{ position: "relative", width: 160 }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#94a3b8" }}>$</span>
                  <input
                    style={{ ...styles.input, paddingLeft: 24, width: 160 }}
                    type="number"
                    min={0}
                    value={notifications.lowBalanceThreshold}
                    onChange={(e) =>
                      setNotifications((prev) => ({
                        ...prev,
                        lowBalanceThreshold: Number(e.target.value) || 0,
                      }))
                    }
                    onBlur={() =>
                      saveSection("settings_notifications", notifications as unknown as Record<string, unknown>)
                    }
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════════════
            Section 4: Fee Structure (read-only)
           ════════════════════════════════════════════════ */}
        <div style={styles.card}>
          <div style={styles.sectionTitle}>{t("settings.feeStructure")}</div>
          <div style={styles.sectionSub}>{t("settings.feeStructureSub")}</div>

          {[
            { label: "Processing Fee", value: "2.9% per transaction" },
            { label: "Per-Transaction Fee", value: "$0.30" },
            { label: "Payout Fee (ACH)", value: "Free", highlight: true },
            { label: "Payout Fee (Wire)", value: "$25.00" },
            { label: "Chargeback Fee", value: "$15.00 per dispute" },
          ].map(({ label, value, highlight }, i, arr) => (
            <div
              key={label}
              style={{
                ...styles.readOnlyRow,
                borderBottom: i === arr.length - 1 ? "none" : "1px solid #f1f5f9",
              }}
            >
              <span style={{ fontSize: 14, color: "#475569" }}>{label}</span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: highlight ? "#2DBE60" : "#1e293b",
                }}
              >
                {value}
              </span>
            </div>
          ))}

          <div
            style={{
              marginTop: 16,
              padding: "12px 16px",
              borderRadius: 10,
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              fontSize: 12,
              color: "#166534",
              lineHeight: 1.5,
            }}
          >
            No monthly fees, no setup fees, no hidden charges. You only pay when you process payments.
          </div>
        </div>

        {/* ════════════════════════════════════════════════
            Section 5: Security & Compliance (read-only)
           ════════════════════════════════════════════════ */}
        <div style={styles.card}>
          <div style={styles.sectionTitle}>{t("settings.security")}</div>
          <div style={styles.sectionSub}>{t("settings.securitySub")}</div>

          {[
            {
              icon: "\uD83D\uDD12",
              label: "PCI Compliance",
              value: "Tokenization via Finix",
              desc: "Card data never touches your servers",
            },
            {
              icon: "\uD83D\uDCB3",
              label: "Card Storage",
              value: "Never stored \u2014 Finix tokens only",
              desc: "PAN data is replaced with secure tokens",
            },
            {
              icon: "\uD83D\uDEE1\uFE0F",
              label: "Encryption",
              value: "TLS 1.3 \u00B7 AES-256",
              desc: "All data encrypted in transit and at rest",
            },
            {
              icon: "\uD83E\uDD16",
              label: "Fraud Detection",
              value: "Ben AI \u00B7 Real-time monitoring",
              desc: "Machine learning fraud scoring on every transaction",
            },
          ].map(({ icon, label, value, desc }, i, arr) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
                padding: "16px 0",
                borderBottom: i === arr.length - 1 ? "none" : "1px solid #f1f5f9",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "#f1f5f9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  flexShrink: 0,
                }}
              >
                {icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#2DBE60", marginTop: 2 }}>{value}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ════════════════════════════════════════════════
            Section 6: Danger Zone
           ════════════════════════════════════════════════ */}
        <div
          style={{
            ...styles.card,
            border: "1px solid #fecaca",
            background: "#fff",
          }}
        >
          <div style={{ ...styles.sectionTitle, color: "#DC2626" }}>{t("settings.dangerZone")}</div>
          <div style={styles.sectionSub}>{t("settings.dangerZoneSub")}</div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 0",
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{t("settings.deleteAccount")}</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                {t("settings.deleteAccountDesc")}
              </div>
            </div>
            <button
              onClick={() => setDeleteConfirmOpen(true)}
              style={{
                background: "#DC2626",
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
                border: "none",
                borderRadius: 10,
                padding: "10px 20px",
                cursor: "pointer",
                transition: "opacity 0.2s",
                flexShrink: 0,
              }}
            >
              {t("settings.deleteAccount")}
            </button>
          </div>
        </div>

        {/* Bottom padding */}
        <div style={{ height: 48 }} />
      </div>

      {/* ════════════════════════════════════════════════
          Delete Confirmation Dialog
         ════════════════════════════════════════════════ */}
      {deleteConfirmOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: 24,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDeleteConfirmOpen(false);
              setDeleteInput("");
            }
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 32,
              maxWidth: 440,
              width: "100%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 700, color: "#DC2626", marginBottom: 8 }}>
              Delete Account
            </div>
            <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.6, marginBottom: 20 }}>
              This action is <strong>permanent and irreversible</strong>. All your merchant data, transaction history,
              API keys, and payment configurations will be deleted.
            </p>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>
              Type <strong style={{ color: "#DC2626" }}>DELETE</strong> to confirm:
            </p>
            <input
              style={{ ...styles.input, marginBottom: 20, borderColor: "#fecaca" }}
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="Type DELETE to confirm"
              autoFocus
            />
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setDeleteInput("");
                }}
                style={{
                  background: "#f1f5f9",
                  color: "#475569",
                  fontWeight: 600,
                  fontSize: 14,
                  border: "none",
                  borderRadius: 10,
                  padding: "10px 20px",
                  cursor: "pointer",
                }}
              >
                {t("common.cancel")}
              </button>
              <button
                disabled={deleteInput !== "DELETE"}
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/zenipay/merchant-data?merchant_id=${merchantId}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ status: "deleted", deleted_at: new Date().toISOString() }),
                    });
                    const json = await res.json();
                    if (json.error) throw new Error(json.error);
                    showToast("Account scheduled for deletion");
                    setDeleteConfirmOpen(false);
                    setDeleteInput("");
                  } catch {
                    showToast("Failed to delete account", "error");
                  }
                }}
                style={{
                  background: deleteInput === "DELETE" ? "#DC2626" : "#fecaca",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                  border: "none",
                  borderRadius: 10,
                  padding: "10px 20px",
                  cursor: deleteInput === "DELETE" ? "pointer" : "not-allowed",
                  transition: "background 0.2s",
                }}
              >
                {t("settings.deletePermanently")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
