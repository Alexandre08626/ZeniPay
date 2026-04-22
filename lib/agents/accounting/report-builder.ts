// Period-window builders + DB helpers for expense reports.
//
// periodWindow() returns UTC ISO dates (YYYY-MM-DD) for the requested period
// anchored at a given "now". Handles DST / month boundaries safely by doing
// the arithmetic in UTC only. Timezone-aware accounting reports are Phase 4.

import { getAgentsDb } from "../supabase-client";
import type { ExpenseReport, ExpenseReportLine, ExportRow } from "./types";

export type Period = "weekly" | "monthly" | "custom";

export interface PeriodWindow {
  start: string; // YYYY-MM-DD inclusive
  end: string;   // YYYY-MM-DD inclusive
}

export function periodWindow(period: Period, now: Date = new Date(), custom?: PeriodWindow): PeriodWindow {
  if (period === "custom") {
    if (!custom?.start || !custom?.end) throw new Error("custom period requires start + end");
    return custom;
  }
  if (period === "weekly") {
    // Monday → Sunday (ISO week), all in UTC
    const day = now.getUTCDay();                  // 0=Sun..6=Sat
    const diffToMon = (day + 6) % 7;              // days back to Monday
    const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diffToMon));
    const sunday = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + 6));
    return { start: toYmd(monday), end: toYmd(sunday) };
  }
  // monthly — first day → last day of NOW's month in UTC
  const firstOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const lastOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  return { start: toYmd(firstOfMonth), end: toYmd(lastOfMonth) };
}

