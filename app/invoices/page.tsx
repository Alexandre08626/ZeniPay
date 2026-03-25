"use client";
export default function InvoicesPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#f0f4f8", padding: "80px 20px 40px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: "#0f172a", marginBottom: 20 }}>
          📄 Invoices
        </h1>
        <p style={{ color: "#64748b", marginBottom: 40 }}>
          Create, send, and track invoices
        </p>
        <div style={{ background: "#fff", borderRadius: 16, padding: 40, border: "1px solid #e2e8f0" }}>
          <p>Invoices will be displayed here</p>
        </div>
      </div>
    </div>
  );
}
