export const dynamic = "force-dynamic";

// POST /api/auth/forgot-password { email } — emails a reset link. Same
// answer whether or not the account exists (no email enumeration).

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";
import { rateLimit } from "@/modules/zenipay/services/rate-limit";
import { requestPasswordReset } from "@/lib/zenipay/password-reset";

const DONE = { success: true, message: "Si un compte existe pour ce courriel, un lien de réinitialisation vient d'y être envoyé." };

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Courriel invalide." }, { status: 400 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await rateLimit(`pwreset-ip:${ip}`, 5, 900_000)) || !(await rateLimit(`pwreset-email:${email}`, 3, 3_600_000))) {
    return NextResponse.json(DONE);
  }
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL || "https://zenipay.ca";
    await requestPasswordReset(getSupabaseAdmin(), email, base);
  } catch (e) {
    console.error("[forgot-password]", e instanceof Error ? e.message : String(e));
  }
  return NextResponse.json(DONE);
}
