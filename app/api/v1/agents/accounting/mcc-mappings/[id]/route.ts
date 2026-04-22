// DELETE /mcc-mappings/[id] — remove an override; the catalog default
//                              re-applies on next auto-categorize run.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "../../../_lib/auth";
import { errorResponse, serverError } from "@/app/api/v1/agents/accounting/_lib/errors";
import { getAgentsDb } from "@/lib/agents/supabase-client";
import { logEvent } from "@/lib/agents/audit-log";

interface RouteContext { params: Promise<{ id: string }> | { id: string }; }

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await authenticate(req);
    if (!auth) return errorResponse("unauthorized", "unauthorized");
    const { id } = await Promise.resolve(ctx.params);
    const db = getAgentsDb();
    const { data, error } = await db
      .from("mcc_gl_mapping")
      .delete()
      .eq("id", id)
      .eq("organization_id", auth.organizationId)
      .select("id, mcc").maybeSingle();
    if (error) return errorResponse("server_error", error.message);
    if (!data) return errorResponse("not_found", "mcc_mapping_not_found");

    await logEvent({
      organizationId: auth.organizationId, actorType: "user",
      actorId: auth.userId ?? null,
      eventType: "mcc_mapping.removed",
      payload: { id, mcc: (data as { mcc: string }).mcc },
    });
    return NextResponse.json({ removed: true, id });
  } catch (e) { return serverError(e); }
}
