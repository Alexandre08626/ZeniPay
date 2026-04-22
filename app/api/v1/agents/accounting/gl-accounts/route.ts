// GET  /api/v1/agents/accounting/gl-accounts
// POST /api/v1/agents/accounting/gl-accounts   { code, name, parent_id? }

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "../../_lib/auth";
import { errorResponse, serverError } from "@/app/api/v1/agents/accounting/_lib/errors";
import { getAgentsDb } from "@/lib/agents/supabase-client";
import { logEvent } from "@/lib/agents/audit-log";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (!auth) return errorResponse("unauthorized", "unauthorized");
    const db = getAgentsDb();
    const { data, error } = await db
      .from("gl_accounts")
      .select("*")
      .eq("organization_id", auth.organizationId)
      .order("code", { ascending: true });
    if (error) return errorResponse("server_error", error.message);
    return NextResponse.json({ accounts: data ?? [] });
  } catch (e) { return serverError(e); }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (!auth) return errorResponse("unauthorized", "unauthorized");
    const body = await req.json().catch(() => ({}));
    const code = String(body?.code ?? "").trim();
    const name = String(body?.name ?? "").trim();
    const parentId = body?.parent_id ? String(body.parent_id) : null;
    if (!code || !name) return errorResponse("bad_request", "code + name required");
    if (!/^[0-9A-Z_.-]+$/i.test(code)) return errorResponse("bad_request", "code must be alphanumeric");

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
    if (error || !data) return errorResponse("server_error", error?.message ?? "insert_failed");

    await logEvent({
      organizationId: auth.organizationId,
      actorType: auth.via === "api_key" ? "api_key" : "user",
      actorId: auth.apiKeyId ?? auth.userId ?? null,
      eventType: "gl_account.created",
      payload: { account_id: data.id, code, name },
    });
    return NextResponse.json({ account: data });
  } catch (e) { return serverError(e); }
}
