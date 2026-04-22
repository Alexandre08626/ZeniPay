// DELETE /mcc-mappings/[id] — remove an override; the catalog default
//                              re-applies on next auto-categorize run.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../../../_lib/auth";
import { getAgentsDb } from "@/lib/agents/supabase-client";
import { logEvent } from "@/lib/agents/audit-log";

interface RouteContext { params: Promise<{ id: string }> | { id: string }; }

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const { id } = await Promise.resolve(ctx.params);
  const db = getAgentsDb();
  const { data, error } = await db
    .from("mcc_gl_mapping")
    .delete()
    .eq("id", id)
    .eq("organization_id", auth.organizationId)
    .select("id, mcc").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await logEvent({
    organizationId: auth.organizationId, actorType: "user",
    actorId: auth.userId ?? null,
    eventType: "mcc_mapping.removed",
    payload: { id, mcc: (data as { mcc: string }).mcc },
  });
  return NextResponse.json({ removed: true, id });
}
