// GET /api/v1/agents/approvers/status — is the caller enrolled + recently verified?

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, requireUser } from "../../_lib/auth";
import { getAgentsDb } from "@/lib/agents/supabase-client";

export async function GET(req: NextRequest) {
  const base = await authenticate(req);
  const auth = requireUser(base);
  if (auth instanceof Response) return auth;
  const db = getAgentsDb();
  const { data } = await db
    .from("user_approval_secrets")
    .select("user_id, rotated_at, created_at")
    .eq("user_id", auth.userId)
    .maybeSingle();
  return NextResponse.json({
    enrolled: !!data,
    rotated_at: data?.rotated_at ?? null,
    created_at: data?.created_at ?? null,
  });
}
