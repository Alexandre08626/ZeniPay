// QuickBooks Online CSV import — "3-column" bank statement format:
//   Date, Description, Amount          (negative amounts = expenses)
// This matches QBO's "bank transactions" import which maps to a feed account.
// For full .iif (QB Desktop) we'd need the transaction journal format; QBO
// covers ~99% of accounting teams today, so we ship CSV first.

import type { ExportRow } from "../types";

export function toQuickbooksCsv(rows: ExportRow[]): string {
  const headers = ["Date", "Description", "Amount"];
  const out: string[] = [headers.join(",")];
  for (const r of rows) {
    const desc = [r.merchant, r.gl_name, r.agent_name ? `agent:${r.agent_name}` : null]
      .filter(Boolean).join(" — ");
    out.push([
      toMmDdYyyy(r.date),
      q(desc),
      (-(r.converted_usd_cents / 100)).toFixed(2), // expense = negative
    ].join(","));
  }
  return out.join("\r\n") + "\r\n";
}

function toMmDdYyyy(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  return `${m}/${d}/${y}`;
}

function q(s: string): string {
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
