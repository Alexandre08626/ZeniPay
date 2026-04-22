// POST /expense-reports/[id]/export
// Body: { format: 'quickbooks'|'xero'|'netsuite'|'csv' }
//
// Mints a signed single-use download URL valid for 60 seconds. The token
// itself is an HMAC-SHA256 hex digest; we ALSO write it to
// agents.export_url_nonces so the download handler can enforce
// single-use (DELETE-on-consume → 410 Gone on re-use).

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { authenticate } from "../../../../_lib/auth";
import { errorResponse, serverError } from "@/app/api/v1/agents/accounting/_lib/errors";
import { getAgentsDb } from "@/lib/agents/supabase-client";
import { logEvent } from "@/lib/agents/audit-log";

interface RouteContext { params: Promise<{ id: string }> | { id: string }; }
const TTL_SECONDS = 60;
const VALID_FORMATS = ["quickbooks", "xero", "netsuite", "csv"] as const;
type Format = typeof VALID_FORMATS[number];

export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await authenticate(req);
    if (!auth) return errorResponse("unauthorized", "unauthorized");
    const { id } = await Promise.resolve(ctx.params);
    const body = await req.json().catch(() => ({}));
    const format = String(body?.format ?? "csv");
    if (!VALID_FORMATS.includes(format as Format)) {
      return errorResponse("bad_request", `format must be one of ${VALID_FORMATS.join(", ")}`);
    }

    const db = getAgentsDb();
    const { data: report } = await db
      .from("expense_reports").select("id, status")
      .eq("id", id).eq("organization_id", auth.organizationId)
      .maybeSingle();
    if (!report) return errorResponse("not_found", "report_not_found");

    const secret = process.env.ZP_EXPORT_URL_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    if (!secret) return errorResponse("server_error", "export_secret_missing");

    const expiresAtSec = Math.floor(Date.now() / 1000) + TTL_SECONDS;
    const payload = `${id}.${format}.${expiresAtSec}.${auth.organizationId}`;
    const token = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    const url = `/agents/accounting/reports/${id}/export/${format}?token=${token}&exp=${expiresAtSec}&o=${auth.organizationId}`;

    // Register the nonce so single-use enforcement kicks in.
    const expiresAtIso = new Date(expiresAtSec * 1000).toISOString();
    const { error: nonceErr } = await db
      .from("export_url_nonces")
      .insert({
        token,
        report_id: id,
        organization_id: auth.organizationId,
        format,
        expires_at: expiresAtIso,
        created_by: auth.userId ?? null,
      });
    if (nonceErr) return errorResponse("server_error", `nonce_insert_failed: ${nonceErr.message}`);

    await logEvent({
      organizationId: auth.organizationId, actorType: "user",
      actorId: auth.userId ?? null,
      eventType: "expense_report.export_url_generated",
      payload: { report_id: id, format, expires_at: expiresAtSec },
    });
    return NextResponse.json({ url, expires_at: expiresAtSec, format });
  } catch (e) { return serverError(e); }
}
