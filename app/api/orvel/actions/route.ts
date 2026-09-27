export const dynamic = "force-dynamic";

// GET /api/orvel/actions — Orvel's action journal for the session merchant.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { requireZpSession } from "@/lib/auth/zp-session";

export async function GET(req: NextRequest) {
  const session = await requireZpSession(req);
  if (session instanceof NextResponse) return session;
  const { data, error } = await getSupabaseAdmin()
    .from("zenipay_orvel_actions")
    .select("id, tool, status, result, undo, prompt, created_at, undone_at")
    .eq("merchant_id", session.merchant_id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ actions: [], migration_required: error.code === "42P01" });
  return NextResponse.json({
    actions: (data || []).map((a: any) => ({
      id: a.id, tool: a.tool, status: a.status, created_at: a.created_at, undone_at: a.undone_at,
      prompt: a.prompt,
      summary: a.result?.summary || a.result?.error || (a.status === "denied" ? "Refusé (permission désactivée)" : a.tool),
      undoable: a.status === "done" && !!a.undo && !a.undone_at,
    })),
  });
}
