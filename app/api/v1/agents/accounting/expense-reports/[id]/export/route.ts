// POST /expense-reports/[id]/export
// Body: { format: 'quickbooks'|'xero'|'netsuite'|'csv' }
//
// Returns a signed, single-use download URL valid for 60 seconds. The URL
// points to /agents/accounting/reports/[id]/export/[format]?token=…&exp=…
// which is a server component that re-verifies + streams the bytes.

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { authenticate, unauthorized } from "../../../../_lib/auth";
import { getAgentsDb } from "@/lib/agents/supabase-client";
import { logEvent } from "@/lib/agents/audit-log";

interface RouteContext { params: Promise<{ id: string }> | { id: string }; }
const TTL_SECONDS = 60;
const VALID_FORMATS = ["quickbooks", "xero", "netsuite", "csv"] as const;

export async function POST(req: NextRequest, ctx: RouteContext) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();
  const { id } = await Promise.resolve(ctx.params);
  const body = await req.json().catch(() => ({}));
  const format = String(body?.format ?? "csv");
  if (!VALID_FORMATS.includes(format as typeof VALID_FORMATS[number])) {
    return NextResponse.json({ error: `format must be one of ${VALID_FORMATS.join(", ")}` }, { status: 400 });
  }

  const db = getAgentsDb();
  const { data: report } = await db
    .from("expense_reports").select("id, status")
    .eq("id", id).eq("organization_id", auth.organizationId)
    .maybeSingle();
  if (!report) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const secret = process.env.ZP_EXPORT_URL_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const expiresAt = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const payload = `${id}.${format}.${expiresAt}.${auth.organizationId}`;
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const url = `/agents/accounting/reports/${id}/export/${format}?token=${sig}&exp=${expiresAt}&o=${auth.organizationId}`;

  await logEvent({
    organizationId: auth.organizationId, actorType: "user",
    actorId: auth.userId ?? null,
    eventType: "expense_report.export_url_generated",
    payload: { report_id: id, format, expires_at: expiresAt },
  });
  return NextResponse.json({ url, expires_at: expiresAt, format });
}
