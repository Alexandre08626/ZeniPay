"use client";
import { useEffect, useState } from "react";

interface Invoice {
  id: string;
  payment_id: string;
  customer_name: string;
  customer_email: string;
  total: number;
  currency: string;
  status: string;
  paid_at: string;
  created_at: string;
  items: string;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/zenipay/invoices/backfill");
      if (!res.ok) throw new Error("Failed to fetch");

      // Fetch from Supabase directly
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mjkvkibdfteonvlahtag.supabase.co";
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qa3ZraWJkZnRlb252bGFodGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDgwMjYsImV4cCI6MjA5MDAyNDAyNn0.yRUCBzFEDWaM8aXBTu4BmkbdX9RdJPGYV_ZJBeG7DD4";

      const response = await fetch(`${supabaseUrl}/rest/v1/zenipay_invoices?select=*&order=created_at.desc`, {
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInvoices(data);
      }
    } catch (err) {
      console.error("Error fetching invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async (invoice: Invoice) => {
    // Generate PDF using browser print
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const items = JSON.parse(invoice.items || "[]");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoice.id}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 40px; border-bottom: 2px solid #2DBE60; padding-bottom: 20px; }
          .logo { font-size: 32px; font-weight: 900; background: linear-gradient(135deg, #2DBE60 0%, #15B8C9 50%, #7B4FBF 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
          .invoice-number { text-align: right; }
          .invoice-number h1 { margin: 0; font-size: 24px; color: #111; }
          .invoice-number p { margin: 4px 0; color: #666; font-size: 14px; }
          .section { margin: 30px 0; }
          .section-title { font-size: 12px; font-weight: 700; color: #666; letter-spacing: 0.05em; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #F9FAFB; padding: 12px; text-align: left; font-size: 12px; color: #666; font-weight: 700; border-bottom: 1px solid #E5E7EB; }
          td { padding: 12px; border-bottom: 1px solid #F3F4F6; }
          .total-row { font-size: 18px; font-weight: 700; background: #F9FAFB; }
          .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #E5E7EB; text-align: center; color: #666; font-size: 12px; }
          .status-badge { display: inline-block; padding: 4px 12px; border-radius: 6px; background: #10B98115; color: #10B981; font-size: 12px; font-weight: 600; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">ZeniPay</div>
            <p style="margin: 8px 0 0 0; color: #666; font-size: 14px;">International Luxury Management Inc.</p>
          </div>
          <div class="invoice-number">
            <h1>FACTURE</h1>
            <p><strong>${invoice.id}</strong></p>
            <p>Date: ${new Date(invoice.created_at).toLocaleDateString("fr-FR")}</p>
            <p><span class="status-badge">${invoice.status.toUpperCase()}</span></p>
          </div>
        </div>

        <div class="section">
          <div class="section-title">FACTURÉ À</div>
          <p style="margin: 4px 0; font-size: 16px; font-weight: 600;">${invoice.customer_name}</p>
          <p style="margin: 4px 0; color: #666;">${invoice.customer_email || ""}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>DESCRIPTION</th>
              <th style="text-align: center;">QTÉ</th>
              <th style="text-align: right;">PRIX UNITAIRE</th>
              <th style="text-align: right;">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item: any) => `
              <tr>
                <td>${item.description || ""}</td>
                <td style="text-align: center;">${item.qty || 1}</td>
                <td style="text-align: right;">$${(item.unit_price || 0).toFixed(2)}</td>
                <td style="text-align: right;">$${(item.total || 0).toFixed(2)}</td>
              </tr>
            `).join("")}
            <tr class="total-row">
              <td colspan="3" style="text-align: right;">TOTAL</td>
              <td style="text-align: right;">$${invoice.total.toFixed(2)} ${invoice.currency}</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <p><strong>Merci pour votre confiance!</strong></p>
          <p>ID de paiement: ${invoice.payment_id}</p>
          <p>Payé le: ${new Date(invoice.paid_at).toLocaleDateString("fr-FR")} à ${new Date(invoice.paid_at).toLocaleTimeString("fr-FR")}</p>
          <p style="margin-top: 20px;">ZeniPay • Powered by Finix Payments</p>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const getInvoiceNumber = (id: string) => {
    // Format: INV-2026-001
    const match = id.match(/INV-(.+)/);
    if (!match) return id;
    const timestamp = match[1];
    const year = new Date().getFullYear();
    const seq = invoices.findIndex(inv => inv.id === id) + 1;
    return `INV-${year}-${String(seq).padStart(3, "0")}`;
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", padding: "80px 20px 40px" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: "#111827", margin: "0 0 8px" }}>
            📄 Factures
          </h1>
          <p style={{ fontSize: 16, color: "#6B7280", margin: 0 }}>
            Factures auto-générées après chaque paiement réussi
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20, marginBottom: 24 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, border: "1px solid #E5E7EB" }}>
            <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 8, fontWeight: 600 }}>TOTAL FACTURES</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: "#111827" }}>{invoices.length}</div>
          </div>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, border: "1px solid #E5E7EB" }}>
            <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 8, fontWeight: 600 }}>MONTANT TOTAL</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: "#10B981" }}>
              ${invoices.reduce((sum, inv) => sum + inv.total, 0).toFixed(2)}
            </div>
          </div>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, border: "1px solid #E5E7EB" }}>
            <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 8, fontWeight: 600 }}>FACTURES PAYÉES</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: "#3B82F6" }}>
              {invoices.filter(inv => inv.status === "paid").length}
            </div>
          </div>
        </div>

        {/* Invoices Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: 20 }}>
          {loading ? (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 60, color: "#6B7280" }}>
              Chargement des factures...
            </div>
          ) : invoices.length === 0 ? (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 60, color: "#6B7280" }}>
              Aucune facture générée
            </div>
          ) : (
            invoices.map((invoice) => (
              <div key={invoice.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", padding: 24, transition: "all 0.2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; e.currentTarget.style.borderColor = "#2DBE60"; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "#E5E7EB"; }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", fontFamily: "monospace" }}>
                      {getInvoiceNumber(invoice.id)}
                    </div>
                    <div style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>
                      {new Date(invoice.created_at).toLocaleDateString("fr-FR")}
                    </div>
                  </div>
                  <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: "#10B98115", color: "#10B981" }}>
                    {invoice.status.toUpperCase()}
                  </span>
                </div>

                <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #F3F4F6" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 4 }}>
                    {invoice.customer_name}
                  </div>
                  <div style={{ fontSize: 13, color: "#6B7280" }}>
                    {invoice.customer_email || "—"}
                  </div>
                </div>

                <div style={{ fontSize: 28, fontWeight: 900, color: "#111827", marginBottom: 16 }}>
                  ${invoice.total.toFixed(2)}
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#6B7280", marginLeft: 8 }}>
                    {invoice.currency}
                  </span>
                </div>

                <button
                  onClick={() => downloadPDF(invoice)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: 8,
                    border: "1px solid #2DBE60",
                    background: "linear-gradient(135deg, #2DBE60 0%, #15B8C9 100%)",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(45,190,96,0.3)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  📥 Télécharger PDF
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
