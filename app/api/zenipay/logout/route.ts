// POST /api/zenipay/logout
//
// Clears the zp_session cookie. Always returns 200 — logout should
// never fail because of a missing cookie.

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { clearZpSessionCookie } from "@/lib/auth/zp-session";

export async function POST() {
  const res = NextResponse.json({ success: true });
  clearZpSessionCookie(res);
  return res;
}
