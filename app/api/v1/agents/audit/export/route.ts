// POST /api/v1/agents/audit/export
//
// Body: {
//   start: ISO datetime, end: ISO datetime,           // required
//   scope: 'all' | 'organization' | 'agent' | 'card', // defaults to 'organization'
//   scope_ref: string,                                 // required when scope=agent|card
//   include_merkle_proofs: boolean,                    // defaults to false (smaller exports)
// }
//
// Returns an NDJSON stream (application/x-ndjson) with a signed trailer.
// The route also writes one agents.audit_export_runs row AFTER the stream
// completes — i.e. after signature_b64 + row_count are known.
//
// Scope guards:
//   - 'all' requires explicit ZP_AUDIT_ALLOW_ALL_SCOPE=1 env var — reserved
//     for ZeniPay internal audits. Org users get 403 if they request it.
//   - 'organization' / 'agent' / 'card' all scope to auth.organizationId.

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { authenticate } from "../../_lib/auth";
import { errorPlainResponse } from "../../_lib/errors";
import { buildAuditExport } from "@/lib/agents/audit/export-builder";
import { getAgentsDb } from "@/lib/agents/supabase-client";
import { logEvent } from "@/lib/agents/audit-log";
import type { AuditExportOptions } from "@/lib/agents/audit/types";

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return errorPlainResponse("unauthorized", "unauthorized");

  let body: Record<string, unknown>;
  try { body = (await req.json()) as Record<string, unknown>; }
  catch { return errorPlainResponse("bad_request", "body must be JSON"); }

  const start = String(body?.start ?? "");
  const end   = String(body?.end ?? "");
  if (!start || !end) return errorPlainResponse("bad_request", "start + end required (ISO datetime)");
  if (new Date(end) < new Date(start)) return errorPlainResponse("bad_request", "end must be >= start");

  const scope = String(body?.scope ?? "organization") as AuditExportOptions["scope"];
  if (!["all", "organization", "agent", "card"].includes(scope)) {
    return errorPlainResponse("bad_request", "scope must be all|organization|agent|card");
  }
  if (scope === "all" && process.env.ZP_AUDIT_ALLOW_ALL_SCOPE !== "1") {
    return errorPlainResponse("forbidden", "scope=all requires ZP_AUDIT_ALLOW_ALL_SCOPE");
  }
  const scope_ref = body?.scope_ref ? String(body.scope_ref) : null;
  if ((scope === "agent" || scope === "card") && !scope_ref) {
    return errorPlainResponse("bad_request", `scope=${scope} requires scope_ref`);
  }
  const include_merkle_proofs = Boolean(body?.include_merkle_proofs ?? false);

  const opts: AuditExportOptions = {
    organization_id: scope === "all" ? null : auth.organizationId,
    scope, scope_ref,
    start, end,
    include_merkle_proofs,
  };

  const { stream, summary } = buildAuditExport(opts);

  // Persist the run row in the background — does NOT block the stream.
  void summary.then(async (s) => {
    try {
      const db = getAgentsDb();
      await db.from("audit_export_runs").insert({
        organization_id: opts.organization_id,
        scope: opts.scope,
        scope_ref: opts.scope_ref,
        window_start: opts.start,
        window_end: opts.end,
        row_count: s.row_count,
        bytes_written: s.bytes_written,
        merkle_root_hex: s.merkle_root_hex,
        key_id: s.key_id,
        signature_b64: s.signature_b64,
        include_merkle_proofs: opts.include_merkle_proofs,
        requested_by: auth.userId ?? null,
      });
      await logEvent({
        organizationId: auth.organizationId,
        actorType: auth.via === "api_key" ? "api_key" : "user",
        actorId: auth.apiKeyId ?? auth.userId ?? null,
        eventType: "audit_export.completed",
        payload: {
          scope: opts.scope,
          scope_ref: opts.scope_ref,
          window_start: opts.start,
          window_end: opts.end,
          row_count: s.row_count,
          bytes_written: s.bytes_written,
          merkle_root_hex: s.merkle_root_hex,
          key_id: s.key_id,
          include_merkle_proofs: opts.include_merkle_proofs,
        },
      });
    } catch {
      // Swallow — the export bytes already went to the client. A failure
      // to write the run row is a tracking issue, not a correctness one.
    }
  }, () => {/* stream errored; nothing to record */ });

  const filename = buildFilename(opts);
  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
      "x-zp-audit-format-version": "1",
    },
  });
}

function buildFilename(opts: AuditExportOptions): string {
  const s = opts.start.replace(/[:]/g, "-").slice(0, 19);
  const e = opts.end.replace(/[:]/g, "-").slice(0, 19);
  const tag = opts.scope === "all" ? "all"
            : opts.scope === "organization" ? opts.organization_id
            : `${opts.scope}_${opts.scope_ref}`;
  return `zenipay_audit_${tag}_${s}_to_${e}.ndjson`;
}
