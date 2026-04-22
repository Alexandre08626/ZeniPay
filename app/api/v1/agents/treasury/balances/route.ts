// GET /api/v1/agents/treasury/balances — per-currency sub-balances only.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../../_lib/auth";
import { getBalances } from "@/lib/agents/treasury/treasury";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const balances = await getBalances(auth.organizationId);
  return NextResponse.json({ balances });
}
