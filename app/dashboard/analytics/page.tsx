"use client";
import { useEffect, useState } from "react";

export default function AnalyticsPage() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    transactionCount: 0,
    successRate: 0,
    avgTransaction: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/zenipay/stats").then(res => res.json()).then(data => {
      const txns = data.recent_transactions || [];
      const total = txns.reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0);
      const succeeded = txns.filter((tx: any) => tx.status === "succeeded");
      const successRate = txns.length > 0 ? (succeeded.length / txns.length) * 100 : 0;
      const avg = txns.length > 0 ? total / txns.length : 0;

      setStats({
        totalRevenue: total,
        transactionCount: txns.length,
        successRate,
        avgTransaction: avg,
      });

      // Group by day for chart
      const byDay: any = {};
      txns.forEach((tx: any) => {
        const date = new Date(tx.date || tx.created_at).toLocaleDateString("fr-FR");
        byDay[date] = (byDay[date] || 0) + (tx.amount || 0);
      });
      setChartData(Object.entries(byDay).map(([date, amount]) => ({ date, amount: amount as number })));
    }).catch(() => {});
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", padding: "80px 20px 40px" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: "#111827", marginBottom: 8 }}>
          📈 Analytics
        </h1>
        <p style={{ fontSize: 16, color: "#6B7280", marginBottom: 32 }}>
          Métriques et insights en temps réel
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20, marginBottom: 32 }}>
          <div style={{ background: "linear-gradient(135deg, #2DBE60 0%, #15B8C9 100%)", borderRadius: 16, padding: 32, color: "#fff" }}>
            <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8, fontWeight: 600 }}>REVENU TOTAL</div>
            <div style={{ fontSize: 42, fontWeight: 900 }}>${stats.totalRevenue.toFixed(2)}</div>
          </div>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, border: "1px solid #E5E7EB" }}>
            <div style={{ fontSize: 14, color: "#6B7280", marginBottom: 8, fontWeight: 600 }}>TRANSACTIONS</div>
            <div style={{ fontSize: 42, fontWeight: 900, color: "#3B82F6" }}>{stats.transactionCount}</div>
          </div>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, border: "1px solid #E5E7EB" }}>
            <div style={{ fontSize: 14, color: "#6B7280", marginBottom: 8, fontWeight: 600 }}>TAUX DE SUCCÈS</div>
            <div style={{ fontSize: 42, fontWeight: 900, color: "#10B981" }}>{stats.successRate.toFixed(1)}%</div>
          </div>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, border: "1px solid #E5E7EB" }}>
            <div style={{ fontSize: 14, color: "#6B7280", marginBottom: 8, fontWeight: 600 }}>MONTANT MOYEN</div>
            <div style={{ fontSize: 42, fontWeight: 900, color: "#7B4FBF" }}>${stats.avgTransaction.toFixed(2)}</div>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", padding: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Volume par jour</h2>
          <div style={{ display: "flex", alignItems: "end", gap: 8, height: 300 }}>
            {chartData.map((item, i) => {
              const maxAmount = Math.max(...chartData.map(d => d.amount as number));
              const height = maxAmount > 0 ? ((item.amount as number) / maxAmount) * 100 : 0;

              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: "100%",
                      height: `${height}%`,
                      background: "linear-gradient(135deg, #2DBE60 0%, #15B8C9 100%)",
                      borderRadius: "4px 4px 0 0",
                      minHeight: height > 0 ? "10px" : "0px",
                      position: "relative",
                    }}
                    title={`$${(item.amount as number).toFixed(2)}`}
                  />
                  <div style={{ fontSize: 11, color: "#6B7280", writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                    {item.date}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
