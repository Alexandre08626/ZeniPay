"use client";

export default function FinancingPage() {
  return (
    <div style={{ padding: "32px 32px 48px" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: "#111827", margin: "0 0 4px" }}>Financing</h1>
        <p style={{ fontSize: 14, color: "#6B7280", margin: 0 }}>Business financing powered by Finix</p>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, padding: 32, border: "1px solid #E5E7EB", textAlign: "center", maxWidth: 600, margin: "48px auto" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏛</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: "0 0 12px" }}>Business Financing</h2>
        <p style={{ fontSize: 15, color: "#6B7280", lineHeight: 1.6, margin: "0 0 24px" }}>
          Access working capital based on your ZeniPay transaction history.
          Get pre-approved financing with competitive rates.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 28 }}>
          {[
            { label: "Available Credit", value: "$0.00", sub: "Based on volume" },
            { label: "Current APR", value: "—", sub: "Pre-qualification" },
            { label: "Repayment Term", value: "—", sub: "Flexible" },
          ].map(item => (
            <div key={item.label} style={{ padding: "16px 12px", borderRadius: 10, background: "#F9FAFB" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 6 }}>{item.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>{item.value}</div>
              <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>{item.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: 16, borderRadius: 10, background: "#FEF3C7", border: "1px solid #FCD34D", marginBottom: 20 }}>
          <p style={{ margin: 0, fontSize: 13, color: "#92400E", fontWeight: 600 }}>
            Financing will be available once your account has sufficient transaction history.
          </p>
        </div>

        <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>
          Powered by Finix - Terms and conditions apply
        </p>
      </div>
    </div>
  );
}
