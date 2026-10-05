// GET  /api/v1/agents/treasury/fund-sources
//    → funding sources registered for the caller's org (any rail).
//
// POST /api/v1/agents/treasury/fund-sources — 410 (disabled 2026-10-05)
//    Body: { label, currency, finix_tokenization_result: {
//      payment_instrument_id, identity_id, last4, brand? } }
//
//    Registers a new card-rail funding source using the output of the
//    client-side Finix.js tokenization. The card has already been validated
//    by Finix at tokenize-time, so the backend just stores the reference.
//    Returns { funding_source_id, status: 'pending_verification' } — call
//    POST .../[id]/verify to flip it to 'verified' before charging.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "../../_lib/auth";
import { errorResponse, serverError } from "../../_lib/errors";
import { createClient } from "@supabase/supabase-js";
import { FundingClient } from "@/lib/zenicore/funding-client";

function service() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (!auth) return errorResponse("unauthorized", "unauthorized");

    const supabase = service();
    if (!supabase) return errorResponse("server_error", "supabase_env_missing");

    const fc = new FundingClient(supabase);
    const sources = await fc.listFundingSources(auth.organizationId);
    return NextResponse.json({ funding_sources: sources });
  } catch (e) {
    return serverError(e);
  }
}

// POST disabled 2026-10-05 (security audit): money-related write of the
// retired Agents product (Orvel replaces it). GET stays for read-only use.
// Previous implementation: git show 5a247ae:app/api/v1/agents/treasury/fund-sources/route.ts

function gone() {
  return NextResponse.json({ error: "gone" }, { status: 410 });
}

export const POST = gone;
