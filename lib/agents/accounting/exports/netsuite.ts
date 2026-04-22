// NetSuite SuiteAnalytics-compatible JSON export. Each row is a journal-entry
// line with account code, debit, credit, memo, date. We emit one object per
// expense line: credit the clearing account (agent card expense), debit the
// GL account.

import type { ExportRow } from "../types";

export interface NetSuiteLine {
  tranDate: string;       // ISO date
  memo: string;
  account: string;        // GL code
  debit?: string;
  credit?: string;
  currency: string;
  externalId: string;     // line_id — keeps NetSuite imports idempotent
  customFields?: { agent?: string; merchant?: string; card_last4?: string };
}

export function toNetSuiteJson(rows: ExportRow[]): string {
  const out: NetSuiteLine[] = rows.map((r) => ({
    tranDate: r.date,
    memo: [r.merchant, r.memo].filter(Boolean).join(" — "),
    account: r.gl_code ?? "9900",
    debit: (r.converted_usd_cents / 100).toFixed(2),
    currency: "USD",
    externalId: r.line_id,
    customFields: {
      agent: r.agent_name ?? undefined,
      merchant: r.merchant,
      card_last4: r.card_last4 ?? undefined,
    },
  }));
  return JSON.stringify({ journal_lines: out }, null, 2);
}
