// Types for the accounting / GL module. Mirrors agents.* tables added in
// 20260422000001_agents_gl_accounting.sql plus the existing expense tables.

export interface GlAccount {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  parent_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MccMapping {
  id: string;
  organization_id: string;
  mcc: string;
  gl_account_id: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface McDefaultCatalogRow {
  mcc: string;
  gl_code: string;
  gl_name: string;
  description: string;
}

export type ExpenseReportStatus = "draft" | "finalized" | "exported";
export type ExportFormat = "quickbooks" | "xero" | "netsuite" | "csv";

export interface ExpenseReport {
  id: string;
  organization_id: string;
  period_start: string;          // YYYY-MM-DD
  period_end: string;
  status: ExpenseReportStatus;
  finalized_at: string | null;
  finalized_by: string | null;
  export_format: ExportFormat | null;
  export_ref: string | null;
  parent_report_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseReportLine {
  id: string;
  report_id: string;
  transaction_id: string | null;
  card_auth_id: string | null;
  gl_account_id: string | null;
  memo: string | null;
  amount_cents: number;
  currency: string;
  converted_usd_cents: number;
  manually_categorized: boolean;
  created_at: string;
}

/** The per-line shape exports expect — joined with gl_account + merchant + date. */
export interface ExportRow {
  date: string;                  // YYYY-MM-DD (from card_auth.occurred_at or tx.created_at)
  merchant: string;
  amount_cents: number;
  currency: string;
  converted_usd_cents: number;
  gl_code: string | null;
  gl_name: string | null;
  memo: string;
  agent_name: string | null;
  card_last4: string | null;
  line_id: string;
  source_type: "card" | "api";
}
