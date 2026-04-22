// GET   /expense-reports/[id]
// PATCH /expense-reports/[id]   { notes?, status?: 'finalized' }

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../../../_lib/auth";
import { getAgentsDb } from "@/lib/agents/supabase-client";
import { logEvent } from "@/lib/agents/audit-log";
import { getLines } from "@/lib/agents/accounting/report-builder";

interface RouteContext { params: Promise<{ id: string }> | { id: string }; }

export async function GET(req: NextRequest, ctx: RouteContext) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const { id } = await Promise.resolve(ctx.params);
  const { searchParams } = new URL(req.url);
  const cursorStr = searchParams.get("cursor");
  const limit = Number(searchParams.get("limit") ?? "250");
  const cursor = cursorStr
    ? (() => { try { return JSON.parse(Buffer.from(cursorStr, "base64").toString()) as { created_at: string; id: string }; } catch { return null; } })()
    : null;

  const db = getAgentsDb();
  const { data: report } = await db
    .from("expense_reports")
    .select("*")
    .eq("id", id)
    .eq("organization_id", auth.organizationId)
    .maybeSingle();
  if (!report) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { lines, next_cursor } = await getLines({ reportId: id, cursor, limit });
  const nextCursorStr = next_cursor ? Buffer.from(JSON.stringify(next_cursor)).toString("base64") : null;

  // Totals for this page + overall (overall via COUNT + SUM, not JS sum).
  const { data: totals } = await db
    .from("expense_report_lines")
    .select("converted_usd_cents, gl_account_id")
    .eq("report_id", id);
  const usdTotal = (totals ?? []).reduce((s: number, r: { converted_usd_cents: number }) => s + Number(r.converted_usd_cents), 0);

  const byGl: Record<string, number> = {};
  for (const r of (totals ?? []) as Array<{ converted_usd_cents: number; gl_account_id: string | null }>) {
    const key = r.gl_account_id ?? "uncategorized";
    byGl[key] = (byGl[key] ?? 0) + Number(r.converted_usd_cents);
  }

  return NextResponse.json({
    report, lines, next_cursor: nextCursorStr,
    totals: { usd: usdTotal, lines: (totals ?? []).length, by_gl: byGl },
  });
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const { id } = await Promise.resolve(ctx.params);
  const body = await req.json().catch(() => ({}));

  const db = getAgentsDb();
  const { data: current } = await db
    .from("expense_reports").select("status")
    .eq("id", id).eq("organization_id", auth.organizationId)
    .maybeSingle();
  if (!current) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const nextStatus = body?.status as string | undefined;
  if (nextStatus && !["draft", "finalized"].includes(nextStatus)) {
    return NextResponse.json({ error: "status must be draft|finalized" }, { status: 400 });
  }
  if ((current as { status: string }).status === "finalized" && nextStatus === "draft") {
    return NextResponse.json({
      error: "finalized_is_immutable",
      detail: "Clone the report with parent_report_id to edit.",
    }, { status: 422 });
  }

  const patch: Record<string, unknown> = {};
  if ("notes" in body) patch.notes = body.notes ?? null;
  if (nextStatus === "finalized") {
    patch.status = "finalized";
    patch.finalized_at = new Date().toISOString();
    patch.finalized_by = auth.userId ?? null;
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "nothing to update" }, { status: 400 });

  const { data, error } = await db
    .from("expense_reports").update(patch)
    .eq("id", id).eq("organization_id", auth.organizationId)
    .select().maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logEvent({
    organizationId: auth.organizationId, actorType: "user",
    actorId: auth.userId ?? null,
    eventType: patch.status === "finalized" ? "expense_report.finalized" : "expense_report.updated",
    payload: { report_id: id, fields: Object.keys(patch) },
  });
  return NextResponse.json({ report: data });
}
