// Server-bound merchant session — the authoritative source of
// `merchant_id` for every API route.
//
// Why this exists: the original auth model stored `merchant_id` in
// browser sessionStorage and trusted it back via query params. Any
// caller could pass `?merchant_id=<anyone-else>` and read the other
// tenant's data. This helper replaces that with an HMAC-signed,
// HTTP-only cookie posted on login. Routes call `requireZpSession`
// and ignore any merchant_id the request body/query carried.
//
// Token format (compact, no external dep):
//   base64url(payload).base64url(hmac_sha256(payload, secret))
//   payload = { mid, mode, iat, exp }
//
// `ZP_SESSION_SECRET` env is required. We refuse to sign/verify if
// it's missing — silent fallback would defeat the whole point.

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";

const COOKIE_NAME = "zp_session";
const TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface ZpSessionPayload {
  mid: string;        // merchant_id
  mode?: string;      // "live" | "sandbox" — informational only
  iat: number;        // issued-at (seconds)
  exp: number;        // expires-at (seconds)
}

export interface ZpSession {
  merchant_id: string;
  mode: string;
}

function getSecret(): string {
  const s = process.env.ZP_SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error("ZP_SESSION_SECRET missing or too short (need 32+ chars)");
  }
  return s;
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function sign(payload: ZpSessionPayload): string {
  const secret = getSecret();
  const body = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  const mac = crypto.createHmac("sha256", secret).update(body).digest();
  return `${body}.${b64url(mac)}`;
}

function verify(token: string): ZpSessionPayload | null {
  try {
    const secret = getSecret();
    const [body, mac] = token.split(".");
    if (!body || !mac) return null;
    const expected = b64url(crypto.createHmac("sha256", secret).update(body).digest());
    // Constant-time compare.
    const a = Buffer.from(expected);
    const b = Buffer.from(mac);
    if (a.length !== b.length) return null;
    if (!crypto.timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(fromB64url(body).toString("utf8")) as ZpSessionPayload;
    if (typeof payload.mid !== "string" || !payload.mid) return null;
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Sign a fresh session token for a given merchant. */
export function signZpSession(merchantId: string, mode: string = "live"): string {
  const now = Math.floor(Date.now() / 1000);
  return sign({ mid: merchantId, mode, iat: now, exp: now + TTL_SECONDS });
}

/** Set the session cookie on a NextResponse. */
export function setZpSessionCookie(res: NextResponse, merchantId: string, mode: string = "live"): void {
  const token = signZpSession(merchantId, mode);
  res.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

/** Clear the session cookie (logout). */
export function clearZpSessionCookie(res: NextResponse): void {
  res.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/** Read + verify the cookie. null if missing/invalid/expired. */
export function getZpSession(req: NextRequest): ZpSession | null {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const p = verify(token);
  if (!p) return null;
  return { merchant_id: p.mid, mode: p.mode || "live" };
}

/**
 * Returns the session, or a 401 Response if missing/invalid.
 *
 * Standard usage in a route handler:
 *
 *   const session = await requireZpSession(req);
 *   if (session instanceof NextResponse) return session;
 *   const merchantId = session.merchant_id;
 */
export function requireZpSession(req: NextRequest): ZpSession | NextResponse {
  const s = getZpSession(req);
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return s;
}

/**
 * Cross-tenant guard. If the request carried a merchant_id (query/body)
 * that does NOT match the session, returns 403. Otherwise returns the
 * session merchant_id. This is the single function every read/write
 * route should call instead of trusting the param.
 */
export function resolveMerchantId(
  session: ZpSession,
  claimedFromRequest: string | null | undefined,
): string | NextResponse {
  if (claimedFromRequest && claimedFromRequest.trim() && claimedFromRequest.trim() !== session.merchant_id) {
    return NextResponse.json({ error: "forbidden_cross_tenant" }, { status: 403 });
  }
  return session.merchant_id;
}
