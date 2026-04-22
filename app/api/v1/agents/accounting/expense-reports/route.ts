// GET  /expense-reports              list org reports, newest first
// POST /expense-reports              build new report
//                                    body: { period: 'weekly'|'monthly'|'custom',
//                                            start?: YYYY-MM-DD, end?: YYYY-MM-DD }

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "../../_lib/auth";
import { errorResponse, serverError } from "@/app/api/v1/agents/accounting/_lib/errors";
import { getAgentsDb } from "@/lib/agents/supabase-client";
import { logEvent } from "@/lib/agents/audit-log";
import { periodWindow, buildReport, type Period } from "@/lib/agents/accounting/report-builder";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (!auth) return errorResponse("unauthorized", "unauthorized");
    const db = getAgentsDb();
    const { data, error } = await db
      .from("expense_reports")
      .select("id, period_start, period_end, status, finalized_at, finalized_by, export_format, notes, parent_report_id, created_at")
      .eq("organization_id", auth.organizationId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) return errorResponse("server_error", error.message);
    return NextResponse.json({ reports: data ?? [] });
  } catch (e) { return serverError(e); }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (!auth) return errorResponse("unauthorized", "unauthorized");
    const body = await req.json().catch(() => ({}));
    const period = String(body?.period ?? "monthly") as Period;
    if (!["weekly", "monthly", "custom"].includes(period)) {
      return errorResponse("bad_request", "period must be weekly|monthly|custom");
    }
    const start = body?.start ? String(body.start) : undefined;
    const end   = body?.end ? String(body.end) : undefined;

    let win: { start: string; end: string };
    try {
      win = periodWindow(period, new Date(), start && end ? { start, end } : undefined);
    } catch (e) {
      return errorResponse("bad_request", e instanceof Error ? e.message : "bad_window");
    }

    const { report_id } = await buildReport({
      organizationId: auth.organizationId,
      window: win,
      actor: auth.userId ?? null,
    });

    await logEvent({
      organizationId: auth.organizationId,
      actorType: auth.via === "api_key" ? "api_key" : "user",
      actorId: auth.apiKeyId ?? auth.userId ?? null,
      eventType: "expense_report.built",
      payload: { report_id, period, window: win },
    });

    return NextResponse.json({ report_id, window: win });
  } catch (e) { return serverError(e); }
}
