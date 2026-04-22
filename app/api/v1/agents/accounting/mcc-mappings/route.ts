// GET  /mcc-mappings   — merged view: org overrides + catalog defaults
// POST /mcc-mappings   — create override { mcc, gl_account_id }

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate, unauthorized } from "../../_lib/auth";
import { getAgentsDb } from "@/lib/agents/supabase-client";
import { logEvent } from "@/lib/agents/audit-log";

interface CatalogRow { mcc: string; gl_code: string; gl_name: string; description: string }
interface OrgMapping { id: string; mcc: string; gl_account_id: string; is_default: boolean }
interface GlRow { id: string; code: string; name: string }

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const db = getAgentsDb();

  const [{ data: catalog }, { data: org }, { data: gls }] = await Promise.all([
    db.from("mcc_default_catalog").select("mcc, gl_code, gl_name, description").order("mcc"),
    db.from("mcc_gl_mapping").select("id, mcc, gl_account_id, is_default").eq("organization_id", auth.organizationId),
    db.from("gl_accounts").select("id, code, name").eq("organization_id", auth.organizationId).eq("active", true),
  ]);

  const glById = new Map<string, GlRow>(((gls ?? []) as GlRow[]).map((g) => [g.id, g]));
  const orgByMcc = new Map<string, OrgMapping>(((org ?? []) as OrgMapping[]).map((m) => [m.mcc, m]));

  // Build merged view. For every MCC in catalog OR in org overrides, return
  // one row. Org override wins over seed row (is_default=false preferred).
  const allMccs = new Set<string>();
  for (const c of (catalog ?? []) as CatalogRow[]) allMccs.add(c.mcc);
  for (const m of (org ?? []) as OrgMapping[]) allMccs.add(m.mcc);

  const merged = Array.from(allMccs).sort().map((mcc) => {
    const catalogRow = ((catalog ?? []) as CatalogRow[]).find((c) => c.mcc === mcc);
    const orgRow = orgByMcc.get(mcc);
    const gl = orgRow ? glById.get(orgRow.gl_account_id) : null;
    return {
      mcc,
      description: catalogRow?.description ?? null,
      catalog_default: catalogRow ? { gl_code: catalogRow.gl_code, gl_name: catalogRow.gl_name } : null,
      org_mapping: orgRow && gl ? {
        id: orgRow.id,
        is_default: orgRow.is_default,
        gl_account_id: orgRow.gl_account_id,
        gl_code: gl.code,
        gl_name: gl.name,
      } : null,
    };
  });

  return NextResponse.json({ mappings: merged });
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const body = await req.json().catch(() => ({}));
  const mcc = String(body?.mcc ?? "").trim();
  const glAccountId = String(body?.gl_account_id ?? "").trim();
  if (!mcc || !glAccountId) return NextResponse.json({ error: "mcc + gl_account_id required" }, { status: 400 });

  const db = getAgentsDb();

  // Scope check: gl account must belong to org.
  const { data: gl } = await db
    .from("gl_accounts").select("id")
    .eq("id", glAccountId).eq("organization_id", auth.organizationId)
    .maybeSingle();
  if (!gl) return NextResponse.json({ error: "gl_account_not_found" }, { status: 404 });

  // Remove any existing row for this (org, mcc) — the new row is the override.
  await db
    .from("mcc_gl_mapping")
    .delete()
    .eq("organization_id", auth.organizationId)
    .eq("mcc", mcc);

  const { data, error } = await db
    .from("mcc_gl_mapping")
    .insert({
      organization_id: auth.organizationId,
      mcc, gl_account_id: glAccountId,
      is_default: false,
      created_by: auth.userId ?? null,
    })
    .select().single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "insert failed" }, { status: 500 });

  await logEvent({
    organizationId: auth.organizationId, actorType: "user",
    actorId: auth.userId ?? null,
    eventType: "mcc_mapping.overridden",
    payload: { mcc, gl_account_id: glAccountId },
  });
  return NextResponse.json({ mapping: data });
}
