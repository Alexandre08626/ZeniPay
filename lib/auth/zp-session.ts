// Server-bound merchant session — the authoritative source of
// `merchant_id` for every API route.
//
// Supports two cookie formats during the migration to Supabase Auth:
//
//   1. Supabase Auth (preferred, banking-grade). The frontend obtains
//      a session via `supabase.auth.signInWithPassword` (or admin
//      createUser → signInWithPassword on the server) and stores the
//      access token in the `sb-access-token` cookie. We validate the
//      JWT with Supabase, then resolve the merchant via
//      `zenipay_merchants.auth_user_id`.
//
//   2. HMAC fallback (`zp_session`). Compact base64url(payload).b64url(hmac)
//      token, signed with `ZP_SESSION_SECRET`. This is what the legacy
//      `/api/zenipay/login` route posts. We keep reading it during the
//      transition so users with an active session don't get bumped twice
//      (once at hotfix deploy, again at banking-grade deploy).
//
// New flows should always go through Supabase Auth. The HMAC code path
// is documented as "transitional" and can be removed once every login
// surface posts the Supabase cookie.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

const COOKIE_HMAC = "zp_session";
const COOKIE_SUPABASE = "sb-access-token";
const COOKIE_REFRESH = "sb-refresh-token";
const TTL_SECONDS = 7 * 24 * 60 * 60; // HMAC TTL

export interface ZpSession {
  merchant_id: string;
  mode: string;       // "test" | "live"
  auth_user_id?: string;
}

// ─── Supabase Auth path ────────────────────────────────────────────────

let _verifierClient: ReturnType<typeof createClient> | null = null;
function verifierClient() {
  if (_verifierClient) return _verifierClient;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _verifierClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _verifierClient;
}

async function tryReadSupabaseAuth(req: NextRequest): Promise<ZpSession | null> {
  const token =
    req.cookies.get(COOKIE_SUPABASE)?.value ??
    parseBearer(req.headers.get("authorization"));
  if (!token) return null;
  const client = verifierClient();
  if (!client) return null;
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) return null;
  // Resolve merchant by auth_user_id.
  const { data: merchant } = await getSupabaseAdmin()
    .from("zenipay_merchants")
    .select("id, status")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();
  if (!merchant) return null;
  return {
    merchant_id: merchant.id as string,
    mode: merchant.status === "active" ? "live" : "test",
    auth_user_id: data.user.id,
  };
}

function parseBearer(header: string | null): string | null {
  if (!header) return null;
  const m = header.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

// ─── HMAC fallback path (legacy / transitional) ────────────────────────

function getHmacSecret(): string | null {
  const s = process.env.ZP_SESSION_SECRET;
  if (!s || s.length < 32) return null;
  return s;
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

interface HmacPayload {
  mid: string;
  mode?: string;
  iat: number;
  exp: number;
}

function signHmac(payload: HmacPayload, secret: string): string {
  const body = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  const mac = crypto.createHmac("sha256", secret).update(body).digest();
  return `${body}.${b64url(mac)}`;
}

function verifyHmac(token: string, secret: string): HmacPayload | null {
  try {
    const [body, mac] = token.split(".");
    if (!body || !mac) return null;
    const expected = b64url(crypto.createHmac("sha256", secret).update(body).digest());
    const a = Buffer.from(expected);
    const b = Buffer.from(mac);
    if (a.length !== b.length) return null;
    if (!crypto.timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(fromB64url(body).toString("utf8")) as HmacPayload;
    if (typeof payload.mid !== "string" || !payload.mid) return null;
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function tryReadHmac(req: NextRequest): ZpSession | null {
  const token = req.cookies.get(COOKIE_HMAC)?.value;
  if (!token) return null;
  const secret = getHmacSecret();
  if (!secret) return null;
  const p = verifyHmac(token, secret);
  if (!p) return null;
  return { merchant_id: p.mid, mode: p.mode || "test" };
}

// ─── Public API ────────────────────────────────────────────────────────

/**
 * Read the session from the request. Tries Supabase Auth first, then
 * HMAC fallback. Returns null if neither is present/valid.
 */
export async function getZpSession(req: NextRequest): Promise<ZpSession | null> {
  const sb = await tryReadSupabaseAuth(req);
  if (sb) return sb;
  const hmac = tryReadHmac(req);
  return hmac;
}

/**
 * Returns the session, or a 401 Response.
 */
export async function requireZpSession(req: NextRequest): Promise<ZpSession | NextResponse> {
  const s = await getZpSession(req);
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return s;
}

/**
 * Cross-tenant guard. If the request supplied a merchant_id that does
 * NOT match the session, returns 403. Otherwise returns the session
 * merchant_id. Always call this in routes that previously read
 * merchant_id from query/body.
 */
export function resolveMerchantId(
  session: ZpSession,
  claimedFromRequest: string | null | undefined,
): string | NextResponse {
  if (
    claimedFromRequest &&
    claimedFromRequest.trim() &&
    claimedFromRequest.trim() !== session.merchant_id
  ) {
    return NextResponse.json({ error: "forbidden_cross_tenant" }, { status: 403 });
  }
  return session.merchant_id;
}

// ─── Cookie writers ────────────────────────────────────────────────────
//
// Used by /api/zenipay/login and /api/auth/register. The Supabase pair
// is the new canonical session; the HMAC pair is kept around for
// legacy clients during the transition.

export function setSupabaseSessionCookies(
  res: NextResponse,
  accessToken: string,
  refreshToken: string,
  expiresInSeconds: number,
): void {
  const isProd = process.env.NODE_ENV === "production";
  res.cookies.set({
    name: COOKIE_SUPABASE,
    value: accessToken,
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: expiresInSeconds,
  });
  res.cookies.set({
    name: COOKIE_REFRESH,
    value: refreshToken,
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    // Refresh token outlives access by design (Supabase default ~30d).
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearAllSessionCookies(res: NextResponse): void {
  for (const name of [COOKIE_HMAC, COOKIE_SUPABASE, COOKIE_REFRESH]) {
    res.cookies.set({
      name,
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }
}

/**
 * Sign + set the legacy HMAC session cookie. Kept for /api/zenipay/login
 * which still uses password-in-merchant_data (not yet migrated to
 * Supabase Auth credentials). New flows should call
 * `setSupabaseSessionCookies` after `signInWithPassword`.
 */
export function setZpSessionCookie(res: NextResponse, merchantId: string, mode: string = "test"): void {
  const secret = getHmacSecret();
  if (!secret) {
    // Refuse silently — a missing secret in prod must be loud at deploy
    // time, not at request time. The server admin will see warnings in
    // /api/zenipay/login error logs.
    return;
  }
  const now = Math.floor(Date.now() / 1000);
  const token = signHmac({ mid: merchantId, mode, iat: now, exp: now + TTL_SECONDS }, secret);
  res.cookies.set({
    name: COOKIE_HMAC,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export function clearZpSessionCookie(res: NextResponse): void {
  clearAllSessionCookies(res);
}

/** Convenience for tests / one-off scripts. Signs an HMAC token only. */
export function signZpSession(merchantId: string, mode: string = "test"): string {
  const secret = getHmacSecret();
  if (!secret) throw new Error("ZP_SESSION_SECRET missing");
  const now = Math.floor(Date.now() / 1000);
  return signHmac({ mid: merchantId, mode, iat: now, exp: now + TTL_SECONDS }, secret);
}
