"use client";
const STYLES: Record<string, { bg: string; c: string; l: string }> = {
  SUCCEEDED: { bg: "rgba(22,163,74,0.08)", c: "#16A34A", l: "Succeeded" },
  PENDING: { bg: "rgba(217,119,6,0.08)", c: "#D97706", l: "Pending" },
  FAILED: { bg: "rgba(220,38,38,0.08)", c: "#DC2626", l: "Failed" },
  CANCELED: { bg: "rgba(148,163,184,0.08)", c: "#94A3B8", l: "Canceled" },
};
export default function PaymentStatus({ state, transferId, failureCode, failureMessage }: { state: string; transferId?: string; failureCode?: string; failureMessage?: string }) {
  const s = STYLES[state] || STYLES.PENDING;
  return (
    <div style={{ padding: 16, borderRadius: 10, background: s.bg }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: s.c, display: "inline-block" }} />
        <span style={{ fontWeight: 700, color: s.c, fontSize: 14 }}>{s.l}</span>
      </div>
      {transferId && <div style={{ fontSize: 12, color: "#64748b" }}>Transfer: {transferId}</div>}
      {failureCode && <div style={{ fontSize: 12, color: "#DC2626" }}>Error: {failureCode} {failureMessage ? "- " + failureMessage : ""}</div>}
    </div>
  );
}