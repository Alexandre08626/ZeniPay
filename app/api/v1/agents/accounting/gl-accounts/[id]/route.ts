// PATCH  /gl-accounts/[id]   { name?, parent_id?, active? }
// DELETE /gl-accounts/[id]   soft delete (active=false). Refuses if the
//                            account is referenced by a non-deleted
//                            expense_report_line (data integrity guard).

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../../../_lib/auth";
import { getAgentsDb } from "@/lib/agents/supabase-client";
import { logEvent } from "@/lib/agents/audit-log";

interface RouteContext { params: Promise<{ id: string }> | { id: string }; }
const FIELDS = ["name", "parent_id", "active"] as const;

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const { id } = await Promise.resolve(ctx.params);
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  for (const f of FIELDS) if (f in body) patch[f] = body[f];
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "no updatable fields" }, { status: 400 });

  const db = getAgentsDb();
  const { data, error } = await db
    .from("gl_accounts")
    .update(patch)
    .eq("id", id).eq("organization_id", auth.organizationId)
    .select().maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await logEvent({
    organizationId: auth.organizationId, actorType: "user",
    actorId: auth.userId ?? null,
    eventType: "gl_account.updated",
    payload: { account_id: id, fields: Object.keys(patch) },
  });
  return NextResponse.json({ account: data });
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const { id } = await Promise.resolve(ctx.params);
  const db = getAgentsDb();

  // Refuse if any expense_report_line still references this GL.
  const { count } = await db
    .from("expense_report_lines")
    .select("id", { count: "exact", head: true })
    .eq("gl_account_id", id);
  if ((count ?? 0) > 0) {
    return NextResponse.json({
      error: "gl_account_in_use",
      detail: `${count} expense report lines reference this account. Re-categorize them first or deactivate instead (PATCH active=false).`,
    }, { status: 422 });
  }

  const { data, error } = await db
    .from("gl_accounts")
    .update({ active: false })
    .eq("id", id).eq("organization_id", auth.organizationId)
    .select("id").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await logEvent({
    organizationId: auth.organizationId, actorType: "user",
    actorId: auth.userId ?? null,
    eventType: "gl_account.deactivated",
    payload: { account_id: id },
  });
  return NextResponse.json({ deactivated: true, id });
}
