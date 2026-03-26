"use client";
import { useEffect, useState } from "react";

interface PayLink {
  id: string; url: string; amount: number; currency: string;
  description: string; status: string; uses: number; max_uses: number | null;
  expires_at: string | null; created_at: string;
}

export default function PayLinksPage() {
  const [links, setLinks] = useState<PayLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ amount: "", description: "", currency: "USD" });
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState("");

  useEffect(() => { fetchLinks(); }, []);

  const fetchLinks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/zenipay/create-link");
      const data = await res.json();
      setLinks(data.links || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const createLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) return;
    setCreating(true);
    try {
      const res = await fetch("/api/zenipay/create-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parseFloat(form.amount), currency: form.currency, description: form.description }),
      });
      const data = await res.json();
      if (data.success) {
        setForm({ amount: "", description: "", currency: "USD" });
        setShowCreate(false);
        fetchLinks();
      }
    } catch (e) { console.error(e); }
    setCreating(false);
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(""), 2000);
  };

  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  return (
    <div style={{ padding: "32px 32px 48px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: "#111827", margin: "0 0 4px" }}>Pay Links</h1>
          <p style={{ fontSize: 14, color: "#6B7280", margin: 0 }}>Create and manage payment links</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #2DBE60, #15B8C9)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          + Create Link
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <form onSubmit={createLink} style={{ background: "#fff", borderRadius: 14, padding: 24, border: "1px solid #E5E7EB", marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px", color: "#111827" }}>New Payment Link</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Amount</label>
              <input type="number" step="0.01" min="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="49.99" required style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 14, boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Currency</label>
              <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 14 }}>
                <option value="USD">USD</option>
                <option value="CAD">CAD</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Description</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Service or product name" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 14, boxSizing: "border-box" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" disabled={creating} style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: "#2DBE60", color: "#fff", fontSize: 14, fontWeight: 700, cursor: creating ? "not-allowed" : "pointer" }}>
              {creating ? "Creating..." : "Create Link"}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} style={{ padding: "10px 24px", borderRadius: 8, border: "1px solid #D1D5DB", background: "#fff", fontSize: 14, cursor: "pointer" }}>Cancel</button>
          </div>
        </form>
      )}

      {/* Links Table */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
              {["LINK", "AMOUNT", "DESCRIPTION", "USES", "STATUS", "CREATED", ""].map(h => (
                <th key={h} style={{ padding: "14px 18px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#6B7280" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#9CA3AF" }}>Loading...</td></tr>
            ) : links.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#9CA3AF" }}>No pay links yet. Create your first one!</td></tr>
            ) : links.map(link => (
              <tr key={link.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                <td style={{ padding: "14px 18px", fontSize: 13, fontFamily: "monospace", color: "#374151" }}>{link.id}</td>
                <td style={{ padding: "14px 18px", fontSize: 14, fontWeight: 600, color: "#111827" }}>{fmt(link.amount)}</td>
                <td style={{ padding: "14px 18px", fontSize: 13, color: "#6B7280", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{link.description || "—"}</td>
                <td style={{ padding: "14px 18px", fontSize: 13, color: "#111827" }}>{link.uses}{link.max_uses ? `/${link.max_uses}` : ""}</td>
                <td style={{ padding: "14px 18px" }}>
                  <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: link.status === "active" ? "#10B98115" : "#6B728015", color: link.status === "active" ? "#10B981" : "#6B7280" }}>{link.status}</span>
                </td>
                <td style={{ padding: "14px 18px", fontSize: 13, color: "#6B7280" }}>
                  {new Date(link.created_at).toLocaleDateString("fr-FR", { month: "short", day: "numeric" })}
                </td>
                <td style={{ padding: "14px 18px" }}>
                  <button onClick={() => copyUrl(link.url)} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #D1D5DB", background: copied === link.url ? "#10B981" : "#fff", color: copied === link.url ? "#fff" : "#374151", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    {copied === link.url ? "Copied!" : "Copy URL"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
