// Treasury bookkeeping — reads org_treasuries / treasury_balances, routes
// writes through agents.book_transfer so idempotency + credit checks apply.
//
// All functions take organizationId as first arg and never trust client
// payloads for ownership — auth scoping is enforced by callers (API routes
// check membership) since service_role bypasses RLS.

import { getAgentsDb } from "../supabase-client";
import type {
  BookTransferResult,
  Currency,
  OrgTreasury,
  OrgTreasuryTotals,
  TreasuryBalance,
} from "./types";

export class TreasuryError extends Error {
  constructor(public code: TreasuryErrorCode, message: string) {
    super(message);
    this.name = "TreasuryError";
  }
}
export type TreasuryErrorCode =
  | "not_found"
  | "invalid_amount"
  | "invalid_direction"
  | "insufficient_funds"
  | "db_error";

/** Get-or-create the org's treasury row. */
export async function ensureTreasury(organizationId: string): Promise<OrgTreasury> {
  const db = getAgentsDb();
  const { data: existing } = await db
    .from("org_treasuries")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (existing) return existing as OrgTreasury;

  const { data, error } = await db
    .from("org_treasuries")
    .insert({ organization_id: organizationId })
    .select()
    .single();
  if (error || !data) throw new TreasuryError("db_error", error?.message ?? "insert failed");
  return data as OrgTreasury;
}

export async function getTreasury(organizationId: string): Promise<OrgTreasury | null> {
  const db = getAgentsDb();
  const { data } = await db
    .from("org_treasuries")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();
  return (data as OrgTreasury) ?? null;
}

export async function getTreasuryTotals(
  organizationId: string,
): Promise<OrgTreasuryTotals | null> {
  const db = getAgentsDb();
  const { data } = await db
    .from("org_treasury_totals")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();
  return (data as OrgTreasuryTotals) ?? null;
}

export async function getBalances(organizationId: string): Promise<TreasuryBalance[]> {
  const db = getAgentsDb();
  const { data, error } = await db
    .from("treasury_balances")
    .select("*")
    .eq("organization_id", organizationId)
    .order("currency", { ascending: true });
  if (error) throw new TreasuryError("db_error", error.message);
  return (data ?? []) as TreasuryBalance[];
}

/** Credit the org's USD treasury (wraps book_transfer: treasury → org). */
export async function fundTreasury(params: {
  organizationId: string;
  amountCents: number;
  currency?: Currency;
  note?: string;
  idempotencyKey?: string;
  actor?: string | null;
}): Promise<BookTransferResult> {
  if (!Number.isInteger(params.amountCents) || params.amountCents <= 0) {
    throw new TreasuryError("invalid_amount", `positive integer cents required, got ${params.amountCents}`);
  }
  const currency = params.currency ?? "USD";
  if (currency !== "USD") {
    throw new TreasuryError(
      "invalid_direction",
      `non-USD treasury funding not wired in PR 1 (got ${currency}); Phase 3 adds multi-currency routing`,
    );
  }
  const db = getAgentsDb();
  const { data, error } = await db.rpc("book_transfer", {
    p_organization_id: params.organizationId,
    p_from_type: "treasury",
    p_from_id: null,
    p_to_type: "org",
    p_to_id: null,
    p_amount_cents: params.amountCents,
    p_currency: currency,
    p_note: params.note ?? null,
    p_idempotency_key: params.idempotencyKey ?? null,
    p_actor: params.actor ?? null,
  });
  if (error) throw new TreasuryError("db_error", error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return row as BookTransferResult;
}

/** Distribute from org treasury to an agent wallet. */
export async function distributeToAgent(params: {
  organizationId: string;
  agentWalletId: string;
  amountCents: number;
  note?: string;
  idempotencyKey?: string;
  actor?: string | null;
}): Promise<BookTransferResult> {
  if (!Number.isInteger(params.amountCents) || params.amountCents <= 0) {
    throw new TreasuryError("invalid_amount", "positive integer cents required");
  }
  const db = getAgentsDb();
  const { data, error } = await db.rpc("book_transfer", {
    p_organization_id: params.organizationId,
    p_from_type: "treasury",
    p_from_id: null,
    p_to_type: "agent",
    p_to_id: params.agentWalletId,
    p_amount_cents: params.amountCents,
    p_currency: "USD",
    p_note: params.note ?? null,
    p_idempotency_key: params.idempotencyKey ?? null,
    p_actor: params.actor ?? null,
  });
  if (error) throw new TreasuryError("db_error", error.message);
  return (Array.isArray(data) ? data[0] : data) as BookTransferResult;
}
