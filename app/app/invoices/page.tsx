"use client";
import { useEffect, useState } from "react";

interface Invoice {
  id: string; invoice_number?: string; payment_id: string; customer_name: string;
  customer_email: string; total: number; currency: string; status: string;
  paid_at: string; created_at: string;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/zenipay/stats")
      .then(r => r.json())
      .then(data => setInvoices(data.recent_invoices || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  return (
    <div style={{ padding: "32px 32px 48px" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: "#111827", margin: "0 0 4px" }}>Invoices</h1>
        <p style={{ fontSize: 14, color: "#6B7280", margin: 0 }}>Auto-generated invoices for every successful payment</p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: "20px 18px", border: "1px solid #E5E7EB" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 6 }}>TOTAL INVOICES</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#111827" }}>{invoices.length}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: "20px 18px", border: "1px solid #E5E7EB" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 6 }}>TOTAL BILLED</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#10B981" }}>{fmt(invoices.reduce((s, inv) => s + Number(inv.total || 0), 0))}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: "20px 18px", border: "1px solid #E5E7EB" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 6 }}>PAID</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#3B82F6" }}>{invoices.filter(i => i.status === "paid").length}</div>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
              {["INVOICE #", "PAYMENT", "CLIENT", "EMAIL", "TOTAL", "STATUS", "DATE"].map(h => (
                <th key={h} style={{ padding: "14px 18px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#6B7280" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#9CA3AF" }}>Loading...</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#9CA3AF" }}>No invoices yet. Invoices are created automatically after each successful payment.</td></tr>
            ) : invoices.map(inv => (
              <tr key={inv.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                <td style={{ padding: "14px 18px", fontSize: 13, fontWeight: 600, color: "#111827" }}>{inv.invoice_number || inv.id}</td>
                <td style={{ padding: "14px 18px", fontSize: 12, fontFamily: "monospace", color: "#6B7280" }}>{inv.payment_id || "—"}</td>
                <td style={{ padding: "14px 18px", fontSize: 13, color: "#111827" }}>{inv.customer_name || "—"}</td>
                <td style={{ padding: "14px 18px", fontSize: 13, color: "#6B7280" }}>{inv.customer_email || "—"}</td>
                <td style={{ padding: "14px 18px", fontSize: 14, fontWeight: 600, color: "#111827" }}>{fmt(Number(inv.total || 0))}</td>
                <td style={{ padding: "14px 18px" }}>
                  <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: inv.status === "paid" ? "#10B98115" : "#F59E0B15", color: inv.status === "paid" ? "#10B981" : "#F59E0B" }}>{inv.status}</span>
                </td>
                <td style={{ padding: "14px 18px", fontSize: 13, color: "#6B7280" }}>
                  {inv.created_at ? new Date(inv.created_at).toLocaleDateString("fr-FR", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
