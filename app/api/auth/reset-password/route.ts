export const dynamic = "force-dynamic";

// POST /api/auth/reset-password { token, password } — sets the new password.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { rateLimit } from "@/modules/zenipay/services/rate-limit";
import { completePasswordReset } from "@/lib/zenipay/password-reset";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await rateLimit(`pwreset-do:${ip}`, 10, 900_000))) {
    return NextResponse.json({ error: "Trop d'essais — réessayez plus tard." }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const r = await completePasswordReset(getSupabaseAdmin(), String(body.token || ""), String(body.password || ""));
  return r.ok ? NextResponse.json({ success: true }) : NextResponse.json({ error: r.error }, { status: 400 });
}
