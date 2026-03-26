"use client";
import { useState, useEffect } from "react";

const ZP_GRAD = "linear-gradient(135deg, #2DBE60 0%, #15B8C9 45%, #7B4FBF 100%)";

interface Message { role: "user" | "assistant"; content: string; }

export default function BenAIPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! I'm Ben, your ZeniPay AI assistant. I can help you analyze transactions, understand trends, and optimize your payment operations. What would you like to know?" },
  ]);
  const [input, setInput] = useState("");
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/zenipay/stats")
      .then(r => r.json())
      .then(setStats)
      .catch(console.error);
  }, []);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    // Simple AI-like responses based on data
    let response = "";
    const q = userMsg.toLowerCase();

    if (q.includes("revenue") || q.includes("revenu")) {
      response = `Your total revenue is $${(stats?.stats?.total_revenue || 0).toFixed(2)} from ${stats?.stats?.total_payments || 0} transactions. Success rate: ${stats?.stats?.success_rate || 0}%.`;
    } else if (q.includes("transaction") || q.includes("payment")) {
      const txns = stats?.recent_transactions || [];
      response = `You have ${txns.length} recent transactions. ${txns.filter((t: any) => t.status === "succeeded").length} succeeded, ${txns.filter((t: any) => t.status === "pending").length} pending, ${txns.filter((t: any) => t.status === "failed").length} failed.`;
    } else if (q.includes("invoice") || q.includes("facture")) {
      const invs = stats?.recent_invoices || [];
      response = `You have ${invs.length} invoices. Total billed: $${invs.reduce((s: number, i: any) => s + Number(i.total || 0), 0).toFixed(2)}.`;
    } else if (q.includes("balance") || q.includes("solde")) {
      const bal = stats?.wallets?.platform?.available || 0;
      response = `Your platform balance is $${bal.toFixed(2)}. This represents all successful payments minus payouts.`;
    } else if (q.includes("help") || q.includes("aide")) {
      response = "I can help with:\n- Revenue analysis (\"What's my revenue?\")\n- Transaction insights (\"Show me transactions\")\n- Invoice overview (\"How many invoices?\")\n- Balance check (\"What's my balance?\")\n- Performance tips";
    } else {
      response = `Based on your ZeniPay data: you have ${stats?.stats?.total_payments || 0} total transactions with ${stats?.stats?.success_rate || 0}% success rate. Your total revenue is $${(stats?.stats?.total_revenue || 0).toFixed(2)}. Want me to dig deeper into anything specific?`;
    }

    setTimeout(() => {
      setMessages(prev => [...prev, { role: "assistant", content: response }]);
      setLoading(false);
    }, 600);
  };

  return (
    <div style={{ padding: "32px 32px 48px", display: "flex", flexDirection: "column", height: "calc(100vh - 0px)" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: "#111827", margin: "0 0 4px" }}>Ben AI</h1>
        <p style={{ fontSize: 14, color: "#6B7280", margin: 0 }}>Your AI-powered payment analyst</p>
      </div>

      {/* Chat */}
      <div style={{ flex: 1, background: "#fff", borderRadius: 14, border: "1px solid #E5E7EB", display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 400 }}>
        <div style={{ flex: 1, padding: 20, overflowY: "auto" }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", marginBottom: 12 }}>
              <div style={{
                maxWidth: "70%",
                padding: "12px 16px",
                borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                background: msg.role === "user" ? ZP_GRAD : "#F3F4F6",
                color: msg.role === "user" ? "#fff" : "#111827",
                fontSize: 14,
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
              }}>
                {msg.role === "assistant" && <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 4 }}>Ben AI</div>}
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
              <div style={{ padding: "12px 16px", borderRadius: "14px 14px 14px 4px", background: "#F3F4F6", fontSize: 14, color: "#9CA3AF" }}>
                Thinking...
              </div>
            </div>
          )}
        </div>

        <form onSubmit={e => { e.preventDefault(); sendMessage(); }} style={{ padding: "12px 16px", borderTop: "1px solid #E5E7EB", display: "flex", gap: 10 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask Ben about your payments..."
            style={{ flex: 1, padding: "12px 16px", borderRadius: 10, border: "1px solid #D1D5DB", fontSize: 14, outline: "none", boxSizing: "border-box" }}
          />
          <button type="submit" disabled={loading} style={{ padding: "12px 24px", borderRadius: 10, border: "none", background: ZP_GRAD, color: "#fff", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
