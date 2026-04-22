// Signed-URL download handler. Receives the HMAC-signed URL minted by
// /api/v1/agents/accounting/expense-reports/[id]/export, re-verifies the
// signature + expiry + single-use nonce, then streams the export bytes.
//
// The URL shape (same secret, 60s TTL):
//   /agents/accounting/reports/[id]/export/[format]?token=…&exp=…&o=orgId
//
// Verification chain:
//   1. token is hex and matches HMAC(secret, `${id}.${format}.${exp}.${orgId}`)
//      — constant-time via crypto.timingSafeEqual
//   2. exp is in the future
//   3. o matches a report whose organization_id = o
//   4. agents.export_url_nonces has a row for this token — and we DELETE it
//      before returning. Second request → row gone → 410 Gone.

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import crypto from "node:crypto";
import { getAgentsDb } from "@/lib/agents/supabase-client";
import { getExportRows } from "@/lib/agents/accounting/report-builder";
import { toCsv } from "@/lib/agents/accounting/exports/generic-csv";
import { toQuickbooksCsv } from "@/lib/agents/accounting/exports/quickbooks";
import { toXeroCsv } from "@/lib/agents/accounting/exports/xero";
import { toNetSuiteJson } from "@/lib/agents/accounting/exports/netsuite";
import { errorPlainResponse } from "@/app/api/v1/agents/accounting/_lib/errors";

interface RouteContext { params: Promise<{ id: string; format: string }> | { id: string; format: string }; }
const VALID = ["csv", "quickbooks", "xero", "netsuite"] as const;
type Format = typeof VALID[number];

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const { id, format } = await Promise.resolve(ctx.params);
    if (!VALID.includes(format as Format)) return errorPlainResponse("bad_request", "invalid_format");

    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token") ?? "";
    const expStr = searchParams.get("exp") ?? "";
    const orgId = searchParams.get("o") ?? "";
    if (!token || !expStr || !orgId) return errorPlainResponse("bad_request", "missing_params");

    const exp = Number(expStr);
    if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
      return errorPlainResponse("gone", "link_expired");
    }

    const secret = process.env.ZP_EXPORT_URL_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    if (!secret) return errorPlainResponse("server_error", "server_misconfigured");
    const payload = `${id}.${format}.${exp}.${orgId}`;
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    const a = Buffer.from(token, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return errorPlainResponse("unauthorized", "bad_signature");
    }

    const db = getAgentsDb();

    // Single-use enforcement: delete the nonce row; if nothing was deleted the
    // URL was already used (or never registered → forged).
    const { data: consumed, error: nonceErr } = await db
      .from("export_url_nonces")
      .delete()
      .eq("token", token)
      .eq("organization_id", orgId)
      .eq("report_id", id)
      .eq("format", format)
      .select("token").maybeSingle();
    if (nonceErr) return errorPlainResponse("server_error", `nonce_delete_failed: ${nonceErr.message}`);
    if (!consumed) return errorPlainResponse("gone", "link_already_used");

    const { data: report } = await db
      .from("expense_reports").select("id, period_start, period_end, organization_id")
      .eq("id", id).eq("organization_id", orgId)
      .maybeSingle();
    if (!report) return errorPlainResponse("not_found", "report_not_found");

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

    // Best-effort sweep of expired nonces. Fire-and-forget — never block the
    // download on this.
    void db.rpc("sweep_expired_export_nonces").then(() => undefined, () => undefined);

    return new Response(body, {
      status: 200,
      headers: {
        "content-type": contentType,
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    return errorPlainResponse("server_error", e instanceof Error ? e.message : "unknown");
  }
}
