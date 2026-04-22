// GET  /api/v1/agents/approval-policies  — list org policies (ordered by priority)
// POST /api/v1/agents/approval-policies  — create new policy

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../_lib/auth";
import { getAgentsDb } from "@/lib/agents/supabase-client";
import { logEvent } from "@/lib/agents/audit-log";

const VALID_TRIGGERS = ["amount_threshold", "merchant_category", "new_merchant", "off_hours", "anomaly_score"] as const;
const VALID_APPROVERS = ["specific_user", "any_admin", "owner_only", "multi_sig"] as const;

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const db = getAgentsDb();
  const { data, error } = await db
    .from("approval_policies")
    .select("*")
    .eq("organization_id", auth.organizationId)
    .order("priority", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ policies: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const body = await req.json().catch(() => ({}));

  const name = String(body?.name ?? "").trim();
  const triggerType = String(body?.trigger_type ?? "");
  const triggerConfig = (body?.trigger_config ?? {}) as Record<string, unknown>;
  const approverType = String(body?.approver_type ?? "");
  const approverConfig = (body?.approver_config ?? {}) as Record<string, unknown>;
  const timeoutSeconds = Number(body?.timeout_seconds ?? 900);
  const priority = Number(body?.priority ?? 100);
  const active = body?.active !== false;
  const defaultAction = body?.default_action === "approve" ? "approve" : "deny";

  if (name.length < 2) return NextResponse.json({ error: "name required (min 2 chars)" }, { status: 400 });
  if (!VALID_TRIGGERS.includes(triggerType as typeof VALID_TRIGGERS[number])) {
    return NextResponse.json({ error: `trigger_type must be one of ${VALID_TRIGGERS.join(", ")}` }, { status: 400 });
  }
  if (!VALID_APPROVERS.includes(approverType as typeof VALID_APPROVERS[number])) {
    return NextResponse.json({ error: `approver_type must be one of ${VALID_APPROVERS.join(", ")}` }, { status: 400 });
  }
  if (!Number.isFinite(timeoutSeconds) || timeoutSeconds < 60) {
    return NextResponse.json({ error: "timeout_seconds must be >= 60" }, { status: 400 });
  }

  const db = getAgentsDb();
  const { data, error } = await db
    .from("approval_policies")
    .insert({
      organization_id: auth.organizationId,
      name, trigger_type: triggerType, trigger_config: triggerConfig,
      approver_type: approverType, approver_config: approverConfig,
      timeout_seconds: timeoutSeconds, default_action: defaultAction,
      active, priority,
    })
    .select()
    .single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "insert failed" }, { status: 500 });

  await logEvent({
    organizationId: auth.organizationId,
    actorType: auth.via === "api_key" ? "api_key" : "user",
    actorId: auth.apiKeyId ?? auth.userId ?? null,
    eventType: "approval_policy.created",
    payload: { policy_id: data.id, trigger_type: triggerType, approver_type: approverType },
  });
  return NextResponse.json({ policy: data });
}
