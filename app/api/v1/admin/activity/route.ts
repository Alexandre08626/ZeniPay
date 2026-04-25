// GET /api/v1/admin/activity
//
// Recent platform-wide activity for the /admin/overview live blocks:
//   - last_transactions (zenipay_payments + zenipay_transfers, merged)
//   - active_agents
//   - fraud_alerts (best-effort across agents.fraud_alerts +
//     agents.anomaly_signals)
//   - ledger_recent (zenipay_ledger newest first)

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

const ADMIN_EMAILS = new Set(["zenipay@zeniva.ca", "info@zeniva.ca", "alexandreblais26@gmail.com"]);

function authorized(req: NextRequest): boolean {
  const email = (req.headers.get("x-admin-email") ?? "").trim().toLowerCase();
  return !!email && ADMIN_EMAILS.has(email);
}

interface Payment { id: string; merchant_id?: string; amount?: number; currency?: string; status?: string; date?: string; description?: string }
interface Transfer { id: string; merchant_id?: string; amount?: number; status?: string; created_at?: string; recipient_name?: string; transfer_type?: string }

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin();
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Platform-wide activity = every client EXCEPT ZeniPay corporate.
  const CORP = "acc_1774740862294";
  const [{ data: pay }, { data: trans }, { data: ledger }] = await Promise.all([
    db.from("zenipay_payments").select("id, merchant_id, amount, currency, status, date, description").neq("merchant_id", CORP).order("date", { ascending: false }).limit(10),
    db.from("zenipay_transfers").select("id, merchant_id, amount, status, created_at, recipient_name, transfer_type").neq("merchant_id", CORP).order("created_at", { ascending: false }).limit(10),
    db.from("zenipay_ledger").select("*").neq("merchant_id", CORP).order("created_at", { ascending: false }).limit(10),
  ]);
  const lastTransactions = [
    ...(pay ?? []).map((p: Payment) => ({ kind: "payment" as const, id: p.id, merchant_id: p.merchant_id, amount: Number(p.amount ?? 0), currency: p.currency ?? "CAD", status: p.status ?? "succeeded", date: p.date, description: p.description ?? "" })),
    ...(trans ?? []).map((t: Transfer) => ({ kind: "transfer" as const, id: t.id, merchant_id: t.merchant_id, amount: Number(t.amount ?? 0), currency: "CAD", status: t.status ?? "completed", date: t.created_at, description: `${t.transfer_type ?? "transfer"} → ${t.recipient_name ?? ""}` })),
  ].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")).slice(0, 10);

  // Active agents (agents schema).
  let activeAgents: Array<{ id: string; name: string; agent_type: string; organization_id: string; created_at: string }> = [];
  if (url && key) {
    try {
      const r = await fetch(`${url}/rest/v1/agents?status=eq.active&select=id,name,agent_type,organization_id,created_at&order=created_at.desc&limit=10`, {
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Accept-Profile": "agents" },
        cache: "no-store",
      });
      if (r.ok) activeAgents = await r.json();
    } catch { /* ignore */ }
  }

  // Fraud + anomaly signals (best-effort).
  let fraudAlerts: Array<{ id: string; severity: string; description: string; agent_id?: string; created_at: string }> = [];
  if (url && key) {
    try {
      const r = await fetch(`${url}/rest/v1/anomaly_signals?select=id,severity,signal_type,agent_id,created_at&order=created_at.desc&limit=10`, {
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Accept-Profile": "agents" },
        cache: "no-store",
      });
      if (r.ok) {
        type Signal = { id: string; severity: string; signal_type?: string; description?: string; agent_id?: string; created_at: string };
        const raw = await r.json() as Signal[];
        fraudAlerts = raw.map((s) => ({
          id: s.id, severity: s.severity, description: s.description ?? s.signal_type ?? "anomaly",
          agent_id: s.agent_id, created_at: s.created_at,
        }));
      }
    } catch { /* ignore */ }
  }

  return NextResponse.json({
    last_transactions: lastTransactions,
    active_agents: activeAgents,
    fraud_alerts: fraudAlerts,
    ledger_recent: ledger ?? [],
  });
}
