// Shared authentication helpers for /api/v1/agents/* routes.
//
// Two entry modes:
//   1. Bearer API key (zpk_live_ / zpk_test_) — for the SDK + server-to-server.
//   2. Cookie session — derives merchant_id from the merchant session
//      cookie (HMAC `zp_session` or Supabase `sb-access-token`), then
//      resolves the agent organization via zenipay_merchant_agent_org_map.
//
// Critical: the dashboard previously trusted an `x-zp-agents-org`
// header from sessionStorage. Anyone could put any org id in there
// and read another tenant's agents — the bug that exposed Zeniva's
// 9 agents to every other merchant. The session path now ignores
// that header entirely and looks up the org via the join table
// scoped to the cookie-bound merchant.
//
// Personal-only merchants DO get an agents fleet — the /api/auth/
// register/personal endpoint seeds 5 default agents (Leo / Ben / Atlas
// / Vera / Kai) into a new org at signup. authenticate() treats them
// like any other merchant; the org link in zenipay_merchant_agent_org_map
// is the source of truth for what they see.
//
// For merchants without an org link yet (legacy business accounts pre
// the join-table provisioning fix, OR a personal merchant whose seed
// failed), authenticate() lazy-creates an empty agent_organizations
// row + map entry so they land on the empty state rather than 401-ing.
// The empty-org path won't seed agents — that's only on signup or via
// an explicit backfill.

import { NextRequest } from "next/server";
import { verifyApiKey } from "@/lib/agents/api-keys";
import { getZpSession } from "@/lib/auth/zp-session";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

export interface AgentsAuth {
  organizationId: string;
  via: "api_key" | "session";
  apiKeyId?: string;
  userId?: string;              // auth.users.id for the merchant owner.
  environment?: "test" | "live";
  scopes?: string[];
}

interface MerchantRow {
  id: string;
  status: string | null;
  auth_user_id: string | null;
  business_name: string | null;
  email: string | null;
}

async function loadMerchant(merchantId: string): Promise<MerchantRow | null> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("zenipay_merchants")
    .select("id, status, auth_user_id, business_name, email")
    .eq("id", merchantId)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as MerchantRow;
}

async function lookupOrgForMerchant(merchantId: string): Promise<string | null> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("zenipay_merchant_agent_org_map")
    .select("organization_id")
    .eq("merchant_id", merchantId)
    .maybeSingle();
  return (data?.organization_id as string | null) ?? null;
}

// Lazy-provision an empty org for a business merchant that doesn't
// have one yet. Returns the new org id, or null if we can't (e.g.
// merchant has no auth_user_id — legacy data we can't safely link).
async function provisionOrgForMerchant(merchant: MerchantRow): Promise<string | null> {
  if (!merchant.auth_user_id) return null;
  const db = getSupabaseAdmin();
  const orgId = `org_${crypto.randomUUID()}`;
  const { error: orgErr } = await db
    .schema("agents")
    .from("agent_organizations")
    .insert({
      id:            orgId,
      name:          merchant.business_name || merchant.email || "Untitled",
      owner_user_id: merchant.auth_user_id,
      plan_tier:     "free",
      status:        "active",
    });
  if (orgErr) {
    console.error("[agents auth] org provision failed:", orgErr.message);
    return null;
  }
  const { error: mapErr } = await db
    .from("zenipay_merchant_agent_org_map")
    .insert({
      merchant_id:     merchant.id,
      organization_id: orgId,
    });
  if (mapErr) {
    console.error("[agents auth] org map insert failed:", mapErr.message);
    // Best-effort cleanup so we don't leave a dangling org.
    await db.schema("agents").from("agent_organizations").delete().eq("id", orgId);
    return null;
  }
  return orgId;
}

export async function authenticate(req: NextRequest): Promise<AgentsAuth | null> {
  // 1. Bearer token path — unchanged. Programmatic callers identify
  // themselves by API key and the org is bound to the key.
  const authz = req.headers.get("authorization");
  if (authz?.toLowerCase().startsWith("bearer ")) {
    const raw = authz.slice(7).trim();
    const r = await verifyApiKey(raw);
    if (!r.ok) return null;
    return {
      organizationId: r.organizationId,
      via:            "api_key",
      apiKeyId:       r.keyId,
      environment:    r.environment,
      scopes:         r.scopes,
    };
  }

  // 2. Cookie session path. Source of truth = the merchant session
  // cookie. The org is derived server-side; the client cannot
  // influence which org we read.
  const session = await getZpSession(req);
  if (!session?.merchant_id) return null;

  const merchant = await loadMerchant(session.merchant_id);
  if (!merchant) return null;

  let orgId = await lookupOrgForMerchant(merchant.id);
  if (!orgId) {
    orgId = await provisionOrgForMerchant(merchant);
    if (!orgId) return null;
  }

  return {
    organizationId: orgId,
    via:            "session",
    userId:         session.auth_user_id || merchant.auth_user_id || undefined,
  };
}

/** Step-up enforcement — call before money-moving or approval-sensitive
 *  endpoints. Phase 1 soft-auth: just asserts we have a userId. Phase 4
 *  will enforce a fresh MFA timestamp. */
export function requireUser(auth: AgentsAuth | null): Response | AgentsAuth & { userId: string } {
  if (!auth) return unauthorized();
  if (auth.via !== "session" || !auth.userId) {
    return new Response(JSON.stringify({ error: "user_session_required" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  return auth as AgentsAuth & { userId: string };
}

export function unauthorized(message = "unauthorized"): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}
