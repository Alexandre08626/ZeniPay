// GET /api/v1/admin/stats
//
// Aggregate KPIs for /admin/overview. Counts only — no raw rows —
// so it stays fast even as tables grow. Auth: x-admin-email header
// against the same allowlist as /admin/merchants.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

const ADMIN_EMAILS = new Set(["zenipay@zeniva.ca", "info@zeniva.ca", "alexandreblais26@gmail.com"]);

function authorized(req: NextRequest): boolean {
  const email = (req.headers.get("x-admin-email") ?? "").trim().toLowerCase();
  return !!email && ADMIN_EMAILS.has(email);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getSupabaseAdmin();

  const headers: Record<string, string> = { Prefer: "count=exact" };

  async function count(table: string, filter?: string): Promise<number> {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return 0;
    const path = filter
      ? `${url}/rest/v1/${table}?select=id&${filter}&limit=1`
      : `${url}/rest/v1/${table}?select=id&limit=1`;
    const res = await fetch(path, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, ...headers },
      cache: "no-store",
    });
    const cr = res.headers.get("content-range");
    const total = cr ? Number(cr.split("/")[1]) : 0;
    return Number.isFinite(total) ? total : 0;
  }

  const [
    merchantsActive,
    merchantsKyb,
    payLinksActive,
    invoicesOpen,
    apiKeysActive,
    leadsTotal,
  ] = await Promise.all([
    // Exclude ZeniPay corporate — it's the house, not a client.
    count("zenipay_merchants",  "status=eq.active&id=neq.acc_1774740862294"),
    count("zenipay_merchants",  "status=eq.pending_kyb&id=neq.acc_1774740862294"),
    count("zenipay_pay_links",  "status=eq.active").catch(() => 0),
    count("zenipay_invoices",   "status=eq.sent").catch(() => 0),
    count("zenipay_api_keys",   "is_active=eq.true").catch(() => 0),
    count("zenipay_leads",      "").catch(() => 0),
  ]);

  // Volume + transaction count: aggregate via PostgREST head request.
  // For accuracy at scale we'd want a SQL view; this is fine for v1.
  const { data: payments } = await db.from("zenipay_payments").select("amount").limit(5000);
  const totalVolume = (payments ?? []).reduce((s, p) => s + Number((p as { amount?: number }).amount ?? 0), 0);
  const totalTx = (payments ?? []).length;

  // Agents in agents.* schema — read via service-role agents schema.
  let totalAgents = 0;
  try {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      const res = await fetch(`${url}/rest/v1/agents?select=id&limit=1`, {
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Accept-Profile": "agents", Prefer: "count=exact" },
        cache: "no-store",
      });
      const cr = res.headers.get("content-range");
      totalAgents = cr ? Number(cr.split("/")[1]) : 0;
    }
  } catch { /* ignore */ }

  // ZeniCore journal entries via the public wrapper /api/v1/agents/ledger
  let zenicoreJournal = 0;
  try {
    const { data: led } = await db.from("zenipay_ledger").select("id").limit(5000);
    zenicoreJournal = (led ?? []).length;
  } catch { /* ignore */ }

  return NextResponse.json({
    merchants_active: merchantsActive,
    merchants_pending_kyb: merchantsKyb,
    total_agents: totalAgents,
    total_transactions: totalTx,
    total_volume: totalVolume,
    zenicore_journal_entries: zenicoreJournal,
    paylinks_active: payLinksActive,
    invoices_open: invoicesOpen,
    api_keys_active: apiKeysActive,
    leads_total: leadsTotal,
  });
}
