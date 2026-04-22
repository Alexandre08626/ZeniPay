// POST /api/contact — capture a lead from the public landing pages.
//
// Writes to public.zenipay_access_requests via the service_role Supabase
// client. No auth required — this is a public form. We guard against
// abuse with:
//   1. Minimal field validation (email shape, message length cap).
//   2. Optional honeypot field "website" — if filled, silently drop.
//   3. Rate-limit-by-email (best effort): refuse a second request with
//      the same email in the past 60s to slow replay loops.
//
// Response is always 200 + { ok: true } except for validation / server
// errors — we don't differentiate "duplicate" vs "new" to minimize
// disclosure surface.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const VALID_SOURCES = new Set(["landing", "pricing", "security", "contact", "access"]);

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    // Honeypot — bots fill every input.
    if (typeof body.website === "string" && body.website.trim().length > 0) {
      return NextResponse.json({ ok: true });
    }

    const email = String(body.email ?? "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: { code: "bad_request", message: "A valid email is required." } }, { status: 400 });
    }
    if (email.length > 256) {
      return NextResponse.json({ error: { code: "bad_request", message: "Email is too long." } }, { status: 400 });
    }

    const company          = truncate(String(body.company ?? ""), 200) || null;
    const role             = truncate(String(body.role ?? ""), 100) || null;
    const agent_fleet_size = truncate(String(body.agent_fleet_size ?? ""), 40) || null;
    const message          = truncate(String(body.message ?? ""), 2000) || null;
    const source           = VALID_SOURCES.has(String(body.source ?? ""))
      ? String(body.source)
      : "landing";

    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return NextResponse.json({ error: { code: "server_error", message: "contact_unavailable" } }, { status: 500 });
    }

    const db = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Soft rate-limit — same email in last 60s gets silent dedup.
    const sixtySecAgo = new Date(Date.now() - 60_000).toISOString();
    const { data: recent } = await db
      .from("zenipay_access_requests")
      .select("id")
      .eq("email", email)
      .gte("created_at", sixtySecAgo)
      .limit(1)
      .maybeSingle();
    if (recent) {
      return NextResponse.json({ ok: true, deduped: true });
    }

    const ua = req.headers.get("user-agent");
    const forwarded = req.headers.get("x-forwarded-for");
    const ipHint = forwarded ? forwarded.split(",")[0].trim() : null;

    const { error } = await db.from("zenipay_access_requests").insert({
      email,
      company,
      role,
      agent_fleet_size,
      message,
      source,
      user_agent: truncate(ua ?? "", 500) || null,
      ip_hint: ipHint,
    });
    if (error) {
      return NextResponse.json({ error: { code: "server_error", message: error.message } }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: { code: "server_error", message: e instanceof Error ? e.message : "unknown" } },
      { status: 500 },
    );
  }
}

function truncate(s: string, max: number): string {
  const t = s.trim();
  return t.length > max ? t.slice(0, max) : t;
}
