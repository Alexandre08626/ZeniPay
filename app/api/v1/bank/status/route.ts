// GET /api/v1/bank/status
//
// Tells the UI whether to show the Connect-bank flow ("available")
// or the Coming-soon banner. Cheap, cacheable on the client.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { isPlaidEnabled } from "@/lib/plaid/plaid-client";

export async function GET() {
  // Plaid is the only supported widget provider — MX retired.
  const enabled = isPlaidEnabled();
  return NextResponse.json({
    available: enabled,
    provider: enabled ? "plaid" : null,
  });
}
