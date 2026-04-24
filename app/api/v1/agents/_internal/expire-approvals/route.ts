// GET|POST /api/v1/agents/_internal/expire-approvals
//
// Cron sweeper for PR 12 merchant-rule approvals. Flips any pending
// zenipay_approval_requests whose expires_at has passed to status
// 'expired'. Run hourly via vercel.json schedule.
//
// Auth: requires the CRON_SECRET bearer token — Vercel's cron runner
// sets this via x-vercel-cron + the shared secret.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (bearer && bearer === secret) return true;
  // Vercel cron also includes its signature header; accept when the shared
  // secret arrives via the x-cron-secret convention.
  const header = req.headers.get("x-cron-secret");
  return !!header && header === secret;
}

async function handle(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  const nowIso = new Date().toISOString();
  const { data, error } = await db
    .from("zenipay_approval_requests")
    .update({ status: "expired", decided_at: nowIso, decided_by: "system:cron" })
    .eq("status", "pending")
    .lt("expires_at", nowIso)
    .select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ expired: data?.length ?? 0, ids: (data ?? []).map((r) => r.id) });
}

export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
