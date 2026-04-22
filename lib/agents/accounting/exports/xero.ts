// Xero bank statement CSV import — strict column order:
//   *Date, *Amount, Payee, Description, Reference
// Amounts: negative = money out.

import type { ExportRow } from "../types";

export function toXeroCsv(rows: ExportRow[]): string {
  const headers = ["*Date", "*Amount", "Payee", "Description", "Reference"];
  const out: string[] = [headers.join(",")];
  for (const r of rows) {
    out.push([
      toDdMmYyyy(r.date),
      (-(r.converted_usd_cents / 100)).toFixed(2),
      q(r.merchant),
      q([r.gl_name, r.memo].filter(Boolean).join(" · ")),
      r.line_id,
    ].join(","));
  }
  return out.join("\r\n") + "\r\n";
}

function toDdMmYyyy(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
}

function q(s: string): string {
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
