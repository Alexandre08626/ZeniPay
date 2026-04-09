export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { FINIX_CONFIG } from "@/lib/finix/config";

/**
 * GET /api/finix/tokenize
 * Returns the Finix Application ID and environment for client-side tokenization
 */
export async function GET() {
  return NextResponse.json({
    applicationId: FINIX_CONFIG.applicationId,
    environment: FINIX_CONFIG.environment,
  });
}
