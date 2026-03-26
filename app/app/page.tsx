"use client";
import { useEffect, useState } from "react";

interface Stats {
  total_revenue: number;
  total_payments: number;
  succeeded_payments: number;
  failed_payments: number;
  pending_payments: number;
  success_rate: number;
}

interface Transaction {
  id: string;
  customer: string;
  amount: number;
  currency: string;
  status: string;
  date: string;
}

const ZP_GRAD = "linear-gradient(135deg, #2DBE60 0%, #15B8C9 45%, #7B4FBF 100%)";

export default function AppOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/zenipay/stats")
      .then(r => r.json())
      .then(data => {
        setStats(data.stats);
        setTransactions(data.recent_transactions || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  const getStatusColor = (s: string) => {
    if (s === "succeeded") return "#10B981";
    if (s === "pending") return "#F59E0B";
    if (s === "failed") return "#EF4444";
    return "#6B7280";
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #15B8C9", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 32px 48px" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: "#111827", margin: "0 0 4px" }}>Dashboard Overview</h1>
        <p style={{ fontSize: 14, color: "#6B7280", margin: 0 }}>Welcome to ZeniPay</p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 32 }}>
        <div style={{ background: "#fff", borderRadius: 14, padding: "24px 20px", border: "1px solid #E5E7EB" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", letterSpacing: "0.05em", marginBottom: 8 }}>TOTAL REVENUE</div>
          <div style={{ fontSize: 28, fontWeight: 900, background: ZP_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {fmt(stats?.total_revenue || 0)}
          </div>
        </div>
        <div style={{ background: "#fff", borderRadius: 14, padding: "24px 20px", border: "1px solid #E5E7EB" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", letterSpacing: "0.05em", marginBottom: 8 }}>TRANSACTIONS</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#111827" }}>{stats?.total_payments || 0}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 14, padding: "24px 20px", border: "1px solid #E5E7EB" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", letterSpacing: "0.05em", marginBottom: 8 }}>SUCCESS RATE</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#10B981" }}>{stats?.success_rate || 0}%</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 14, padding: "24px 20px", border: "1px solid #E5E7EB" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", letterSpacing: "0.05em", marginBottom: 8 }}>PENDING</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#F59E0B" }}>{stats?.pending_payments || 0}</div>
        </div>
      </div>

      {/* System Status */}
      <div style={{ background: "#fff", borderRadius: 14, padding: 24, border: "1px solid #E5E7EB", marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: "0 0 16px" }}>System Status</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          {[
            { label: "Finix Gateway", status: "Operational", color: "#10B981" },
            { label: "Supabase DB", status: "Connected", color: "#10B981" },
            { label: "Webhook Endpoint", status: "Active", color: "#10B981" },
            { label: "Vercel Deploy", status: "Live", color: "#10B981" },
          ].map(s => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, background: "#F9FAFB" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{s.label}</div>
                <div style={{ fontSize: 11, color: "#6B7280" }}>{s.status}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Transactions */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E5E7EB", overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>Recent Transactions</h2>
          <a href="/app/transactions" style={{ fontSize: 13, color: "#3B82F6", textDecoration: "none", fontWeight: 600 }}>View all &rarr;</a>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F9FAFB" }}>
              <th style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#6B7280" }}>ID</th>
              <th style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#6B7280" }}>CLIENT</th>
              <th style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#6B7280" }}>AMOUNT</th>
              <th style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#6B7280" }}>STATUS</th>
              <th style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#6B7280" }}>DATE</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 32, textAlign: "center", color: "#9CA3AF" }}>No transactions yet</td></tr>
            ) : transactions.slice(0, 10).map((tx, i) => (
              <tr key={tx.id || i} style={{ borderBottom: "1px solid #F3F4F6" }}>
                <td style={{ padding: "12px 20px", fontSize: 13, fontFamily: "monospace", color: "#374151" }}>{tx.id}</td>
                <td style={{ padding: "12px 20px", fontSize: 13, color: "#374151" }}>{tx.customer || "—"}</td>
                <td style={{ padding: "12px 20px", fontSize: 13, fontWeight: 600, color: "#111827" }}>{fmt(tx.amount)}</td>
                <td style={{ padding: "12px 20px" }}>
                  <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: `${getStatusColor(tx.status)}15`, color: getStatusColor(tx.status) }}>
                    {tx.status}
                  </span>
                </td>
                <td style={{ padding: "12px 20px", fontSize: 13, color: "#6B7280" }}>
                  {tx.date ? new Date(tx.date).toLocaleDateString("fr-FR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
