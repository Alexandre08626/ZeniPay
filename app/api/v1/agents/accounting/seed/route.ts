// POST /api/v1/agents/accounting/seed
//
// Idempotent — seeds the 21 default ZeniPay GL accounts + catalog MCC
// mappings for the caller's org. Safe to call more than once; the
// underlying Postgres functions are idempotent (ON CONFLICT DO NOTHING).

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "../../_lib/auth";
import { errorResponse, serverError } from "@/app/api/v1/agents/accounting/_lib/errors";
import { seedOrgAccounting } from "@/lib/agents/accounting/gl-seeder";
import { logEvent } from "@/lib/agents/audit-log";

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (!auth) return errorResponse("unauthorized", "unauthorized");
    const result = await seedOrgAccounting(auth.organizationId, auth.userId ?? null);
    await logEvent({
      organizationId: auth.organizationId,
      actorType: "user",
      actorId: auth.userId ?? null,
      eventType: "accounting.seed_run",
      payload: { ...result },
    });
    return NextResponse.json(result);
  } catch (e) { return serverError(e); }
}
