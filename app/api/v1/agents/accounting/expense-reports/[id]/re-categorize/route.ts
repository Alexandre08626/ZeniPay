// POST /expense-reports/[id]/re-categorize
// Body: { line_id, gl_account_id }
// Sets manually_categorized=true so future cron runs skip this line.
// Also updates the underlying card_authorizations.gl_account_id so the
// source row is in sync (lets the overview tiles + analytics match).

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../../../../_lib/auth";
import { getAgentsDb } from "@/lib/agents/supabase-client";
import { logEvent } from "@/lib/agents/audit-log";

interface RouteContext { params: Promise<{ id: string }> | { id: string }; }

export async function POST(req: NextRequest, ctx: RouteContext) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const { id: reportId } = await Promise.resolve(ctx.params);
  const body = await req.json().catch(() => ({}));
  const lineId = String(body?.line_id ?? "");
  const glAccountId = String(body?.gl_account_id ?? "");
  if (!lineId || !glAccountId) return NextResponse.json({ error: "line_id + gl_account_id required" }, { status: 400 });

  const db = getAgentsDb();

  // Scope: report belongs to org.
  const { data: report } = await db
    .from("expense_reports").select("id, status")
    .eq("id", reportId).eq("organization_id", auth.organizationId)
    .maybeSingle();
  if (!report) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if ((report as { status: string }).status === "finalized") {
    return NextResponse.json({ error: "finalized_is_immutable" }, { status: 422 });
  }

  // Scope: gl_account belongs to org.
  const { data: gl } = await db
    .from("gl_accounts").select("id")
    .eq("id", glAccountId).eq("organization_id", auth.organizationId)
    .maybeSingle();
  if (!gl) return NextResponse.json({ error: "gl_account_not_found" }, { status: 404 });

  // Load the line to find its source.
  const { data: line } = await db
    .from("expense_report_lines")
    .select("id, report_id, card_auth_id, transaction_id")
    .eq("id", lineId).eq("report_id", reportId)
    .maybeSingle();
  if (!line) return NextResponse.json({ error: "line_not_found" }, { status: 404 });

  // Update the line.
  await db
    .from("expense_report_lines")
    .update({ gl_account_id: glAccountId, manually_categorized: true })
    .eq("id", lineId);

  // Mirror onto the underlying card_authorization so dashboards + future
  // reports see the same GL. Non-blocking — if this fails, the line is the
  // source of truth.
  const cardAuthId = (line as { card_auth_id: string | null }).card_auth_id;
  if (cardAuthId) {
    await db
      .from("card_authorizations")
      .update({ gl_account_id: glAccountId })
      .eq("id", cardAuthId)
      .eq("organization_id", auth.organizationId);
  }

  await logEvent({
    organizationId: auth.organizationId, actorType: "user",
    actorId: auth.userId ?? null,
    eventType: "expense_line.recategorized",
    payload: { report_id: reportId, line_id: lineId, gl_account_id: glAccountId },
  });
  return NextResponse.json({ ok: true, line_id: lineId, gl_account_id: glAccountId });
}
