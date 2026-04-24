// GET /api/v1/agents/ledger
//
// Org-scoped ledger feed for /agents/ledger and /agents/treasury.
// Returns:
//   snapshot:  OrgBalanceSnapshot[] — per-currency treasury / agents /
//              cards totals aggregated from zenicore.accounts.
//   entries:   journal rows whose tx_group.organization_id = caller's org.
//   integrity: chain-integrity result from zc_verify_chain_integrity.
//
// Reads go through the public SECURITY DEFINER wrappers (zc_get_accounts,
// zc_get_tx_groups, zc_get_journal, zc_verify_chain_integrity) via raw
// fetch. The supabase-js `rpc()` path was swallowing results in the
// Vercel runtime — the $0.01 acceptance test had 4 journal entries in
// the DB but this route returned `entries: []`. Raw fetch side-steps
// whatever parsing quirk hit us there.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "../_lib/auth";
import { errorResponse, serverError } from "../_lib/errors";

function pgEnv(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

async function callRpc<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  const env = pgEnv();
  if (!env) throw new Error("supabase_env_missing");
  const res = await fetch(`${env.url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: env.key,
      Authorization: `Bearer ${env.key}`,
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    },
    cache: "no-store",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`${fn} ${res.status}: ${txt.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

interface ZcAccount {
  id: string;
  owner_type: string;
  owner_ref: string;
  currency: string;
  balance_micro: string | number;
}
interface ZcTxGroup { id: string; organization_id: string | null }
interface ZcJournalRow {
  id: string; tx_group: string; seq: number | string;
  posted_at: string; account_id: string; direction: "debit" | "credit";
  amount_micro: string | number; currency: string; memo: string;
  ref_type: string | null; ref_id: string | null; posted_by: string;
}
interface ChainIntegrityRow {
  total_entries: number | string;
  verified_entries: number | string;
  first_break_at: string | null;
  first_break_id: string | null;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (!auth) return errorResponse("unauthorized", "unauthorized");
    const orgId = auth.organizationId;

    const [accounts, groups, journalRows, integrityRows] = await Promise.all([
      callRpc<ZcAccount[]>("zc_get_accounts", { p_organization_id: orgId }),
      callRpc<ZcTxGroup[]>("zc_get_tx_groups", { p_organization_id: orgId, p_limit: 200 }),
      callRpc<ZcJournalRow[]>("zc_get_journal", { p_organization_id: orgId, p_limit: 200 }),
      callRpc<ChainIntegrityRow[]>("zc_verify_chain_integrity", { p_start_at: null }),
    ]);

    // Build per-currency snapshot from accounts.
    const buckets = new Map<string, {
      currency: string;
      treasury_micro: bigint;
      agents_allocated_micro: bigint;
      cards_pending_micro: bigint;
      total_micro: bigint;
    }>();
    for (const a of accounts) {
      const cur = a.currency.trim();
      const entry = buckets.get(cur) ?? {
        currency: cur,
        treasury_micro: BigInt(0),
        agents_allocated_micro: BigInt(0),
        cards_pending_micro: BigInt(0),
        total_micro: BigInt(0),
      };
      const bal = BigInt(a.balance_micro);
      if (a.owner_type === "org_treasury")      entry.treasury_micro         += bal;
      else if (a.owner_type === "agent_wallet") entry.agents_allocated_micro += bal;
      else if (a.owner_type === "virtual_card") entry.cards_pending_micro    += bal;
      if (["org_treasury", "agent_wallet", "virtual_card"].includes(a.owner_type)) {
        entry.total_micro += bal;
      }
      buckets.set(cur, entry);
    }

    // Filter journal to entries in this org's tx_groups.
    const orgTxIds = new Set(groups.map((g) => g.id));
    const entries = journalRows.filter((r) => orgTxIds.has(r.tx_group));

    const integrity = integrityRows[0] ?? {
      total_entries: 0, verified_entries: 0, first_break_at: null, first_break_id: null,
    };

    return NextResponse.json({
      snapshot: Array.from(buckets.values()).map((b) => ({
        organization_id: orgId,
        currency: b.currency,
        treasury_micro: b.treasury_micro.toString(),
        agents_allocated_micro: b.agents_allocated_micro.toString(),
        cards_pending_micro: b.cards_pending_micro.toString(),
        total_micro: b.total_micro.toString(),
      })),
      integrity: {
        total_entries: Number(integrity.total_entries ?? 0),
        verified_entries: Number(integrity.verified_entries ?? 0),
        first_break_at: integrity.first_break_at,
        first_break_id: integrity.first_break_id,
        is_intact: Number(integrity.total_entries ?? 0) === Number(integrity.verified_entries ?? 0),
      },
      entries: entries.map((e) => ({
        id: e.id,
        tx_group: e.tx_group,
        seq: e.seq,
        posted_at: e.posted_at,
        account_id: e.account_id,
        direction: e.direction,
        amount_micro: String(e.amount_micro),
        currency: e.currency,
        memo: e.memo,
        ref_type: e.ref_type,
        ref_id: e.ref_id,
        posted_by: e.posted_by,
      })),
    });
  } catch (e) {
    return serverError(e);
  }
}
