// GET /api/v1/agents/approvals/[id] — detail + signatures collected + requesting agent

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../../_lib/auth";
import { getAgentsDb } from "@/lib/agents/supabase-client";

interface RouteContext { params: Promise<{ id: string }> | { id: string }; }

export async function GET(req: NextRequest, ctx: RouteContext) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const { id } = await Promise.resolve(ctx.params);

  const db = getAgentsDb();
  const { data: request } = await db
    .from("approval_requests")
    .select("*")
    .eq("id", id)
    .eq("organization_id", auth.organizationId)
    .maybeSingle();
  if (!request) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data: policy } = await db
    .from("approval_policies")
    .select("id, name, trigger_type, approver_type, approver_config, timeout_seconds")
    .eq("id", (request as { policy_id: string }).policy_id)
    .maybeSingle();

  const { data: signatures } = await db
    .from("approval_signatures")
    .select("id, approver_user_id, decision, signed_at, client_metadata")
    .eq("request_id", id)
    .order("signed_at", { ascending: true });

  const requestedByAgent = (request as { requested_by_agent_id: string | null }).requested_by_agent_id;
  let agent: { id: string; name: string } | null = null;
  if (requestedByAgent) {
    const { data: a } = await db.from("agents").select("id, name").eq("id", requestedByAgent).maybeSingle();
    agent = (a as typeof agent) ?? null;
  }

  return NextResponse.json({
    request,
    policy,
    agent,
    signatures: signatures ?? [],
  });
}
