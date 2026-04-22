// Pure Merkle tree over audit entries. SHA-256 throughout — ubiquitous,
// cheap, supported everywhere an auditor might run verification.
//
// Leaf hash:    SHA-256(canonical_json(entry))
// Internal:     SHA-256(left_hash || right_hash)           (bytes concat)
// Odd count:    the last unpaired node is promoted up a level unchanged
//               (the "Bitcoin / OpenSSL-classic" duplication-free rule).
//               We do NOT duplicate — it opens up proof-ambiguity attacks.
//
// This module is intentionally reachable from the browser: both the audit
// export route (server) and a future auditor-side verifier (Node CLI or
// web page) use the same functions. No DB, no fetch, no side effects.

import { createHash } from "node:crypto";
import type { AuditEntry, MerkleProof, MerkleProofStep } from "./types";

export function canonicalEntry(e: AuditEntry): string {
  // Sort top-level keys alphabetically. Payload stays as-is (it's already
  // JSONB-stable from Postgres). If in the future callers need per-payload
  // canonicalisation we can sort recursively — for now the auditor guide
  // documents: "use the entry exactly as it appears in the NDJSON line".
  return JSON.stringify(e, Object.keys(e).sort());
}

export function hashLeaf(e: AuditEntry): Buffer {
  return sha256(Buffer.from(canonicalEntry(e), "utf8"));
}

export function hashInternal(left: Buffer, right: Buffer): Buffer {
  return sha256(Buffer.concat([left, right]));
}

function sha256(b: Buffer): Buffer {
  return createHash("sha256").update(b).digest();
}

/** Build the full tree, returning the root hex digest and the layered
 *  hash lists (leaves at layer 0, root at top). */
export function buildTree(leafHashes: Buffer[]): { root: Buffer; layers: Buffer[][] } {
  if (leafHashes.length === 0) {
    // Empty tree — root is SHA-256(""). Auditor convention, unambiguous.
    return { root: sha256(Buffer.alloc(0)), layers: [[]] };
  }
  const layers: Buffer[][] = [leafHashes.slice()];
  while (layers[layers.length - 1].length > 1) {
    const cur = layers[layers.length - 1];
    const next: Buffer[] = [];
    for (let i = 0; i < cur.length; i += 2) {
      if (i + 1 < cur.length) {
        next.push(hashInternal(cur[i], cur[i + 1]));
      } else {
        // Promote the unpaired node upward unchanged.
        next.push(cur[i]);
      }
    }
    layers.push(next);
  }
  return { root: layers[layers.length - 1][0], layers };
}

/** Generate the sibling-path proof for leaf at `rowIndex`. The proof is
 *  ordered bottom-up: proof[0] sits beside the leaf, proof[n-1] beside the
 *  root's child. */
export function buildProof(layers: Buffer[][], rowIndex: number): MerkleProofStep[] {
  const proof: MerkleProofStep[] = [];
  let idx = rowIndex;
  for (let layer = 0; layer < layers.length - 1; layer++) {
    const cur = layers[layer];
    const isRight = idx % 2 === 1;
    const siblingIdx = isRight ? idx - 1 : idx + 1;
    if (siblingIdx < cur.length) {
      proof.push({
        hash_hex: cur[siblingIdx].toString("hex"),
        side: isRight ? "L" : "R",
      });
    }
    // Unpaired nodes (siblingIdx >= cur.length) don't contribute — their
    // promoted value is implicit. The verifier handles this by accepting
    // that "no sibling" steps are skipped.
    idx = Math.floor(idx / 2);
  }
  return proof;
}

/** Verify a proof: re-derive the root by hashing up from the leaf. */
export function verifyProof(leafHex: string, proof: MerkleProofStep[], expectedRootHex: string): boolean {
  let cur: Buffer = Buffer.from(leafHex, "hex");
  for (const step of proof) {
    const sibling: Buffer = Buffer.from(step.hash_hex, "hex");
    cur = step.side === "L"
      ? hashInternal(sibling, cur)
      : hashInternal(cur, sibling);
  }
  return cur.toString("hex") === expectedRootHex;
}

/** Convenience: generate the full MerkleProof list for every entry. Used by
 *  export_builder when include_merkle_proofs=true. */
export function buildAllProofs(entries: AuditEntry[], leafHashes: Buffer[], layers: Buffer[][]): MerkleProof[] {
  return entries.map((e, i) => ({
    row_index: i,
    entry_id: e.id,
    leaf_hash_hex: leafHashes[i].toString("hex"),
    proof: buildProof(layers, i),
  }));
}
