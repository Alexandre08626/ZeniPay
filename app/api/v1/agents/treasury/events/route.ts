// GET /api/v1/agents/treasury/events?limit=50
//
// Org-scoped funding event history. Powers /agents/treasury/history and
// the pending-polling loop on /agents/treasury/fund.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "../../_lib/auth";
import { errorResponse, serverError } from "../../_lib/errors";
import { createClient } from "@supabase/supabase-js";
import { FundingClient } from "@/lib/zenicore/funding-client";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (!auth) return errorResponse("unauthorized", "unauthorized");

    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return errorResponse("server_error", "supabase_env_missing");
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

    const limitRaw = req.nextUrl.searchParams.get("limit");
    const limit = limitRaw ? Math.min(500, Math.max(1, Number(limitRaw))) : 50;

    const fc = new FundingClient(supabase);
    const events = await fc.listFundingEvents(auth.organizationId, limit);

    return NextResponse.json({ funding_events: events, limit });
  } catch (e) {
    return serverError(e);
  }
}
