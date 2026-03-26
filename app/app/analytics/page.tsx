"use client";
import { useEffect, useState } from "react";

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
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

  // Compute analytics
  const succeeded = transactions.filter(t => t.status === "succeeded");
  const totalVolume = succeeded.reduce((s, t) => s + Number(t.amount), 0);
  const avgTransaction = succeeded.length > 0 ? totalVolume / succeeded.length : 0;
  const successRate = transactions.length > 0 ? (succeeded.length / transactions.length) * 100 : 0;

  // Top clients
  const clientMap: Record<string, { count: number; total: number }> = {};
  for (const t of succeeded) {
    const name = t.customer || "Unknown";
    if (!clientMap[name]) clientMap[name] = { count: 0, total: 0 };
    clientMap[name].count++;
    clientMap[name].total += Number(t.amount);
  }
  const topClients = Object.entries(clientMap).sort((a, b) => b[1].total - a[1].total).slice(0, 10);

  // Revenue by day (last 30 days)
  const dayMap: Record<string, number> = {};
  for (const t of succeeded) {
    const day = t.date ? new Date(t.date).toLocaleDateString("fr-FR", { month: "short", day: "numeric" }) : "—";
    dayMap[day] = (dayMap[day] || 0) + Number(t.amount);
  }

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}><div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #15B8C9", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;

  return (
    <div style={{ padding: "32px 32px 48px" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: "#111827", margin: "0 0 4px" }}>Analytics</h1>
        <p style={{ fontSize: 14, color: "#6B7280", margin: 0 }}>Performance insights and KPIs</p>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 28 }}>
        {[
          { label: "TOTAL VOLUME", value: fmt(totalVolume), color: "#10B981" },
          { label: "SUCCESS RATE", value: `${successRate.toFixed(1)}%`, color: "#3B82F6" },
          { label: "AVG TRANSACTION", value: fmt(avgTransaction), color: "#7C3AED" },
          { label: "TOTAL PAYMENTS", value: `${transactions.length}`, color: "#111827" },
        ].map(k => (
          <div key={k.label} style={{ background: "#fff", borderRadius: 12, padding: "22px 18px", border: "1px solid #E5E7EB" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Revenue by Day - Simple bar chart */}
      <div style={{ background: "#fff", borderRadius: 12, padding: 24, border: "1px solid #E5E7EB", marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: "0 0 16px" }}>Revenue by Day</h2>
        {Object.keys(dayMap).length === 0 ? (
          <p style={{ color: "#9CA3AF", fontSize: 14 }}>No data yet</p>
        ) : (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 200, padding: "0 8px" }}>
            {Object.entries(dayMap).slice(-14).map(([day, amount]) => {
              const maxVal = Math.max(...Object.values(dayMap));
              const height = maxVal > 0 ? (amount / maxVal) * 160 : 0;
              return (
                <div key={day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#10B981" }}>{fmt(amount)}</div>
                  <div style={{ width: "100%", maxWidth: 40, height, background: "linear-gradient(180deg, #2DBE60, #15B8C9)", borderRadius: "6px 6px 0 0", minHeight: 4 }} />
                  <div style={{ fontSize: 10, color: "#6B7280", whiteSpace: "nowrap" }}>{day}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Top Clients */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #E5E7EB" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>Top Clients</h2>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F9FAFB" }}>
              <th style={{ padding: "12px 18px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#6B7280" }}>CLIENT</th>
              <th style={{ padding: "12px 18px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#6B7280" }}>TRANSACTIONS</th>
              <th style={{ padding: "12px 18px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#6B7280" }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {topClients.length === 0 ? (
              <tr><td colSpan={3} style={{ padding: 32, textAlign: "center", color: "#9CA3AF" }}>No client data yet</td></tr>
            ) : topClients.map(([name, data]) => (
              <tr key={name} style={{ borderBottom: "1px solid #F3F4F6" }}>
                <td style={{ padding: "12px 18px", fontSize: 14, fontWeight: 600, color: "#111827" }}>{name}</td>
                <td style={{ padding: "12px 18px", fontSize: 13, color: "#6B7280" }}>{data.count}</td>
                <td style={{ padding: "12px 18px", fontSize: 14, fontWeight: 600, color: "#10B981" }}>{fmt(data.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
