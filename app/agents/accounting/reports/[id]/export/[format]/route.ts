// Signed-URL download handler. Receives the HMAC-signed URL minted by
// /api/v1/agents/accounting/expense-reports/[id]/export, re-verifies the
// signature + expiry, then streams the export bytes.
//
// The URL shape (same secret, 60s TTL):
//   /agents/accounting/reports/[id]/export/[format]?token=…&exp=…&o=orgId
//
// Verification is constant-time (timingSafeEqual) and we refuse if:
//   - token is invalid or malformed
//   - exp is in the past
//   - o does not match the report's organization_id
//   - the report does not exist / belongs to another org

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import crypto from "node:crypto";
import { getAgentsDb } from "@/lib/agents/supabase-client";
import { getExportRows } from "@/lib/agents/accounting/report-builder";
import { toCsv } from "@/lib/agents/accounting/exports/generic-csv";
import { toQuickbooksCsv } from "@/lib/agents/accounting/exports/quickbooks";
import { toXeroCsv } from "@/lib/agents/accounting/exports/xero";
import { toNetSuiteJson } from "@/lib/agents/accounting/exports/netsuite";

interface RouteContext { params: Promise<{ id: string; format: string }> | { id: string; format: string }; }
const VALID = ["csv", "quickbooks", "xero", "netsuite"] as const;
type Format = typeof VALID[number];

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { id, format } = await Promise.resolve(ctx.params);
  if (!VALID.includes(format as Format)) return bad("invalid_format");

  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") ?? "";
  const expStr = searchParams.get("exp") ?? "";
  const orgId = searchParams.get("o") ?? "";
  if (!token || !expStr || !orgId) return bad("missing_params");

  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return bad("expired");

  const secret = process.env.ZP_EXPORT_URL_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!secret) return bad("server_misconfigured");
  const payload = `${id}.${format}.${exp}.${orgId}`;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const a = Buffer.from(token, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return bad("bad_signature");

  const db = getAgentsDb();
  const { data: report } = await db
    .from("expense_reports").select("id, period_start, period_end, organization_id")
    .eq("id", id).eq("organization_id", orgId)
    .maybeSingle();
  if (!report) return bad("not_found", 404);

  const rows = await getExportRows(id, orgId);

  let body: string;
  let contentType: string;
  let filename: string;
  const periodSuffix = `${(report as { period_start: string }).period_start}_${(report as { period_end: string }).period_end}`;

  switch (format as Format) {
    case "csv":
      body = toCsv(rows);
      contentType = "text/csv; charset=utf-8";
      filename = `zenipay_expenses_${periodSuffix}.csv`;
      break;
    case "quickbooks":
      body = toQuickbooksCsv(rows);
      contentType = "text/csv; charset=utf-8";
      filename = `zenipay_quickbooks_${periodSuffix}.csv`;
      break;
    case "xero":
      body = toXeroCsv(rows);
      contentType = "text/csv; charset=utf-8";
      filename = `zenipay_xero_${periodSuffix}.csv`;
      break;
    case "netsuite":
      body = toNetSuiteJson(rows);
      contentType = "application/json; charset=utf-8";
      filename = `zenipay_netsuite_${periodSuffix}.json`;
      break;
  }

  return new Response(body, {
    status: 200,
    headers: {
      "content-type": contentType,
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}

function bad(err: string, status = 400): Response {
  return new Response(JSON.stringify({ error: err }), {
    status,
    headers: { "content-type": "application/json" },
  });
}
