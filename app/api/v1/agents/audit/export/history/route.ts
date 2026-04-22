// GET /api/v1/agents/audit/export/history
// Lists audit_export_runs for the caller's org, newest first.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "../../../_lib/auth";
import { errorResponse, serverError } from "../../../_lib/errors";
import { getAgentsDb } from "@/lib/agents/supabase-client";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (!auth) return errorResponse("unauthorized", "unauthorized");

    const db = getAgentsDb();
    const { data, error } = await db
      .from("audit_export_runs")
      .select("id, scope, scope_ref, window_start, window_end, row_count, bytes_written, merkle_root_hex, key_id, include_merkle_proofs, requested_by, created_at")
      .eq("organization_id", auth.organizationId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return errorResponse("server_error", error.message);
    return NextResponse.json({ exports: data ?? [] });
  } catch (e) { return serverError(e); }
}
