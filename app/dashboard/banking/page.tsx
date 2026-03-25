"use client";
import { useEffect, useState } from "react";

export default function BankingPage() {
  const [balance, setBalance] = useState({ available: 0, pending: 0 });
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    // Fetch balance and transactions from stats
    fetch("/api/zenipay/stats").then(res => res.json()).then(data => {
      // Calculate balance from succeeded transactions (sandbox mock)
      const txns = data.recent_transactions || [];
      const succeeded = txns.filter((tx: any) => tx.status === "succeeded");
      const available = succeeded.reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0);

      setBalance({ available, pending: 0 });
      setTransactions(succeeded);
    }).catch(() => {});
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", padding: "80px 20px 40px" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: "#111827", marginBottom: 8 }}>
          🏦 Banking
        </h1>
        <p style={{ fontSize: 16, color: "#6B7280", marginBottom: 32 }}>
          Solde Finix Merchant Account (Sandbox)
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20, marginBottom: 32 }}>
          <div style={{ background: "linear-gradient(135deg, #2DBE60 0%, #15B8C9 100%)", borderRadius: 16, padding: 32, color: "#fff" }}>
            <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8, fontWeight: 600 }}>SOLDE DISPONIBLE</div>
            <div style={{ fontSize: 48, fontWeight: 900 }}>
              ${balance.available.toFixed(2)}
            </div>
            <div style={{ fontSize: 13, opacity: 0.8, marginTop: 8 }}>Utilisable immédiatement</div>
          </div>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, border: "1px solid #E5E7EB" }}>
            <div style={{ fontSize: 14, color: "#6B7280", marginBottom: 8, fontWeight: 600 }}>EN ATTENTE</div>
            <div style={{ fontSize: 48, fontWeight: 900, color: "#F59E0B" }}>
              ${balance.pending.toFixed(2)}
            </div>
            <div style={{ fontSize: 13, color: "#6B7280", marginTop: 8 }}>En cours de traitement</div>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", padding: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111827", marginBottom: 20 }}>
            Historique des dépôts
          </h2>
          <div style={{ display: "grid", gap: 12 }}>
            {transactions.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "#6B7280" }}>Aucun dépôt encore</div>
            ) : (
              transactions.map((tx, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 16, background: "#F9FAFB", borderRadius: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "#111827", marginBottom: 4 }}>{tx.description || "Dépôt"}</div>
                    <div style={{ fontSize: 13, color: "#6B7280" }}>
                      {new Date(tx.date || tx.created_at).toLocaleString("fr-FR")}
                    </div>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#10B981" }}>
                    +${tx.amount?.toFixed(2) || "0.00"}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
