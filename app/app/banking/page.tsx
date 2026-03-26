"use client";
import { useEffect, useState } from "react";

const ZP_GRAD = "linear-gradient(135deg, #2DBE60 0%, #15B8C9 45%, #7B4FBF 100%)";

export default function BankingPage() {
  const [balance, setBalance] = useState(0);
  const [wallets, setWallets] = useState<Record<string, { available: number }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/zenipay/stats")
      .then(r => r.json())
      .then(data => {
        setWallets(data.wallets || {});
        setBalance(data.wallets?.platform?.available || data.stats?.total_revenue || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  const cards = [
    { name: "ZeniPay Business", last4: "4821", type: "Visa", color: "#1a2a5e", balance: balance * 0.6 },
    { name: "ZeniPay Operations", last4: "7392", type: "Mastercard", color: "#0f2040", balance: balance * 0.3 },
    { name: "ZeniPay Reserve", last4: "1056", type: "Visa", color: "#2d1a4e", balance: balance * 0.1 },
  ];

  if (loading) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #15B8C9", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>;
  }

  return (
    <div style={{ padding: "32px 32px 48px" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: "#111827", margin: "0 0 4px" }}>Banking</h1>
        <p style={{ fontSize: 14, color: "#6B7280", margin: 0 }}>Platform balance and virtual cards</p>
      </div>

      {/* Platform Balance */}
      <div style={{ background: ZP_GRAD, borderRadius: 16, padding: "32px 28px", marginBottom: 28, color: "#fff" }}>
        <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.8, marginBottom: 8 }}>PLATFORM BALANCE</div>
        <div style={{ fontSize: 42, fontWeight: 900, letterSpacing: "-1px" }}>{fmt(balance)}</div>
        <div style={{ fontSize: 13, opacity: 0.7, marginTop: 8 }}>Finix Merchant Account - Real-time balance</div>
      </div>

      {/* Virtual Cards */}
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 16px" }}>Virtual Cards</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20, marginBottom: 32 }}>
        {cards.map((card, i) => (
          <div key={i} style={{ background: card.color, borderRadius: 16, padding: "24px 20px", color: "#fff", position: "relative", overflow: "hidden", minHeight: 180 }}>
            <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
            <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.7, marginBottom: 20 }}>ZeniPay</div>
            <div style={{ fontSize: 20, fontWeight: 300, letterSpacing: "3px", marginBottom: 20, fontFamily: "monospace" }}>
              •••• •••• •••• {card.last4}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <div style={{ fontSize: 10, opacity: 0.5 }}>BALANCE</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{fmt(card.balance)}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, opacity: 0.8 }}>{card.type}</div>
            </div>
            <div style={{ marginTop: 12, fontSize: 12, opacity: 0.6 }}>{card.name}</div>
          </div>
        ))}
      </div>

      {/* Wallet Breakdown */}
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 16px" }}>Wallet Breakdown</h2>
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F9FAFB" }}>
              <th style={{ padding: "14px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#6B7280" }}>WALLET</th>
              <th style={{ padding: "14px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#6B7280" }}>AVAILABLE</th>
              <th style={{ padding: "14px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#6B7280" }}>PAID OUT</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(wallets).map(([key, w]) => (
              <tr key={key} style={{ borderBottom: "1px solid #F3F4F6" }}>
                <td style={{ padding: "14px 20px", fontSize: 14, fontWeight: 600, color: "#111827", textTransform: "capitalize" }}>{key}</td>
                <td style={{ padding: "14px 20px", fontSize: 14, fontWeight: 600, color: "#10B981" }}>{fmt((w as any).available || 0)}</td>
                <td style={{ padding: "14px 20px", fontSize: 14, color: "#6B7280" }}>{fmt((w as any).paid_out || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
