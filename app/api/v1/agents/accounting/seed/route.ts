// POST /api/v1/agents/accounting/seed
//
// Idempotent — seeds the 21 default ZeniPay GL accounts + catalog MCC
// mappings for the caller's org. Safe to call more than once; the
// underlying Postgres functions are idempotent (ON CONFLICT DO NOTHING).

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../../_lib/auth";
import { seedOrgAccounting } from "@/lib/agents/accounting/gl-seeder";
import { logEvent } from "@/lib/agents/audit-log";

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  try {
    const result = await seedOrgAccounting(auth.organizationId, auth.userId ?? null);
    await logEvent({
      organizationId: auth.organizationId,
      actorType: "user",
      actorId: auth.userId ?? null,
      eventType: "accounting.seed_run",
      payload: { ...result },
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "seed_failed" }, { status: 500 });
  }
}
