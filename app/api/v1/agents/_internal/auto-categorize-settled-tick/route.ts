// POST /api/v1/agents/_internal/auto-categorize-settled-tick
//
// Cron — every 15 minutes. Picks up to 500 card_authorizations per run
// where decision='approved' AND gl_account_id IS NULL, resolves the GL
// via mcc-mapper, and persists. Idempotent (runs can't double-assign).
//
// Safety rails:
// 1. NEVER overwrites an existing gl_account_id — the WHERE clause +
//    race-safe UPDATE .is("gl_account_id", null) both enforce this.
// 2. Lines with manually_categorized=true are already skipped because
//    re-categorize writes gl_account_id back onto card_authorizations,
//    which removes them from the partial index used by the picker query.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAgentsDb } from "@/lib/agents/supabase-client";
import { mapMccToGlAccount } from "@/lib/agents/accounting/mcc-mapper";
import { errorResponse, serverError } from "@/app/api/v1/agents/accounting/_lib/errors";

const BATCH_SIZE = 500;

export async function POST(req: NextRequest) {
  try {
    const cronSecret = process.env.AGENTS_ACCOUNTING_CRON_SECRET || process.env.CRON_SECRET;
    if (process.env.NODE_ENV === "production" && cronSecret) {
      const got = req.headers.get("authorization") ?? "";
      if (got !== `Bearer ${cronSecret}`) {
        return errorResponse("unauthorized", "unauthorized");
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
        .is("gl_account_id", null);
      if (!error) categorized++;
    }

    return NextResponse.json({
      picked: rows.length,
      categorized,
      uncategorizable,
      by_source: perSource,
    });
  } catch (e) { return serverError(e); }
}

export async function GET(req: NextRequest) { return POST(req); }
