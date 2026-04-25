// GET /api/v1/accounting/status?merchant_id=...&type=business|personal
//
// Returns each provider's `enabled` (env flag on) + `connected`
// (merchant has an active row in the integrations table). Used by the
// AccountingConnectionsPanel to render live/coming-soon states
// without a second round-trip.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

type Provider = "quickbooks" | "xero" | "wave" | "freshbooks";

const PROVIDERS: Array<{ id: Provider; envFlag: string }> = [
  { id: "quickbooks", envFlag: "QUICKBOOKS_OAUTH_ENABLED" },
  { id: "xero",       envFlag: "XERO_OAUTH_ENABLED" },
  { id: "wave",       envFlag: "WAVE_OAUTH_ENABLED" },
  { id: "freshbooks", envFlag: "FRESHBOOKS_OAUTH_ENABLED" },
];

interface ConnectionRow {
  provider: string;
  account_label: string | null;
  connected_at: string | null;
}

export async function GET(req: NextRequest) {
  const merchantId = req.nextUrl.searchParams.get("merchant_id")?.trim();
  if (!merchantId) {
    return NextResponse.json({ error: { code: "bad_request", message: "merchant_id_required" } }, { status: 400 });
  }
  const connectionType = (req.nextUrl.searchParams.get("type") ?? "business") as "business" | "personal";

  // Accounting connections live in an optional table. If it hasn't
  // been created yet, PGRST205 — just pretend no one is connected.
  const db = getSupabaseAdmin();
  let existing: ConnectionRow[] = [];
  try {
    const { data, error } = await db
      .from("zenipay_accounting_connections")
      .select("provider, account_label, connected_at")
      .eq("merchant_id", merchantId)
      .eq("connection_type", connectionType)
      .eq("status", "active");
    if (error && error.code !== "PGRST205") throw error;
    existing = (data ?? []) as ConnectionRow[];
  } catch { /* swallow — treat as disconnected */ }

  const providers = PROVIDERS.map((p) => {
    const row = existing.find((r) => r.provider === p.id);
    return {
      id: p.id,
      enabled: process.env[p.envFlag] === "true",
      connected: !!row,
      connected_at: row?.connected_at ?? null,
      account_label: row?.account_label ?? null,
    };
  });

  return NextResponse.json({ providers });
}
