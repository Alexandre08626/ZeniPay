// PATCH  /gl-accounts/[id]   { name?, parent_id?, active? }
// DELETE /gl-accounts/[id]   soft delete (active=false). Refuses if the
//                            account is referenced by a non-deleted
//                            expense_report_line (data integrity guard).

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "../../../_lib/auth";
import { errorResponse, serverError } from "@/app/api/v1/agents/accounting/_lib/errors";
import { getAgentsDb } from "@/lib/agents/supabase-client";
import { logEvent } from "@/lib/agents/audit-log";

interface RouteContext { params: Promise<{ id: string }> | { id: string }; }
const FIELDS = ["name", "parent_id", "active"] as const;

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await authenticate(req);
    if (!auth) return errorResponse("unauthorized", "unauthorized");
    const { id } = await Promise.resolve(ctx.params);
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    for (const f of FIELDS) if (f in body) patch[f] = body[f];
    if (Object.keys(patch).length === 0) return errorResponse("bad_request", "no updatable fields");

    const db = getAgentsDb();
    const { data, error } = await db
      .from("gl_accounts")
      .update(patch)
      .eq("id", id).eq("organization_id", auth.organizationId)
      .select().maybeSingle();
    if (error) return errorResponse("server_error", error.message);
    if (!data) return errorResponse("not_found", "gl_account_not_found");

    await logEvent({
      organizationId: auth.organizationId, actorType: "user",
      actorId: auth.userId ?? null,
      eventType: "gl_account.updated",
      payload: { account_id: id, fields: Object.keys(patch) },
    });
    return NextResponse.json({ account: data });
  } catch (e) { return serverError(e); }
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await authenticate(req);
    if (!auth) return errorResponse("unauthorized", "unauthorized");
    const { id } = await Promise.resolve(ctx.params);
    const db = getAgentsDb();

    const { count } = await db
      .from("expense_report_lines")
      .select("id", { count: "exact", head: true })
      .eq("gl_account_id", id);
    if ((count ?? 0) > 0) {
      return errorResponse("unprocessable", "gl_account_in_use", {
        lines_referencing: count,
        hint: "Re-categorize lines first, or deactivate (PATCH active=false) instead.",
      });
    }

    const { data, error } = await db
      .from("gl_accounts")
      .update({ active: false })
      .eq("id", id).eq("organization_id", auth.organizationId)
      .select("id").maybeSingle();
    if (error) return errorResponse("server_error", error.message);
    if (!data) return errorResponse("not_found", "gl_account_not_found");

    await logEvent({
      organizationId: auth.organizationId, actorType: "user",
      actorId: auth.userId ?? null,
      eventType: "gl_account.deactivated",
      payload: { account_id: id },
    });
    return NextResponse.json({ deactivated: true, id });
  } catch (e) { return serverError(e); }
}
