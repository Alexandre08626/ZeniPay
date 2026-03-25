"use client";
import { useEffect, useState } from "react";

interface PayLink {
  id: string;
  url: string;
  amount: number;
  currency: string;
  description: string;
  status: string;
  uses: number;
  max_uses?: number;
  expires_at?: string;
  created_at: string;
}

export default function PayLinksPage() {
  const [links, setLinks] = useState<PayLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      const supabaseUrl = "https://mjkvkibdfteonvlahtag.supabase.co";
      const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qa3ZraWJkZnRlb252bGFodGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDgwMjYsImV4cCI6MjA5MDAyNDAyNn0.yRUCBzFEDWaM8aXBTu4BmkbdX9RdJPGYV_ZJBeG7DD4";

      const res = await fetch(`${supabaseUrl}/rest/v1/zenipay_pay_links?select=*&order=created_at.desc`, {
        headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` },
      });

      if (res.ok) {
        const data = await res.json();
        setLinks(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    alert("Lien copié!");
  };

  const isExpired = (link: PayLink) => {
    if (!link.expires_at) return false;
    return new Date(link.expires_at) < new Date();
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", padding: "80px 20px 40px" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: "#111827", marginBottom: 8 }}>
          🔗 Pay Links
        </h1>
        <p style={{ fontSize: 16, color: "#6B7280", marginBottom: 32 }}>
          Liens de paiement persistants
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20, marginBottom: 32 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, border: "1px solid #E5E7EB" }}>
            <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 8, fontWeight: 600 }}>TOTAL LIENS</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: "#111827" }}>{links.length}</div>
          </div>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, border: "1px solid #E5E7EB" }}>
            <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 8, fontWeight: 600 }}>ACTIFS</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: "#10B981" }}>
              {links.filter(l => l.status === "active" && !isExpired(l)).length}
            </div>
          </div>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, border: "1px solid #E5E7EB" }}>
            <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 8, fontWeight: 600 }}>UTILISATIONS</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: "#3B82F6" }}>
              {links.reduce((sum, l) => sum + (l.uses || 0), 0)}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 60, color: "#6B7280" }}>Chargement...</div>
          ) : links.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "#6B7280" }}>Aucun lien créé</div>
          ) : (
            links.map(link => {
              const expired = isExpired(link);
              const statusColor = expired ? "#EF4444" : link.status === "active" ? "#10B981" : "#6B7280";

              return (
                <div key={link.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", padding: 24 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 20, alignItems: "start" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                        <span style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 700, color: "#111827" }}>
                          {link.id}
                        </span>
                        <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: `${statusColor}15`, color: statusColor }}>
                          {expired ? "EXPIRÉ" : link.status.toUpperCase()}
                        </span>
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 4 }}>Description</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
                          {link.description || "—"}
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, marginBottom: 16 }}>
                        <div>
                          <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 4 }}>Montant</div>
                          <div style={{ fontSize: 20, fontWeight: 900, color: "#10B981" }}>
                            ${typeof link.amount === "number" ? link.amount.toFixed(2) : "0.00"} {link.currency}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 4 }}>Utilisations</div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>
                            {link.uses || 0}{link.max_uses ? ` / ${link.max_uses}` : ""}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 4 }}>Créé le</div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
                            {new Date(link.created_at).toLocaleDateString("fr-FR")}
                          </div>
                        </div>
                      </div>

                      <div style={{ background: "#F9FAFB", borderRadius: 8, padding: 12, fontFamily: "monospace", fontSize: 13, color: "#6B7280", wordBreak: "break-all" }}>
                        {link.url}
                      </div>
                    </div>

                    <button
                      onClick={() => copyLink(link.url)}
                      style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #2DBE60", background: "#fff", color: "#2DBE60", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                    >
                      📋 Copier
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
