export const dynamic = "force-dynamic";

// GET /api/internal/schema-probe — which tables/columns exist in production.
// Returns booleans only (no rows, no values). Protected by ZP_DIAG_TOKEN
// (header x-diag-token); disabled when the variable is unset.

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

const CHECKS: Record<string, string[]> = {
  zenipay_invoices: ["id", "invoice_number", "customer_name", "customer_email", "client_name", "client_email", "items", "subtotal", "tax", "total", "amount", "description", "payment_id", "merchant_name", "merchant_email", "notes", "paid_at", "due_date", "amount_paid", "has_installments", "status"],
  zenipay_payments: ["id", "metadata", "gateway_transfer_id", "payment_link_id", "idempotency_key"],
  zenipay_merchants: ["id", "config", "merchant_data", "email", "business_name", "auth_user_id"],
  zenipay_pay_links: ["id", "amount", "status", "uses"],
  zenipay_ledger: ["id", "payment_id"],
  zenipay_transfers: ["id"],
  zenipay_invoice_installments: ["id"],
  zenipay_orvel_settings: ["merchant_id"],
  zenipay_orvel_actions: ["id"],
};

export async function GET(req: NextRequest) {
  const token = process.env.ZP_DIAG_TOKEN || "";
  const given = req.headers.get("x-diag-token") || "";
  if (!token || given.length !== token.length || !timingSafeEqual(Buffer.from(given), Buffer.from(token))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const db = getSupabaseAdmin();
  const out: Record<string, Record<string, string>> = {};
  for (const [table, cols] of Object.entries(CHECKS)) {
    out[table] = {};
    for (const col of cols) {
      const { error } = await db.from(table).select(col).limit(1);
      out[table][col] = error ? `NO (${error.code})` : "yes";
    }
  }
  // Column types that matter (uuid vs text ids), inferred from a sample row.
  const { data: inv } = await db.from("zenipay_invoices").select("id, status").limit(5);
  // Merchant accounts overview: identity + which config keys exist (never
  // values of secrets like password/keys).
  const { data: ms } = await db.from("zenipay_merchants").select("*").order("created_at", { ascending: true });
  const SECRET = /pass|secret|key|token|hash|pin/i;
  const merchants = (ms || []).map((m: any) => {
    const cfg = (m.config || {}) as Record<string, unknown>;
    return {
      id: m.id, email: m.email, status: m.status, created_at: m.created_at,
      name: cfg.businessName || cfg.business_name || m.name || m.company || null,
      columns: Object.keys(m).filter((k) => !SECRET.test(k)),
      config_keys: Object.keys(cfg).filter((k) => !SECRET.test(k)),
      config_public: Object.fromEntries(Object.entries(cfg).filter(([k, v]) => !SECRET.test(k) && (typeof v !== "object" || v === null))),
    };
  });
  return NextResponse.json({ columns: out, sample_invoice_statuses: (inv || []).map((r: any) => r.status), merchants });
}
