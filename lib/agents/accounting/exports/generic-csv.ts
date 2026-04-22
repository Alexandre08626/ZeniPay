// Universal CSV: Date, Merchant, Amount, Currency, AmountUSD, GLCode, GLName,
// Agent, CardLast4, Memo, LineId. RFC 4180 quoting (double-quote fields that
// contain commas / quotes / newlines).

import type { ExportRow } from "../types";

export function toCsv(rows: ExportRow[]): string {
  const headers = [
    "Date", "Merchant", "Amount", "Currency", "AmountUSD",
    "GLCode", "GLName", "Agent", "CardLast4", "Memo", "LineId",
  ];
  const out: string[] = [headers.join(",")];
  for (const r of rows) {
    out.push([
      r.date,
      q(r.merchant),
      (r.amount_cents / 100).toFixed(2),
      r.currency,
      (r.converted_usd_cents / 100).toFixed(2),
      q(r.gl_code ?? ""),
      q(r.gl_name ?? ""),
      q(r.agent_name ?? ""),
      q(r.card_last4 ?? ""),
      q(r.memo),
      r.line_id,
    ].join(","));
  }
  return out.join("\r\n") + "\r\n";
}

function q(s: string): string {
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
