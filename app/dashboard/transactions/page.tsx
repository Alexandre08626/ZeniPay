"use client";
import { useEffect, useState } from "react";

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  status: string;
  customer_name: string;
  description: string;
  card_brand?: string;
  card_last4?: string;
  gateway: string;
  created_at: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: "all", dateFrom: "", dateTo: "" });

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/zenipay/stats");
      const data = await res.json();

      // Get transactions from merchant_data
      const txns = data.merchants?.[0]?.merchant_data?.transactions || [];
      setTransactions(txns);
    } catch (err) {
      console.error("Error fetching transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    if (filter.status !== "all" && tx.status !== filter.status) return false;
    if (filter.dateFrom && new Date(tx.created_at || tx.createdAt) < new Date(filter.dateFrom)) return false;
    if (filter.dateTo && new Date(tx.created_at || tx.createdAt) > new Date(filter.dateTo)) return false;
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "succeeded": return "#10B981";
      case "pending": return "#F59E0B";
      case "failed": return "#EF4444";
      default: return "#6B7280";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "succeeded": return "✓";
      case "pending": return "⏳";
      case "failed": return "✕";
      default: return "•";
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", padding: "80px 20px 40px" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: "#111827", margin: "0 0 8px" }}>
            💳 Transactions
          </h1>
          <p style={{ fontSize: 16, color: "#6B7280", margin: 0 }}>
            Tous les paiements Finix en temps réel
          </p>
        </div>

        {/* Filters */}
        <div style={{ background: "#fff", borderRadius: 12, padding: 24, marginBottom: 24, border: "1px solid #E5E7EB", display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 200px" }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
              Statut
            </label>
            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 14 }}
            >
              <option value="all">Tous</option>
              <option value="succeeded">Réussi</option>
              <option value="pending">En attente</option>
              <option value="failed">Échoué</option>
            </select>
          </div>
          <div style={{ flex: "1 1 200px" }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
              Date début
            </label>
            <input
              type="date"
              value={filter.dateFrom}
              onChange={(e) => setFilter({ ...filter, dateFrom: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 14 }}
            />
          </div>
          <div style={{ flex: "1 1 200px" }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
              Date fin
            </label>
            <input
              type="date"
              value={filter.dateTo}
              onChange={(e) => setFilter({ ...filter, dateTo: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 14 }}
            />
          </div>
          <div style={{ flex: "0 0 auto", display: "flex", alignItems: "flex-end" }}>
            <button
              onClick={() => setFilter({ status: "all", dateFrom: "", dateTo: "" })}
              style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #D1D5DB", background: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              Réinitialiser
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20, marginBottom: 24 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, border: "1px solid #E5E7EB" }}>
            <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 8, fontWeight: 600 }}>TOTAL TRANSACTIONS</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: "#111827" }}>{filteredTransactions.length}</div>
          </div>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, border: "1px solid #E5E7EB" }}>
            <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 8, fontWeight: 600 }}>VOLUME TOTAL</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: "#10B981" }}>
              ${filteredTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0).toFixed(2)}
            </div>
          </div>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, border: "1px solid #E5E7EB" }}>
            <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 8, fontWeight: 600 }}>TAUX DE SUCCÈS</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: "#3B82F6" }}>
              {filteredTransactions.length > 0
                ? ((filteredTransactions.filter(tx => tx.status === "succeeded").length / filteredTransactions.length) * 100).toFixed(1)
                : 0}%
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                  <th style={{ padding: "16px 20px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#6B7280", letterSpacing: "0.05em" }}>ID</th>
                  <th style={{ padding: "16px 20px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#6B7280", letterSpacing: "0.05em" }}>CLIENT</th>
                  <th style={{ padding: "16px 20px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#6B7280", letterSpacing: "0.05em" }}>MONTANT</th>
                  <th style={{ padding: "16px 20px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#6B7280", letterSpacing: "0.05em" }}>CARTE</th>
                  <th style={{ padding: "16px 20px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#6B7280", letterSpacing: "0.05em" }}>STATUT</th>
                  <th style={{ padding: "16px 20px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#6B7280", letterSpacing: "0.05em" }}>DATE</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#6B7280" }}>
                      Chargement...
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#6B7280" }}>
                      Aucune transaction trouvée
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx, i) => (
                    <tr key={tx.id || i} style={{ borderBottom: "1px solid #F3F4F6" }}>
                      <td style={{ padding: "16px 20px", fontSize: 14, color: "#111827", fontFamily: "monospace" }}>
                        {tx.id}
                      </td>
                      <td style={{ padding: "16px 20px", fontSize: 14, color: "#111827" }}>
                        {tx.customer_name || "—"}
                      </td>
                      <td style={{ padding: "16px 20px", fontSize: 14, fontWeight: 600, color: "#111827" }}>
                        {tx.amount?.toFixed(2) || "0.00"} {tx.currency || "USD"}
                      </td>
                      <td style={{ padding: "16px 20px", fontSize: 14, color: "#6B7280" }}>
                        {tx.card_brand || "—"} •••• {tx.card_last4 || "****"}
                      </td>
                      <td style={{ padding: "16px 20px" }}>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "4px 12px",
                          borderRadius: 6,
                          fontSize: 13,
                          fontWeight: 600,
                          background: `${getStatusColor(tx.status)}15`,
                          color: getStatusColor(tx.status),
                        }}>
                          {getStatusIcon(tx.status)} {tx.status || "unknown"}
                        </span>
                      </td>
                      <td style={{ padding: "16px 20px", fontSize: 14, color: "#6B7280" }}>
                        {new Date(tx.created_at || tx.createdAt).toLocaleDateString("fr-FR", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
