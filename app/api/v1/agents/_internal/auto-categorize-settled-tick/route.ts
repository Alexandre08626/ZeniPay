// POST /api/v1/agents/_internal/auto-categorize-settled-tick
//
// Cron — every 15 minutes. Picks up to 500 card_authorizations per run
// where decision='approved' AND gl_account_id IS NULL, resolves the GL
// via mcc-mapper, and persists. Idempotent (runs can't double-assign).
//
// Safety rail: NEVER overwrites an existing gl_account_id — i.e. never
// overrides a CFO's manual re-categorization.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAgentsDb } from "@/lib/agents/supabase-client";
import { mapMccToGlAccount } from "@/lib/agents/accounting/mcc-mapper";

const BATCH_SIZE = 500;

export async function POST(req: NextRequest) {
  const cronSecret = process.env.AGENTS_ACCOUNTING_CRON_SECRET || process.env.CRON_SECRET;
  if (process.env.NODE_ENV === "production" && cronSecret) {
    const got = req.headers.get("authorization") ?? "";
    if (got !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const db = getAgentsDb();
  const { data } = await db
    .from("card_authorizations")
    .select("id, organization_id, merchant_category")
    .eq("decision", "approved")
    .is("gl_account_id", null)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  const rows = (data ?? []) as Array<{ id: string; organization_id: string; merchant_category: string | null }>;
  let categorized = 0;
  let uncategorizable = 0;
  const perSource: Record<string, number> = {};

  for (const row of rows) {
    const result = await mapMccToGlAccount(row.organization_id, row.merchant_category);
    perSource[result.source] = (perSource[result.source] ?? 0) + 1;
    if (!result.gl_account_id) { uncategorizable++; continue; }
    const { error } = await db
      .from("card_authorizations")
      .update({ gl_account_id: result.gl_account_id })
      .eq("id", row.id)
      .is("gl_account_id", null);  // race-safe: don't overwrite if another process already did
    if (!error) categorized++;
  }

  return NextResponse.json({
    picked: rows.length,
    categorized,
    uncategorizable,
    by_source: perSource,
  });
}

export async function GET(req: NextRequest) { return POST(req); }
