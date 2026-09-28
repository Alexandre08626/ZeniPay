export const dynamic = "force-dynamic";

// GET /api/orvel/actions — Orvel's action journal for the session merchant.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { requireZpSession } from "@/lib/auth/zp-session";
import { listActions } from "@/lib/orvel/journal";

export async function GET(req: NextRequest) {
  const session = await requireZpSession(req);
  if (session instanceof NextResponse) return session;
  const rows = await listActions(getSupabaseAdmin(), session.merchant_id, 100);
  return NextResponse.json({
    actions: rows.map((a) => ({
      id: a.id, tool: a.tool, status: a.status, created_at: a.created_at, undone_at: a.undone_at,
      prompt: a.prompt,
      summary: String((a.result as any)?.summary || (a.result as any)?.error || (a.status === "denied" ? "Refusé (permission désactivée)" : a.tool)),
      undoable: a.status === "done" && !!a.undo && !a.undone_at,
    })),
  });
}
