// Thin wrapper over the Postgres seed functions. Both are idempotent so the
// provisioning flow can call them on every org creation without double-writing.

import { getAgentsDb } from "../supabase-client";

export interface SeedResult { accounts_seeded: number; mcc_mappings_seeded: number }

export async function seedOrgAccounting(orgId: string, actor: string | null = null): Promise<SeedResult> {
  const db = getAgentsDb();
  const { data: acct, error: e1 } = await db.rpc("seed_org_gl_accounts", {
    p_org_id: orgId, p_actor: actor,
  });
  if (e1) throw new Error(`seed_org_gl_accounts: ${e1.message}`);

  const { data: mcc, error: e2 } = await db.rpc("seed_org_mcc_mappings", {
    p_org_id: orgId, p_actor: actor,
  });
  if (e2) throw new Error(`seed_org_mcc_mappings: ${e2.message}`);

  return {
    accounts_seeded: Number(acct ?? 0),
    mcc_mappings_seeded: Number(mcc ?? 0),
  };
}
