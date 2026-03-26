"use client";
import { useEffect, useState } from "react";

interface Transaction {
  id: string; amount: number; currency: string; status: string;
  customer: string; description: string; card_brand?: string;
  card_last4?: string; gateway: string; date: string;
}

export default function TransactionsPage() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: "all", dateFrom: "", dateTo: "", search: "" });

  useEffect(() => {
    fetch("/api/zenipay/stats")
      .then(r => r.json())
      .then(data => setTxns(data.recent_transactions || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = txns.filter(tx => {
    if (filter.status !== "all" && tx.status !== filter.status) return false;
    if (filter.search && !tx.customer?.toLowerCase().includes(filter.search.toLowerCase()) && !tx.id.toLowerCase().includes(filter.search.toLowerCase())) return false;
    if (filter.dateFrom && new Date(tx.date) < new Date(filter.dateFrom)) return false;
    if (filter.dateTo && new Date(tx.date) > new Date(filter.dateTo)) return false;
    return true;
  });

  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
  const statusColor = (s: string) => s === "succeeded" ? "#10B981" : s === "pending" ? "#F59E0B" : s === "failed" ? "#EF4444" : "#6B7280";

  return (
    <div style={{ padding: "32px 32px 48px" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: "#111827", margin: "0 0 4px" }}>Transactions</h1>
        <p style={{ fontSize: 14, color: "#6B7280", margin: 0 }}>All payments processed through Finix</p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: "20px 18px", border: "1px solid #E5E7EB" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 6 }}>TOTAL</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#111827" }}>{filtered.length}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: "20px 18px", border: "1px solid #E5E7EB" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 6 }}>VOLUME</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#10B981" }}>{fmt(filtered.filter(t => t.status === "succeeded").reduce((s, t) => s + t.amount, 0))}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: "20px 18px", border: "1px solid #E5E7EB" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 6 }}>SUCCESS RATE</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#3B82F6" }}>{filtered.length > 0 ? ((filtered.filter(t => t.status === "succeeded").length / filtered.length) * 100).toFixed(1) : 0}%</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: "#fff", borderRadius: 12, padding: 20, marginBottom: 20, border: "1px solid #E5E7EB", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: "1 1 200px" }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Search</label>
          <input value={filter.search} onChange={e => setFilter({ ...filter, search: e.target.value })} placeholder="Client name or ID..." style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, boxSizing: "border-box" }} />
        </div>
        <div style={{ flex: "0 0 150px" }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Status</label>
          <select value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13 }}>
            <option value="all">All</option>
            <option value="succeeded">Succeeded</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div style={{ flex: "0 0 150px" }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>From</label>
          <input type="date" value={filter.dateFrom} onChange={e => setFilter({ ...filter, dateFrom: e.target.value })} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, boxSizing: "border-box" }} />
        </div>
        <div style={{ flex: "0 0 150px" }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>To</label>
          <input type="date" value={filter.dateTo} onChange={e => setFilter({ ...filter, dateTo: e.target.value })} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 13, boxSizing: "border-box" }} />
        </div>
        <button onClick={() => setFilter({ status: "all", dateFrom: "", dateTo: "", search: "" })} style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid #D1D5DB", background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Reset</button>
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                {["ID", "CLIENT", "AMOUNT", "DESCRIPTION", "CARD", "STATUS", "DATE"].map(h => (
                  <th key={h} style={{ padding: "14px 18px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#9CA3AF" }}>Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#9CA3AF" }}>No transactions found</td></tr>
              ) : filtered.map((tx, i) => (
                <tr key={tx.id || i} style={{ borderBottom: "1px solid #F3F4F6" }}>
                  <td style={{ padding: "14px 18px", fontSize: 13, fontFamily: "monospace", color: "#374151" }}>{tx.id}</td>
                  <td style={{ padding: "14px 18px", fontSize: 13, color: "#111827" }}>{tx.customer || "—"}</td>
                  <td style={{ padding: "14px 18px", fontSize: 13, fontWeight: 600, color: "#111827" }}>{fmt(tx.amount)}</td>
                  <td style={{ padding: "14px 18px", fontSize: 13, color: "#6B7280", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.description || "—"}</td>
                  <td style={{ padding: "14px 18px", fontSize: 13, color: "#6B7280" }}>{tx.card_brand || "—"} {tx.card_last4 ? `•••• ${tx.card_last4}` : ""}</td>
                  <td style={{ padding: "14px 18px" }}>
                    <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: `${statusColor(tx.status)}15`, color: statusColor(tx.status) }}>{tx.status}</span>
                  </td>
                  <td style={{ padding: "14px 18px", fontSize: 13, color: "#6B7280" }}>
                    {tx.date ? new Date(tx.date).toLocaleDateString("fr-FR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
