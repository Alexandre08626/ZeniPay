// DELETE /api/v1/agents/funding-sources/[id] — soft-delete (compliance).

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../../_lib/auth";
import { getAgentsDb } from "@/lib/agents/supabase-client";
import { logEvent } from "@/lib/agents/audit-log";

interface RouteContext { params: Promise<{ id: string }> | { id: string }; }

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const { id } = await Promise.resolve(ctx.params);
  const db = getAgentsDb();

  const { data, error } = await db
    .from("funding_sources")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", auth.organizationId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await logEvent({
    organizationId: auth.organizationId,
    actorType: auth.via === "api_key" ? "api_key" : "user",
    actorId: auth.apiKeyId ?? null,
    eventType: "funding_source.deleted",
    payload: { id },
  });
  return NextResponse.json({ deleted: true, id });
}
