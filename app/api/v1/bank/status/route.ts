// GET /api/v1/bank/status
//
// Tells the UI whether to show the Connect-bank flow ("available")
// or the Coming-soon banner. Cheap, cacheable on the client.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { isMXEnabled } from "@/lib/mx/mx-client";

export async function GET() {
  return NextResponse.json({
    available: isMXEnabled(),
    provider: "mx",
  });
}
