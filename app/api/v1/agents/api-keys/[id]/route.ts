// DELETE /api/v1/agents/api-keys/[id]  — revoke (does NOT delete the row;
//                                         sets revoked_at = now()).

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../../_lib/auth";
import { getAgentsDb } from "@/lib/agents/supabase-client";
import { revokeApiKey } from "@/lib/agents/api-keys";
import { logEvent } from "@/lib/agents/audit-log";

interface RouteContext {
  params: Promise<{ id: string }> | { id: string };
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const { id } = await Promise.resolve(ctx.params);

  const db = getAgentsDb();
  // Scope check.
  const { data: key } = await db
    .from("agent_api_keys")
    .select("id, organization_id")
    .eq("id", id)
    .maybeSingle();
  if (!key || key.organization_id !== auth.organizationId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await revokeApiKey(id);
  await logEvent({
    organizationId: auth.organizationId,
    actorType: "user",
    eventType: "api_key.revoked",
    payload: { key_id: id },
  });
  return NextResponse.json({ revoked: true, id });
}
