export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { FINIX_CONFIG } from "@/lib/finix/config";

/**
 * GET /api/finix/tokenize
 * Returns the Finix Application ID, environment, and merchant ID for
 * client-side tokenization and fraud-detection (Finix.Auth) initialization.
 */
export async function GET() {
  return NextResponse.json({
    applicationId: FINIX_CONFIG.applicationId,
    environment: FINIX_CONFIG.environment,
    merchantId: FINIX_CONFIG.merchantId,
  });
}
