// Shared authentication helpers for /api/v1/agents/* routes.
//
// Two entry modes supported in Phase 1:
//   1. Bearer API key (zpk_live_ / zpk_test_) — for the SDK + server-to-server.
//   2. Session org-id header (x-zp-agents-org) — for the dashboard. This is
//      intentionally soft auth for Phase 1: the dashboard provisions an org
//      then stores the org-id in sessionStorage. Full Supabase Auth JWT
//      integration arrives in a later step.
//
// Both modes return an `AgentsAuth` context with the organizationId the
// caller is operating inside. RLS is bypassed by service_role, so route
// handlers must use this context to scope queries.

import { NextRequest } from "next/server";
import { verifyApiKey } from "@/lib/agents/api-keys";

export interface AgentsAuth {
  organizationId: string;
  via: "api_key" | "session";
  apiKeyId?: string;
  environment?: "test" | "live";
  scopes?: string[];
}

export async function authenticate(req: NextRequest): Promise<AgentsAuth | null> {
  // 1. Bearer token
  const authz = req.headers.get("authorization");
  if (authz?.toLowerCase().startsWith("bearer ")) {
    const raw = authz.slice(7).trim();
    const r = await verifyApiKey(raw);
    if (!r.ok) return null;
    return {
      organizationId: r.organizationId,
      via: "api_key",
      apiKeyId: r.keyId,
      environment: r.environment,
      scopes: r.scopes,
    };
  }

  // 2. Session org-id header
  const orgId = req.headers.get("x-zp-agents-org");
  if (orgId && orgId.startsWith("org_")) {
    return { organizationId: orgId, via: "session" };
  }

  return null;
}

export function unauthorized(message = "unauthorized"): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}
