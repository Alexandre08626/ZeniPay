"use client";
import { useState } from "react";

export default function PayoutsPage() {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [payouts, setPayouts] = useState<any[]>([]);

  const simulatePayout = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert("Montant invalide");
      return;
    }

    setLoading(true);
    const payout = {
      id: `PO-${Date.now().toString(36).toUpperCase()}`,
      amount: parseFloat(amount),
      status: "completed",
      created_at: new Date().toISOString(),
      bank_account: "**** **** **** 1234",
    };

    setPayouts([payout, ...payouts]);
    setAmount("");
    setLoading(false);
    alert("Payout simulé avec succès!");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", padding: "80px 20px 40px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: "#111827", marginBottom: 8 }}>
          💸 Payouts
        </h1>
        <p style={{ fontSize: 16, color: "#6B7280", marginBottom: 32 }}>
          Virements vers compte bancaire (Sandbox)
        </p>

        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", padding: 32, marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Simuler un payout</h2>
          <div style={{ display: "flex", gap: 16 }}>
            <input
              type="number"
              placeholder="Montant ($)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ flex: 1, padding: "12px 16px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 16 }}
            />
            <button
              onClick={simulatePayout}
              disabled={loading}
              style={{
                padding: "12px 32px",
                borderRadius: 8,
                border: "none",
                background: "linear-gradient(135deg, #2DBE60 0%, #15B8C9 100%)",
                color: "#fff",
                fontSize: 16,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "..." : "Simuler"}
            </button>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", padding: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Historique</h2>
          {payouts.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#6B7280" }}>Aucun payout</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {payouts.map(payout => (
                <div key={payout.id} style={{ display: "flex", justifyContent: "space-between", padding: 16, background: "#F9FAFB", borderRadius: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{payout.id}</div>
                    <div style={{ fontSize: 13, color: "#6B7280" }}>
                      Vers {payout.bank_account} • {new Date(payout.created_at).toLocaleString("fr-FR")}
                    </div>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#EF4444" }}>
                    -${payout.amount.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
