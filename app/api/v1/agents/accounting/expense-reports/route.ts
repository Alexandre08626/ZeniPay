// GET  /expense-reports              list org reports, newest first
// POST /expense-reports              build new report
//                                    body: { period: 'weekly'|'monthly'|'custom',
//                                            start?: YYYY-MM-DD, end?: YYYY-MM-DD }

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../../_lib/auth";
import { getAgentsDb } from "@/lib/agents/supabase-client";
import { logEvent } from "@/lib/agents/audit-log";
import { periodWindow, buildReport, type Period } from "@/lib/agents/accounting/report-builder";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const db = getAgentsDb();
  const { data, error } = await db
    .from("expense_reports")
    .select("id, period_start, period_end, status, finalized_at, finalized_by, export_format, notes, parent_report_id, created_at")
    .eq("organization_id", auth.organizationId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reports: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const body = await req.json().catch(() => ({}));
  const period = String(body?.period ?? "monthly") as Period;
  if (!["weekly", "monthly", "custom"].includes(period)) {
    return NextResponse.json({ error: "period must be weekly|monthly|custom" }, { status: 400 });
  }
  const start = body?.start ? String(body.start) : undefined;
  const end   = body?.end ? String(body.end) : undefined;

  let win: { start: string; end: string };
  try {
    win = periodWindow(period, new Date(), start && end ? { start, end } : undefined);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "bad window" }, { status: 400 });
  }

  try {
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
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "build failed" }, { status: 500 });
  }
}
