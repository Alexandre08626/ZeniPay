// Maps a merchant category code (MCC) to a GL account for a given org.
// Resolution order:
//   1. Org override in agents.mcc_gl_mapping (is_default=FALSE)
//   2. Seed default in agents.mcc_gl_mapping (is_default=TRUE, copied from catalog)
//   3. Global agents.mcc_default_catalog — if the seed step hasn't run yet
//   4. Org's "Uncategorized" GL account (code=9900)
//   5. null (caller should leave gl_account_id=NULL so the CFO sees it in the
//      "Uncategorized" bucket and can manually assign).

import { getAgentsDb } from "../supabase-client";

export interface MapResult {
  gl_account_id: string | null;
  gl_code: string | null;
  gl_name: string | null;
  source: "org_override" | "seed_default" | "catalog_fallback" | "uncategorized" | "unmatched";
}

export async function mapMccToGlAccount(orgId: string, mcc: string | null | undefined): Promise<MapResult> {
  const db = getAgentsDb();

  // Step 1+2 collapsed — mcc_gl_mapping holds both org overrides AND seeded
  // defaults. A manual override is flagged is_default=FALSE; prefer it.
  if (mcc) {
    const { data: mapping } = await db
      .from("mcc_gl_mapping")
      .select("gl_account_id, is_default")
      .eq("organization_id", orgId)
      .eq("mcc", mcc)
      .order("is_default", { ascending: true }) // FALSE first = override wins
      .limit(1)
      .maybeSingle();

    if (mapping) {
      const { data: gl } = await db
        .from("gl_accounts")
        .select("id, code, name")
        .eq("id", (mapping as { gl_account_id: string }).gl_account_id)
        .eq("active", true)
        .maybeSingle();
      if (gl) {
        return {
          gl_account_id: (gl as { id: string }).id,
          gl_code: (gl as { code: string }).code,
          gl_name: (gl as { name: string }).name,
          source: (mapping as { is_default: boolean }).is_default ? "seed_default" : "org_override",
        };
      }
    }
  }

  // Step 3 — global catalog fallback.
  if (mcc) {
    const { data: catalog } = await db
      .from("mcc_default_catalog")
      .select("gl_code, gl_name")
      .eq("mcc", mcc)
      .maybeSingle();
    if (catalog) {
      const { data: gl } = await db
        .from("gl_accounts")
        .select("id, code, name")
        .eq("organization_id", orgId)
        .eq("code", (catalog as { gl_code: string }).gl_code)
        .eq("active", true)
        .maybeSingle();
      if (gl) {
        return {
          gl_account_id: (gl as { id: string }).id,
          gl_code: (gl as { code: string }).code,
          gl_name: (gl as { name: string }).name,
          source: "catalog_fallback",
        };
      }
    }
  }

  // Step 4 — "Uncategorized" bucket (code 9900) if it exists.
  const { data: uncat } = await db
    .from("gl_accounts")
    .select("id, code, name")
    .eq("organization_id", orgId)
    .eq("code", "9900")
    .eq("active", true)
    .maybeSingle();
  if (uncat) {
    return {
      gl_account_id: (uncat as { id: string }).id,
      gl_code: (uncat as { code: string }).code,
      gl_name: (uncat as { name: string }).name,
      source: "uncategorized",
    };
  }

  return { gl_account_id: null, gl_code: null, gl_name: null, source: "unmatched" };
}
