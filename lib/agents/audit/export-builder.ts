// Streaming NDJSON audit export.
//
// The HTTP route turns the returned ReadableStream into a Response body;
// we never load the full entry set in memory. Only the leaf HASHES live in
// memory during the stream (32 bytes each × N rows), which lets us compute
// the Merkle root and sign the trailer AFTER the last entry has been sent.
//
// Layout (per line):
//   {"header": {...}}
//   {"entry": {...}}
//   {"entry": {...}}
//   …
//   {"merkle_proofs": [...]}     // optional, only if include_merkle_proofs=true
//   {"trailer": {...}}            // required — carries root + signature
//
// The trailer is signed by the currently active global key (DECISION 1).
// Auditors verify by re-hashing every `entry` line, rebuilding the tree
// from those leaves, comparing the recomputed root against
// trailer.merkle_root_hex, then verifying trailer.signature_b64 with the
// public key fetched from /.well-known/audit-signing-key.pub.

import { getAgentsDb } from "../supabase-client";
import { signManifest, loadActiveKey } from "./ed25519-signer";
import { hashLeaf, buildTree, buildAllProofs } from "./merkle-tree";
import type {
  AuditEntry, AuditExportOptions, AuditExportTrailer, SignedManifest, MerkleProof,
} from "./types";

const PAGE_SIZE = 1000;

export interface ExportSummary {
  row_count: number;
  merkle_root_hex: string;
  key_id: string;
  signature_b64: string;
  bytes_written: number;
}

/** Returns a ReadableStream<Uint8Array> suitable for Response(body). The
 *  second returned value is a Promise that resolves with the summary once
 *  the last byte has been written — used by the route handler to write an
 *  audit_export_runs row. */
export function buildAuditExport(opts: AuditExportOptions): { stream: ReadableStream<Uint8Array>; summary: Promise<ExportSummary> } {
  let resolveSummary!: (s: ExportSummary) => void;
  let rejectSummary!: (e: Error) => void;
  const summary = new Promise<ExportSummary>((resolve, reject) => {
    resolveSummary = resolve; rejectSummary = reject;
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const te = new TextEncoder();
      const writeLine = (obj: Record<string, unknown>): number => {
        const line = JSON.stringify(obj) + "\n";
        const bytes = te.encode(line);
        controller.enqueue(bytes);
        return bytes.byteLength;
      };

      try {
        const key = await loadActiveKey();
        const keyId = opts.key_id ?? key.row.key_id;
        let bytesWritten = 0;
        const startedAt = new Date().toISOString();

        bytesWritten += writeLine({
          header: {
            format_version: "1",
            key_id: keyId,
            organization_id: opts.organization_id,
            scope: opts.scope,
            scope_ref: opts.scope_ref,
            window_start: opts.start,
            window_end: opts.end,
            generated_at: startedAt,
          },
        });

        const leafHashes: Buffer[] = [];
        const allEntries: AuditEntry[] = [];   // only retained when include_merkle_proofs=true
        let rowCount = 0;

        for await (const entry of streamEntries(opts)) {
          const h = hashLeaf(entry);
          leafHashes.push(h);
          if (opts.include_merkle_proofs) allEntries.push(entry);
          rowCount += 1;
          bytesWritten += writeLine({ entry });
        }

        const { root, layers } = buildTree(leafHashes);
        const merkleRootHex = root.toString("hex");

        if (opts.include_merkle_proofs) {
          const proofs: MerkleProof[] = buildAllProofs(allEntries, leafHashes, layers);
          bytesWritten += writeLine({ merkle_proofs: proofs });
        }

        const manifest: SignedManifest = {
          format_version: "1",
          key_id: keyId,
          organization_id: opts.organization_id,
          scope: opts.scope,
          scope_ref: opts.scope_ref,
          window_start: opts.start,
          window_end: opts.end,
          row_count: rowCount,
          merkle_root_hex: merkleRootHex,
          generated_at: startedAt,
        };
        const { signature_b64 } = await signManifest(manifest);
        const trailer: AuditExportTrailer = { ...manifest, signature_b64 };
        bytesWritten += writeLine({ trailer });

        controller.close();
        resolveSummary({
          row_count: rowCount,
          merkle_root_hex: merkleRootHex,
          key_id: keyId,
          signature_b64,
          bytes_written: bytesWritten,
        });
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        controller.error(err);
        rejectSummary(err);
      }
    },
  });

  return { stream, summary };
}

/** Cursor-paginated iterator over agent_audit_log — keeps memory flat. The
 *  scope filter applies WHERE organization_id IS/NOT NULL + optional agent/card
 *  filter via the payload JSONB (denormalised). */
async function* streamEntries(opts: AuditExportOptions): AsyncGenerator<AuditEntry, void, unknown> {
  const db = getAgentsDb();
  let cursor: { created_at: string; id: string } | null = null;

  while (true) {
    let q = db
      .from("agent_audit_log")
      .select("id, organization_id, actor_type, actor_id, event_type, payload, created_at")
      .gte("created_at", opts.start)
      .lte("created_at", opts.end)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(PAGE_SIZE);

    if (opts.organization_id) q = q.eq("organization_id", opts.organization_id);
    if (cursor) {
      q = q.or(`created_at.gt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.gt.${cursor.id})`);
    }

    const { data, error } = await q;
    if (error) throw new Error(`audit_export.stream: ${error.message}`);
    const rows = (data ?? []) as AuditEntry[];
    if (rows.length === 0) return;

    // Agent/card scope filtering happens in-JS against payload because the
    // audit log doesn't have dedicated columns — keeps the SQL simple and
    // the filter fast enough at PAGE_SIZE.
    const filtered = rows.filter((r) => matchesScope(r, opts));
    for (const r of filtered) yield r;

    const last = rows[rows.length - 1];
    if (rows.length < PAGE_SIZE) return;
    cursor = { created_at: last.created_at, id: last.id };
  }
}

function matchesScope(e: AuditEntry, opts: AuditExportOptions): boolean {
  if (opts.scope === "all" || opts.scope === "organization") return true;
  const p = e.payload ?? {};
  if (opts.scope === "agent") {
    return p["agent_id"] === opts.scope_ref;
  }
  if (opts.scope === "card") {
    return p["card_id"] === opts.scope_ref || p["card_auth_id"] === opts.scope_ref;
  }
  return true;
}
