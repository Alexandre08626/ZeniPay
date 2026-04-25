// GET /api/v1/bank/status
//
// Tells the UI whether to show the Connect-bank flow ("available")
// or the Coming-soon banner. Cheap, cacheable on the client.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { isMXEnabled } from "@/lib/mx/mx-client";
import { isPlaidEnabled } from "@/lib/plaid/plaid-client";

export async function GET() {
  // Plaid wins when both are configured — its widget is more reliable
  // across browsers and our preferred path. MX stays as a fallback.
  if (isPlaidEnabled()) {
    return NextResponse.json({ available: true, provider: "plaid" });
  }
  if (isMXEnabled()) {
    return NextResponse.json({ available: true, provider: "mx" });
  }
  return NextResponse.json({ available: false, provider: null });
}
