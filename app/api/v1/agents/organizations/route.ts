// POST /api/v1/agents/organizations
//   Provisions an organization for an email. Auto-creates the auth.users row
//   via Supabase Admin API if one doesn't exist yet. Idempotent by email.
//
// This is the only endpoint in Phase 1 that does not require an existing
// auth context — it's how a brand-new user gets into the Agents product
// from the /agents/login page.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAgentsDb } from "@/lib/agents/supabase-client";
import { logEvent } from "@/lib/agents/audit-log";

export async function POST(req: NextRequest) {
  try {
    const { email, organizationName } = await req.json();
    if (!email || !/^\S+@\S+\.\S+$/.test(String(email))) {
      return NextResponse.json({ error: "valid email required" }, { status: 400 });
    }
    const orgName = (organizationName && String(organizationName).trim()) || email.split("@")[0];

    const db = getAgentsDb();

    // 1. Get-or-create auth.users row via Supabase admin (idempotent by email).
    const userId = await ensureAuthUser(String(email));

    // 2. Look up an existing membership for this user; if found, reuse that org.
    const { data: existing } = await db
      .from("agent_organization_members")
      .select("organization_id")
      .eq("user_id", userId)
      .limit(1);
    if (Array.isArray(existing) && existing.length > 0) {
      const organizationId = existing[0].organization_id;
      return NextResponse.json({ organization_id: organizationId, user_id: userId, created: false });
    }

    // 3. Create org + owner membership atomically-ish (two inserts).
    const { data: org, error: orgErr } = await db
      .from("agent_organizations")
      .insert({ name: orgName, owner_user_id: userId })
      .select("id")
      .single();
    if (orgErr || !org) {
      console.error("[agents/organizations] org insert failed", orgErr);
      return NextResponse.json({ error: "provision failed" }, { status: 500 });
    }

    const { error: memberErr } = await db
      .from("agent_organization_members")
      .insert({ organization_id: org.id, user_id: userId, role: "owner" });
    if (memberErr) {
      console.error("[agents/organizations] member insert failed", memberErr);
      // swallow — org exists; dashboard will still work via session header
    }

    await logEvent({
      organizationId: org.id,
      actorType: "system",
      actorId: userId,
      eventType: "organization.created",
      payload: { email, name: orgName },
    });

    return NextResponse.json({ organization_id: org.id, user_id: userId, created: true });
  } catch (err) {
    console.error("[agents/organizations] fatal", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

/** Look up or create an auth.users row for this email, returning its uuid. */
async function ensureAuthUser(email: string): Promise<string> {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("missing supabase env");

  // Try to find an existing user by email via the Admin API.
  const searchRes = await fetch(`${url}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    cache: "no-store",
  });
  if (searchRes.ok) {
    const body = await searchRes.json();
    const users = Array.isArray(body?.users) ? body.users : [];
    const match = users.find((u: { email?: string; id?: string }) => u.email === email);
    if (match?.id) return match.id;
  }

  // Create one.
  const createRes = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ email, email_confirm: true }),
    cache: "no-store",
  });
  if (!createRes.ok) {
    const t = await createRes.text();
    throw new Error(`auth admin createUser failed ${createRes.status}: ${t}`);
  }
  const created = await createRes.json();
  const id: string | undefined = created?.id || created?.user?.id;
  if (!id) throw new Error("createUser returned no id");
  return id;
}