function toYmd(d: Date): string {
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${d.getUTCFullYear()}-${m}-${day}`;
}

/** Atomic — calls Postgres `build_expense_report()` which inserts report +
 *  lines in a single transaction, using FX rate snapshots (not live rates). */
export async function buildReport(params: {
  organizationId: string;
  window: PeriodWindow;
  actor?: string | null;
}): Promise<{ report_id: string }> {
  const db = getAgentsDb();
  const { data, error } = await db.rpc("build_expense_report", {
    p_org_id: params.organizationId,
    p_period_start: params.window.start,
    p_period_end: params.window.end,
    p_actor: params.actor ?? null,
  });
  if (error) throw new Error(`build_expense_report: ${error.message}`);
  return { report_id: String(data ?? "") };
}

export async function getReport(reportId: string, orgId: string): Promise<ExpenseReport | null> {
  const db = getAgentsDb();
  const { data } = await db
    .from("expense_reports")
    .select("*")
    .eq("id", reportId)
    .eq("organization_id", orgId)
    .maybeSingle();
  return (data as ExpenseReport) ?? null;
}

/** Page lines using (report_id, created_at, id) cursor — preserves order
 *  across paginations when many lines share the same created_at tick. */
export async function getLines(params: {
  reportId: string;
  cursor?: { created_at: string; id: string } | null;
  limit?: number;
}): Promise<{ lines: ExpenseReportLine[]; next_cursor: { created_at: string; id: string } | null }> {
  const db = getAgentsDb();
  const limit = Math.min(1000, Math.max(10, params.limit ?? 250));
  let q = db
    .from("expense_report_lines")
    .select("*")
    .eq("report_id", params.reportId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit + 1);
  if (params.cursor) {
    q = q.or(
      `created_at.gt.${params.cursor.created_at},and(created_at.eq.${params.cursor.created_at},id.gt.${params.cursor.id})`,
    );
  }
  const { data, error } = await q;
  if (error) throw new Error(`getLines: ${error.message}`);
  const rows = (data ?? []) as ExpenseReportLine[];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const next = hasMore && page.length > 0
    ? { created_at: page[page.length - 1].created_at, id: page[page.length - 1].id }
    : null;
  return { lines: page, next_cursor: next };
}

/** Join lines with their source (card_auth / agent_transaction) + agent + GL
 *  account for export. Returns the shape export writers expect. */
export async function getExportRows(reportId: string, orgId: string): Promise<ExportRow[]> {
  const db = getAgentsDb();
  const { data: lines } = await db
    .from("expense_report_lines")
    .select("*")
    .eq("report_id", reportId)
    .order("created_at", { ascending: true });
  if (!lines) return [];

  const cardAuthIds = Array.from(new Set((lines as ExpenseReportLine[]).map((l) => l.card_auth_id).filter(Boolean) as string[]));
  const txIds       = Array.from(new Set((lines as ExpenseReportLine[]).map((l) => l.transaction_id).filter(Boolean) as string[]));
  const glIds       = Array.from(new Set((lines as ExpenseReportLine[]).map((l) => l.gl_account_id).filter(Boolean) as string[]));

  const [cardAuths, txns, gls] = await Promise.all([
    cardAuthIds.length ? db.from("card_authorizations").select("id, merchant_name, occurred_at, created_at, card_id").in("id", cardAuthIds) : { data: [] },
    txIds.length       ? db.from("agent_transactions").select("id, merchant_id, created_at, agent_id").in("id", txIds)                    : { data: [] },
    glIds.length       ? db.from("gl_accounts").select("id, code, name").in("id", glIds)                                                  : { data: [] },
  ]);

  const cardAuthMap = new Map<string, { merchant_name: string | null; occurred_at: string | null; created_at: string; card_id: string }>(
    (cardAuths.data ?? []).map((r: unknown) => [(r as { id: string }).id, r as { merchant_name: string | null; occurred_at: string | null; created_at: string; card_id: string }]),
  );
  const txMap = new Map<string, { merchant_id: string | null; created_at: string; agent_id: string | null }>(
    (txns.data ?? []).map((r: unknown) => [(r as { id: string }).id, r as { merchant_id: string | null; created_at: string; agent_id: string | null }]),
  );
  const glMap = new Map<string, { code: string; name: string }>(
    (gls.data ?? []).map((r: unknown) => [(r as { id: string }).id, r as { code: string; name: string }]),
  );

  // Resolve card.last4 + agent.name in a second pass.
  const cardIds  = Array.from(new Set(Array.from(cardAuthMap.values()).map((c) => c.card_id)));
  const agentIds = Array.from(new Set(Array.from(txMap.values()).map((t) => t.agent_id).filter(Boolean) as string[]));
  const [cards, agents] = await Promise.all([
    cardIds.length  ? db.from("issued_cards").select("id, last4, agent_id").in("id", cardIds) : { data: [] },
    agentIds.length ? db.from("agents").select("id, name").in("id", agentIds)                 : { data: [] },
  ]);
  const cardMap = new Map<string, { last4: string | null; agent_id: string | null }>(
    (cards.data ?? []).map((r: unknown) => [(r as { id: string }).id, r as { last4: string | null; agent_id: string | null }]),
  );
  const agentMap = new Map<string, { name: string }>(
    (agents.data ?? []).map((r: unknown) => [(r as { id: string }).id, r as { name: string }]),
  );
  void orgId;

  return (lines as ExpenseReportLine[]).map((line) => {
    if (line.card_auth_id) {
      const auth = cardAuthMap.get(line.card_auth_id);
      const card = auth?.card_id ? cardMap.get(auth.card_id) : null;
      const agent = card?.agent_id ? agentMap.get(card.agent_id) : null;
      const gl = line.gl_account_id ? glMap.get(line.gl_account_id) : null;
      return {
        date: toYmd(new Date(auth?.occurred_at ?? auth?.created_at ?? line.created_at)),
        merchant: auth?.merchant_name ?? (line.memo || ""),
        amount_cents: line.amount_cents,
        currency: line.currency,
        converted_usd_cents: line.converted_usd_cents,
        gl_code: gl?.code ?? null,
        gl_name: gl?.name ?? null,
        memo: line.memo ?? "",
        agent_name: agent?.name ?? null,
        card_last4: card?.last4 ?? null,
        line_id: line.id,
        source_type: "card" as const,
      };
    }
    const tx = line.transaction_id ? txMap.get(line.transaction_id) : null;
    const agent = tx?.agent_id ? agentMap.get(tx.agent_id) : null;
    const gl = line.gl_account_id ? glMap.get(line.gl_account_id) : null;
    return {
      date: toYmd(new Date(tx?.created_at ?? line.created_at)),
      merchant: tx?.merchant_id ?? (line.memo || ""),
      amount_cents: line.amount_cents,
      currency: line.currency,
      converted_usd_cents: line.converted_usd_cents,
      gl_code: gl?.code ?? null,
      gl_name: gl?.name ?? null,
      memo: line.memo ?? "",
      agent_name: agent?.name ?? null,
      card_last4: null,
      line_id: line.id,
      source_type: "api" as const,
    };
  });
}
