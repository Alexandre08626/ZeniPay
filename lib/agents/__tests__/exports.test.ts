import { describe, it, expect } from "vitest";
import { toCsv } from "../accounting/exports/generic-csv";
import { toQuickbooksCsv } from "../accounting/exports/quickbooks";
import { toXeroCsv } from "../accounting/exports/xero";
import { toNetSuiteJson } from "../accounting/exports/netsuite";
import type { ExportRow } from "../accounting/types";

const ROW: ExportRow = {
  date: "2026-04-22",
  merchant: "OpenAI",
  amount_cents: 1999,
  currency: "USD",
  converted_usd_cents: 1999,
  gl_code: "6120",
  gl_name: "AI API Services",
  memo: "gpt-4o tokens",
  agent_name: "Research Scout",
  card_last4: "4242",
  line_id: "exl_abc123",
  source_type: "card",
};

const ROW_QUOTE_BOMB: ExportRow = {
  ...ROW,
  merchant: `Evil "Corp", Inc.`,
  memo: "line1\nline2",
  line_id: "exl_xyz999",
};

describe("generic-csv", () => {
  it("emits header + row with currency + usd + gl_code", () => {
    const out = toCsv([ROW]);
    const lines = out.trim().split("\r\n");
    expect(lines[0]).toBe("Date,Merchant,Amount,Currency,AmountUSD,GLCode,GLName,Agent,CardLast4,Memo,LineId");
    expect(lines[1]).toContain("2026-04-22,OpenAI,19.99,USD,19.99,6120,AI API Services,Research Scout,4242");
  });

  it("escapes quotes and commas per RFC 4180", () => {
    const out = toCsv([ROW_QUOTE_BOMB]);
    expect(out).toContain(`"Evil ""Corp"", Inc."`);
    expect(out).toContain(`"line1\nline2"`);
  });
});

describe("quickbooks csv", () => {
  it("uses mm/dd/yyyy and negative amount for expense", () => {
    const out = toQuickbooksCsv([ROW]);
    expect(out).toContain("04/22/2026");
    expect(out).toContain("-19.99");
  });

  it("header is Date,Description,Amount", () => {
    const out = toQuickbooksCsv([]);
    expect(out.trim()).toBe("Date,Description,Amount");
  });
});

describe("xero csv", () => {
  it("uses dd/mm/yyyy and negative amount", () => {
    const out = toXeroCsv([ROW]);
    expect(out).toContain("22/04/2026");
    expect(out).toContain("-19.99");
  });

  it("header matches Xero spec: *Date,*Amount,Payee,Description,Reference", () => {
    expect(toXeroCsv([]).trim()).toBe("*Date,*Amount,Payee,Description,Reference");
  });
});

describe("netsuite json", () => {
  it("one journal_line per row, keys preserved", () => {
    const parsed = JSON.parse(toNetSuiteJson([ROW])) as { journal_lines: Array<{ account: string; debit: string; externalId: string }> };
    expect(parsed.journal_lines.length).toBe(1);
    expect(parsed.journal_lines[0].account).toBe("6120");
    expect(parsed.journal_lines[0].debit).toBe("19.99");
    expect(parsed.journal_lines[0].externalId).toBe("exl_abc123");
  });

  it("falls back to 9900 when gl_code is null", () => {
    const noGl = { ...ROW, gl_code: null };
    const parsed = JSON.parse(toNetSuiteJson([noGl])) as { journal_lines: Array<{ account: string }> };
    expect(parsed.journal_lines[0].account).toBe("9900");
  });
});
