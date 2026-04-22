// GET  /api/v1/agents/accounting/gl-accounts
// POST /api/v1/agents/accounting/gl-accounts   { code, name, parent_id? }

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../../_lib/auth";
import { getAgentsDb } from "@/lib/agents/supabase-client";
import { logEvent } from "@/lib/agents/audit-log";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const db = getAgentsDb();
  const { data, error } = await db
    .from("gl_accounts")
    .select("*")
    .eq("organization_id", auth.organizationId)
    .order("code", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ accounts: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const body = await req.json().catch(() => ({}));
  const code = String(body?.code ?? "").trim();
  const name = String(body?.name ?? "").trim();
  const parentId = body?.parent_id ? String(body.parent_id) : null;
  if (!code || !name) return NextResponse.json({ error: "code + name required" }, { status: 400 });
  if (!/^[0-9A-Z_.-]+$/i.test(code)) return NextResponse.json({ error: "code must be alphanumeric" }, { status: 400 });

  const db = getAgentsDb();
  const { data, error } = await db
    .from("gl_accounts")
    .insert({
      organization_id: auth.organizationId,
      code, name, parent_id: parentId,
      created_by: auth.userId ?? null,
    })
    .select()
    .single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "insert failed" }, { status: 500 });

  await logEvent({
    organizationId: auth.organizationId,
    actorType: auth.via === "api_key" ? "api_key" : "user",
    actorId: auth.apiKeyId ?? auth.userId ?? null,
    eventType: "gl_account.created",
    payload: { account_id: data.id, code, name },
  });
  return NextResponse.json({ account: data });
}
