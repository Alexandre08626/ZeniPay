// POST /api/v1/agents/treasury/fund-sources/[id]/verify
//
// Card rail: the instrument was already validated by Finix.js during
// tokenization, so verification is an immediate state flip. The wrapper
// asserts the caller's org owns the source and returns the previous
// status for audit (so replays are observable but non-destructive).

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "../../../../_lib/auth";
import { errorResponse, serverError } from "../../../../_lib/errors";
import { createClient } from "@supabase/supabase-js";
import { FundingClient, FundingError } from "@/lib/zenicore/funding-client";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await authenticate(req);
    if (!auth) return errorResponse("unauthorized", "unauthorized");

    const fundingSourceId = params.id;
    if (!fundingSourceId || !fundingSourceId.startsWith("fs_")) {
      return errorResponse("bad_request", "invalid_funding_source_id");
    }

    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return errorResponse("server_error", "supabase_env_missing");
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

    const fc = new FundingClient(supabase);

    // Org-scope check: wrapper enforces it server-side, but we pre-check so
    // the 403 comes back as a clean forbidden rather than an RPC error.
    const sources = await fc.listFundingSources(auth.organizationId);
    const hit = sources.find((s) => s.id === fundingSourceId);
    if (!hit) return errorResponse("forbidden", "funding_source_not_owned_by_org");

    const actor = auth.userId ?? auth.apiKeyId ?? "system";
    try {
      const previous = await fc.verifyFundingSource(fundingSourceId, actor);
      return NextResponse.json({ funding_source_id: fundingSourceId, status: "verified", previous_status: previous });
    } catch (err) {
      if (err instanceof FundingError) {
        return errorResponse("unprocessable", err.message);
      }
      throw err;
    }
  } catch (e) {
    return serverError(e);
  }
}
