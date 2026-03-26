"use client";
import { useState, useEffect } from "react";

export default function SettingsPage() {
  const [merchant, setMerchant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/zenipay/merchants")
      .then(r => r.json())
      .then(data => setMerchant(data.merchants?.[0] || null))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const webhookUrl = "https://zenipay.ca/api/zenipay/webhooks/finix";
  const [copied, setCopied] = useState(false);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}><div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #15B8C9", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;

  return (
    <div style={{ padding: "32px 32px 48px" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: "#111827", margin: "0 0 4px" }}>Settings</h1>
        <p style={{ fontSize: 14, color: "#6B7280", margin: 0 }}>Account configuration and API management</p>
      </div>

      {/* Account Info */}
      <div style={{ background: "#fff", borderRadius: 14, padding: 24, border: "1px solid #E5E7EB", marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: "0 0 16px" }}>Account Information</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[
            { label: "Business Name", value: merchant?.merchant_data?.businessName || "ZeniPay Merchant" },
            { label: "Status", value: "Active" },
            { label: "Plan", value: "Standard" },
            { label: "Gateway", value: "Finix (Sandbox)" },
          ].map(item => (
            <div key={item.label} style={{ padding: "12px 16px", borderRadius: 8, background: "#F9FAFB" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Webhook Config */}
      <div style={{ background: "#fff", borderRadius: 14, padding: 24, border: "1px solid #E5E7EB", marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: "0 0 16px" }}>Finix Webhook Configuration</h2>
        <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 16 }}>
          Configure this URL in your Finix dashboard to receive real-time payment updates.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <code style={{ flex: 1, padding: "12px 16px", borderRadius: 8, background: "#F3F4F6", border: "1px solid #E5E7EB", fontSize: 13, fontFamily: "monospace", color: "#374151" }}>
            {webhookUrl}
          </code>
          <button onClick={() => copy(webhookUrl)} style={{ padding: "12px 18px", borderRadius: 8, border: "none", background: copied ? "#10B981" : "#3B82F6", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Events to subscribe:</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {["transfer.succeeded", "transfer.failed", "transfer.reversed", "settlement.created", "dispute.created"].map(e => (
              <span key={e} style={{ padding: "4px 10px", borderRadius: 6, background: "#EFF6FF", color: "#3B82F6", fontSize: 12, fontWeight: 500 }}>{e}</span>
            ))}
          </div>
        </div>
      </div>

      {/* API Keys */}
      <div style={{ background: "#fff", borderRadius: 14, padding: 24, border: "1px solid #E5E7EB" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: "0 0 16px" }}>API Keys</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { label: "Sandbox Key", value: merchant?.sandboxKey || merchant?.sandbox_key || "zpk_sandbox_..." },
            { label: "Live Key", value: merchant?.liveKey || merchant?.live_key || "Not yet activated" },
          ].map(item => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 120, fontSize: 13, fontWeight: 600, color: "#374151" }}>{item.label}</div>
              <code style={{ flex: 1, padding: "10px 14px", borderRadius: 8, background: "#F3F4F6", border: "1px solid #E5E7EB", fontSize: 12, fontFamily: "monospace", color: "#6B7280" }}>
                {item.value}
              </code>
              <button onClick={() => copy(item.value)} style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid #D1D5DB", background: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Copy</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
