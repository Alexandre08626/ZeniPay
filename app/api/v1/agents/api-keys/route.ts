// GET  /api/v1/agents/api-keys   list non-revoked keys (no raw)
// POST /api/v1/agents/api-keys   mint a new key (raw returned ONCE)

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../_lib/auth";
import { getAgentsDb } from "@/lib/agents/supabase-client";
import { createApiKey, type CreateApiKeyInput } from "@/lib/agents/api-keys";
import { logEvent } from "@/lib/agents/audit-log";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const db = getAgentsDb();
  const { data, error } = await db
    .from("agent_api_keys")
    .select("id, name, key_prefix, environment, scopes, last_used_at, revoked_at, created_at")
    .eq("organization_id", auth.organizationId)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ keys: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const body = await req.json().catch(() => ({}));

  const environment: CreateApiKeyInput["environment"] =
    body?.environment === "live" ? "live" : "test";
  const name: string = (body?.name && String(body.name).trim()) || "default";

  const { rawKey, row } = await createApiKey({
    organizationId: auth.organizationId,
    environment,
    name,
  });

  await logEvent({
    organizationId: auth.organizationId,
    actorType: "user",
    eventType: "api_key.created",
    payload: { key_id: row.id, environment, name },
  });

  return NextResponse.json({
    key: { ...row, key_hash: undefined },
    raw_key: rawKey,
    warning: "raw_key is only returned once — store it now",
  });
}
