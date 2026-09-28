export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/orvel/actions/confirm  { token }
// Runs an action Orvel prepared, after the merchant clicked « Confirmer ».
// The token is signed and expiring (lib/orvel/confirm.ts); permissions are
// re-checked now, and each token runs at most once.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { requireZpSession } from "@/lib/auth/zp-session";
import { toolByName, type ToolOutcome } from "@/lib/orvel/tools";
import { getOrvelSettings, PERMISSIONS } from "@/lib/orvel/permissions";
import { verifyPending, claimPending } from "@/lib/orvel/confirm";
import { recordAction } from "@/lib/orvel/journal";

export async function POST(req: NextRequest) {
  const session = await requireZpSession(req);
  if (session instanceof NextResponse) return session;
  const body = await req.json().catch(() => ({}));
  const token = String(body.token || "");

  const v = verifyPending(token, session.merchant_id);
  if ("error" in v) return NextResponse.json({ error: v.error }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const tool = toolByName(v.tool);
  const settings = await getOrvelSettings(supabase, session.merchant_id);
  if (!tool) return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  if (!settings.enabled || !settings.permissions[tool.permission]) {
    const label = PERMISSIONS.find((p) => p.key === tool.permission)?.label || tool.permission;
    return NextResponse.json({ error: `Permission « ${label} » désactivée.` }, { status: 403 });
  }
  if (!(await claimPending(supabase, session.merchant_id, token))) {
    return NextResponse.json({ error: "Cette action a déjà été confirmée." }, { status: 409 });
  }

  let outcome: ToolOutcome;
  try { outcome = await tool.run({ supabase, merchantId: session.merchant_id }, v.args); }
  catch (e) { outcome = { ok: false, error: e instanceof Error ? e.message : String(e) }; }

  const id = await recordAction(supabase, {
    merchant_id: session.merchant_id, tool: tool.name, args: v.args,
    status: outcome.ok ? "done" : "failed",
    result: outcome.ok ? { summary: outcome.summary, data: outcome.data } : { error: outcome.error },
    undo: outcome.undo || null, prompt: "Confirmé par le marchand",
  });
  const action = {
    id, tool: tool.name, status: outcome.ok ? "done" : "failed",
    summary: outcome.ok ? (outcome.summary || tool.name) : `${tool.name} : ${outcome.error}`,
    undoable: !!(outcome.ok && outcome.undo && id),
  };
  return NextResponse.json({ action }, { status: outcome.ok ? 200 : 422 });
}
