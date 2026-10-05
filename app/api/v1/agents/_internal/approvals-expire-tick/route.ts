// POST /api/v1/agents/_internal/approvals-expire-tick
//
// Cron-triggered (Vercel cron or external scheduler). Flips any
// approval_requests where expires_at < now() AND status='pending' to
// 'expired'. Returns the count for observability.
//
// Auth: requires Authorization: Bearer <CRON_SECRET> (fails closed with 401
// when no secret is configured). Matches existing Vercel cron pattern.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { expireStale } from "@/lib/agents/approvals/request-manager";

export async function POST(req: NextRequest) {
  const cronSecret = process.env.AGENTS_APPROVAL_CRON_SECRET || process.env.CRON_SECRET;
  // Fail closed: no secret configured (any env) or wrong header → 401.
  if (!cronSecret || (req.headers.get("authorization") ?? "") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const count = await expireStale();
  return NextResponse.json({ expired: count });
}

// Allow GET for Vercel cron's default invocation method.
export async function GET(req: NextRequest) {
  return POST(req);
}
