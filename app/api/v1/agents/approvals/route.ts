// GET /api/v1/agents/approvals?status=pending|resolved — list for caller's org
//   Default: pending + recently resolved (last 24h). Filters: status, limit.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../_lib/auth";
import { getAgentsDb } from "@/lib/agents/supabase-client";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") ?? 50)));

  const db = getAgentsDb();
  let q = db
    .from("approval_requests")
    .select("*")
    .eq("organization_id", auth.organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (status) q = q.eq("status", status);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Add derived: pending_count for the caller (drives the sidebar badge).
  const { count } = await db
    .from("approval_requests")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", auth.organizationId)
    .eq("status", "pending");

  return NextResponse.json({ approvals: data ?? [], pending_count: count ?? 0 });
}
