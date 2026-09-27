export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/orvel/chat  { messages: [{ role: "user"|"assistant", content }] }
// Only plain user/assistant text is accepted from the browser — tool calls
// and tool results are produced server-side and can't be forged.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { requireZpSession } from "@/lib/auth/zp-session";
import { runOrvel, orvelConfig, type ChatTurn } from "@/lib/orvel/agent";
import { rateLimit } from "@/modules/zenipay/services/rate-limit";

export async function POST(req: NextRequest) {
  const session = await requireZpSession(req);
  if (session instanceof NextResponse) return session;
  if (!(await rateLimit(`orvel:${session.merchant_id}`, 30, 600_000))) {
    return NextResponse.json({ error: "Trop de demandes — réessayez dans quelques minutes." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const history: ChatTurn[] = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string")
    .slice(-12)
    .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 4000) }));
  if (!history.length || history[history.length - 1].role !== "user") {
    return NextResponse.json({ error: "Message requis." }, { status: 400 });
  }

  try {
    const out = await runOrvel(getSupabaseAdmin(), session.merchant_id, history);
    return NextResponse.json(out);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[orvel] chat failed:", msg, { url: orvelConfig().url, hasKey: !!orvelConfig().key });
    const offline = /abort|fetch failed|ECONN|ENOTFOUND|ORVEL_HTTP_5|ORVEL_HTTP_4/i.test(msg);
    return NextResponse.json({
      error: offline
        ? "Orvel ne répond pas en ce moment (le serveur IA orvel-ai est peut-être éteint ou inaccessible)."
        : "Orvel a rencontré une erreur.",
    }, { status: 503 });
  }
}
