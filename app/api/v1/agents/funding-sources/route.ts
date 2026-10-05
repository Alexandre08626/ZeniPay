// GET  /api/v1/agents/funding-sources   — list non-deleted sources
// POST /api/v1/agents/funding-sources   — 410 (disabled 2026-10-05)
//
// PR 1 supports finix_card + zenipay_merchant_wallet + USDC (returns
// deposit address) + wire (returns a unique reference number).

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../_lib/auth";
import { getAgentsDb } from "@/lib/agents/supabase-client";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const db = getAgentsDb();
  const { data, error } = await db
    .from("funding_sources")
    .select("*")
    .eq("organization_id", auth.organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ funding_sources: data ?? [] });
}

// POST disabled 2026-10-05 (security audit): money-related write of the
// retired Agents product (Orvel replaces it). GET stays for read-only use.
// Previous implementation: git show 5a247ae:app/api/v1/agents/funding-sources/route.ts

function gone() {
  return NextResponse.json({ error: "gone" }, { status: 410 });
}

export const POST = gone;
