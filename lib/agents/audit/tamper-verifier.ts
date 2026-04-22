// Pure, offline verifier that an external auditor can import directly —
// NO database reads, NO network calls, NO filesystem side effects.
// Given the raw NDJSON text + the public key PEM, it returns a complete
// verdict including per-row hash diagnostics.
//
// This is the MOST security-critical file in this PR. Changes MUST be
// accompanied by fresh test fixtures + the corresponding AUDITOR_GUIDE.md
// section being rewritten.

import { canonicalEntry, hashLeaf, buildTree, verifyProof } from "./merkle-tree";
import { canonicalSignedManifest, pemToBase64Raw } from "./ed25519-signer";
import { verify as rawVerify } from "../crypto";
import type { AuditEntry, AuditExportTrailer, MerkleProof } from "./types";

export interface VerificationOutcome {
  ok: boolean;
  row_count_declared: number;
  row_count_parsed: number;
  merkle_root_declared: string;
  merkle_root_recomputed: string;
  signature_valid: boolean;
  errors: string[];
  warnings: string[];
}

/** Entry point. Accepts the NDJSON text and the PEM-encoded public key. */
export async function verifyAuditExport(ndjson: string, publicKeyPem: string): Promise<VerificationOutcome> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // --- 1. Parse the NDJSON into its structural parts -----------------------
  const lines = ndjson.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    errors.push("parse: export has fewer than 2 lines (need at least header + trailer)");
    return failed(errors, warnings);
  }

  let header: Record<string, unknown> | null = null;
  let trailer: AuditExportTrailer | null = null;
  let proofsLine: { merkle_proofs: MerkleProof[] } | null = null;
  const entries: AuditEntry[] = [];

  for (const line of lines) {
    let obj: unknown;
    try { obj = JSON.parse(line); } catch (e) {
      errors.push(`parse: invalid JSON line: ${(e as Error).message}`);
      return failed(errors, warnings);
    }
    if (!obj || typeof obj !== "object") { errors.push("parse: non-object line"); continue; }
    const o = obj as Record<string, unknown>;
    if ("header" in o) header = o.header as Record<string, unknown>;
    else if ("entry" in o) entries.push(o.entry as AuditEntry);
    else if ("merkle_proofs" in o) proofsLine = o as { merkle_proofs: MerkleProof[] };
    else if ("trailer" in o) trailer = o.trailer as AuditExportTrailer;
    else warnings.push("parse: unknown line shape, ignoring");
  }

  if (!header) errors.push("parse: missing header line");
  if (!trailer) errors.push("parse: missing trailer line");
  if (errors.length > 0) return failed(errors, warnings);

  // --- 2. Row count check -------------------------------------------------
  const declaredRowCount = trailer!.row_count;
  const parsedRowCount = entries.length;
  if (declaredRowCount !== parsedRowCount) {
    errors.push(`row_count: trailer declares ${declaredRowCount}, parsed ${parsedRowCount}`);
  }

  // --- 3. Recompute Merkle root from entries ------------------------------
  const leafHashes = entries.map((e) => hashLeaf(e));
  const { root, layers } = buildTree(leafHashes);
  const recomputedHex = root.toString("hex");
  if (recomputedHex !== trailer!.merkle_root_hex) {
    errors.push(`merkle_root: declared ${trailer!.merkle_root_hex}, recomputed ${recomputedHex}`);
  }

  // --- 4. Verify per-row proofs (optional block) --------------------------
  if (proofsLine) {
    const proofs = proofsLine.merkle_proofs;
    if (proofs.length !== entries.length) {
      warnings.push(`merkle_proofs: count mismatch (proofs=${proofs.length}, entries=${entries.length})`);
    }
    for (const p of proofs) {
      const expectedLeaf = leafHashes[p.row_index];
      if (!expectedLeaf) { errors.push(`merkle_proofs: row_index ${p.row_index} out of range`); continue; }
      if (expectedLeaf.toString("hex") !== p.leaf_hash_hex) {
        errors.push(`merkle_proofs: leaf_hash mismatch at row ${p.row_index}`);
      }
      if (!verifyProof(p.leaf_hash_hex, p.proof, trailer!.merkle_root_hex)) {
        errors.push(`merkle_proofs: proof verification failed at row ${p.row_index}`);
      }
    }
  }

  // --- 5. Verify Ed25519 signature over the canonical trailer manifest ---
  const { signature_b64, ...manifest } = trailer!;
  const canonical = canonicalSignedManifest(manifest);
  const rawPub = pemToBase64Raw(publicKeyPem);
  const signature_valid = await rawVerify(signature_b64, canonical, rawPub);
  if (!signature_valid) errors.push("signature: Ed25519 verification failed");

  // Suppress unused-layers warning for future debugging extensions.
  void canonicalEntry; void layers;

  return {
    ok: errors.length === 0,
    row_count_declared: declaredRowCount,
    row_count_parsed: parsedRowCount,
    merkle_root_declared: trailer!.merkle_root_hex,
    merkle_root_recomputed: recomputedHex,
    signature_valid,
    errors,
    warnings,
  };
}

function failed(errors: string[], warnings: string[]): VerificationOutcome {
  return {
    ok: false,
    row_count_declared: 0,
    row_count_parsed: 0,
    merkle_root_declared: "",
    merkle_root_recomputed: "",
    signature_valid: false,
    errors, warnings,
  };
}
