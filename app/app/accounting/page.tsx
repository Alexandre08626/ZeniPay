"use client";
import { useEffect, useState } from "react";

export default function AccountingPage() {
  const [stats, setStats] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [period, setPeriod] = useState<"day" | "week" | "month" | "year">("month");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/zenipay/stats")
      .then(r => r.json())
      .then(data => {
        setStats(data.stats);
        setInvoices(data.recent_invoices || []);
        setTransactions(data.recent_transactions || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  const filterByPeriod = (items: any[], dateKey: string) => {
    const now = new Date();
    return items.filter(item => {
      const d = new Date(item[dateKey]);
      switch (period) {
        case "day": return d.toDateString() === now.toDateString();
        case "week": { const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7); return d >= weekAgo; }
        case "month": return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        case "year": return d.getFullYear() === now.getFullYear();
      }
    });
  };

  const filteredTxns = filterByPeriod(transactions, "date");
  const filteredInv = filterByPeriod(invoices, "created_at");
  const revenue = filteredTxns.filter((t: any) => t.status === "succeeded").reduce((s: number, t: any) => s + Number(t.amount), 0);
  const invoiceTotal = filteredInv.reduce((s: number, i: any) => s + Number(i.total || 0), 0);

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}><div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #15B8C9", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;

  return (
    <div style={{ padding: "32px 32px 48px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: "#111827", margin: "0 0 4px" }}>Accounting</h1>
          <p style={{ fontSize: 14, color: "#6B7280", margin: 0 }}>Revenue reconciliation and reports</p>
        </div>
        <div style={{ display: "flex", gap: 4, background: "#F3F4F6", borderRadius: 8, padding: 3 }}>
          {(["day", "week", "month", "year"] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: period === p ? "#fff" : "transparent", color: period === p ? "#111827" : "#6B7280", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: period === p ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: "20px 18px", border: "1px solid #E5E7EB" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 6 }}>REVENUE ({period.toUpperCase()})</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#10B981" }}>{fmt(revenue)}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: "20px 18px", border: "1px solid #E5E7EB" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 6 }}>INVOICED</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#3B82F6" }}>{fmt(invoiceTotal)}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: "20px 18px", border: "1px solid #E5E7EB" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 6 }}>TRANSACTIONS</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#111827" }}>{filteredTxns.length}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: "20px 18px", border: "1px solid #E5E7EB" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 6 }}>RECONCILIATION</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: Math.abs(revenue - invoiceTotal) < 0.01 ? "#10B981" : "#F59E0B" }}>
            {Math.abs(revenue - invoiceTotal) < 0.01 ? "Matched" : fmt(Math.abs(revenue - invoiceTotal)) + " diff"}
          </div>
        </div>
      </div>

      {/* Revenue by Transaction */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: "0 0 16px" }}>Revenue Breakdown</h2>
        {filteredTxns.length === 0 ? (
          <p style={{ color: "#9CA3AF", fontSize: 14 }}>No transactions in this period</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filteredTxns.filter((t: any) => t.status === "succeeded").map((t: any, i: number) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 8, background: "#F9FAFB" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{t.customer || t.description || "Payment"}</div>
                  <div style={{ fontSize: 11, color: "#6B7280" }}>{t.date ? new Date(t.date).toLocaleDateString("fr-FR") : ""}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#10B981" }}>{fmt(Number(t.amount))}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Export */}
      <div style={{ display: "flex", gap: 12 }}>
        <button style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #D1D5DB", background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Export CSV</button>
        <button style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #D1D5DB", background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Export PDF</button>
      </div>
    </div>
  );
}
