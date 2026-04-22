// PATCH  /approval-policies/[id]   update fields
// DELETE /approval-policies/[id]   soft delete (active=false)

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../../_lib/auth";
import { getAgentsDb } from "@/lib/agents/supabase-client";
import { logEvent } from "@/lib/agents/audit-log";

interface RouteContext { params: Promise<{ id: string }> | { id: string }; }
const FIELDS = [
  "name", "trigger_type", "trigger_config", "approver_type", "approver_config",
  "timeout_seconds", "default_action", "active", "priority",
];

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
    .from("approval_policies")
    .update(patch)
    .eq("id", id)
    .eq("organization_id", auth.organizationId)
    .select()
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await logEvent({
    organizationId: auth.organizationId, actorType: "user",
    actorId: auth.userId ?? null,
    eventType: "approval_policy.updated", payload: { policy_id: id, fields: Object.keys(patch) },
  });
  return NextResponse.json({ policy: data });
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const { id } = await Promise.resolve(ctx.params);
  const db = getAgentsDb();
  const { data, error } = await db
    .from("approval_policies")
    .update({ active: false })
    .eq("id", id)
    .eq("organization_id", auth.organizationId)
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await logEvent({
    organizationId: auth.organizationId, actorType: "user",
    actorId: auth.userId ?? null,
    eventType: "approval_policy.deactivated", payload: { policy_id: id },
  });
  return NextResponse.json({ deactivated: true, id });
}
