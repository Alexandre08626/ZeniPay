"use client";
import { useEffect, useState } from "react";

interface Payout {
  id: string; amount: number; currency: string; status: string;
  destination: string; created_at: string;
}

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    fetch("/api/zenipay/stats")
      .then(r => r.json())
      .then(data => setPayouts(data.recent_payouts || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const simulatePayout = async () => {
    setSimulating(true);
    try {
      const res = await fetch("/api/zenipay/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 100, recipient_name: "Test Bank Account ****1234", from_wallet: "platform", note: "Sandbox test payout" }),
      });
      const data = await res.json();
      if (data.success) {
        // Refresh list
        const listRes = await fetch("/api/zenipay/payouts");
        const listData = await listRes.json();
        setPayouts(listData.payouts || []);
      }
    } catch (e) { console.error(e); }
    setSimulating(false);
  };

  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
  const statusColor = (s: string) => s === "completed" ? "#10B981" : s === "processing" ? "#3B82F6" : s === "pending" ? "#F59E0B" : "#6B7280";

  return (
    <div style={{ padding: "32px 32px 48px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: "#111827", margin: "0 0 4px" }}>Payouts</h1>
          <p style={{ fontSize: 14, color: "#6B7280", margin: 0 }}>Bank transfers and payout history</p>
        </div>
        <button onClick={simulatePayout} disabled={simulating} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#3B82F6", color: "#fff", fontSize: 14, fontWeight: 700, cursor: simulating ? "not-allowed" : "pointer" }}>
          {simulating ? "Processing..." : "Simulate Payout"}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: "20px 18px", border: "1px solid #E5E7EB" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 6 }}>TOTAL PAYOUTS</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#111827" }}>{payouts.length}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: "20px 18px", border: "1px solid #E5E7EB" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 6 }}>TOTAL PAID OUT</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#10B981" }}>{fmt(payouts.filter(p => p.status === "completed").reduce((s, p) => s + Number(p.amount), 0))}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: "20px 18px", border: "1px solid #E5E7EB" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 6 }}>PENDING</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#F59E0B" }}>{payouts.filter(p => p.status === "pending" || p.status === "processing").length}</div>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
              {["ID", "AMOUNT", "DESTINATION", "STATUS", "DATE"].map(h => (
                <th key={h} style={{ padding: "14px 18px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#6B7280" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: "#9CA3AF" }}>Loading...</td></tr>
            ) : payouts.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: "#9CA3AF" }}>No payouts yet. Use "Simulate Payout" to test.</td></tr>
            ) : payouts.map(p => (
              <tr key={p.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                <td style={{ padding: "14px 18px", fontSize: 13, fontFamily: "monospace", color: "#374151" }}>{p.id}</td>
                <td style={{ padding: "14px 18px", fontSize: 14, fontWeight: 600, color: "#111827" }}>{fmt(Number(p.amount))}</td>
                <td style={{ padding: "14px 18px", fontSize: 13, color: "#6B7280" }}>{p.destination || "Bank account"}</td>
                <td style={{ padding: "14px 18px" }}>
                  <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: `${statusColor(p.status)}15`, color: statusColor(p.status) }}>{p.status}</span>
                </td>
                <td style={{ padding: "14px 18px", fontSize: 13, color: "#6B7280" }}>
                  {p.created_at ? new Date(p.created_at).toLocaleDateString("fr-FR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
