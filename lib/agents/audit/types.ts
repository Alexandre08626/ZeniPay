// Types for the SOC2 audit export module.
//
// An AuditExport ships as NDJSON-style lines so large exports stream to the
// client without loading the full row set in memory. The LAST line is
// always a `trailer` object carrying the Merkle root + Ed25519 signature
// over a canonical subset of the manifest. Auditors verify by:
//   1. Re-hashing every entry line in file order.
//   2. Recomputing the Merkle root from those hashes.
//   3. Comparing against trailer.merkle_root_hex.
//   4. Fetching the public key from /.well-known/audit-signing-key.pub.
//   5. Verifying trailer.signature_b64 over canonical(trailer minus signature).

export interface AuditEntry {
  id: string;
  organization_id: string;
  actor_type: "user" | "agent" | "system" | "api_key";
  actor_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface MerkleProofStep {
  hash_hex: string;
  side: "L" | "R";         // does the sibling sit to our LEFT or RIGHT?
}

export interface MerkleProof {
  row_index: number;
  entry_id: string;
  leaf_hash_hex: string;
  proof: MerkleProofStep[];
}

/** The trailer is the only signed portion. signature_b64 is an Ed25519
 *  signature over canonical-json(signed_manifest) where signed_manifest =
 *  {key_id, organization_id|null, scope, window_start, window_end,
 *  row_count, merkle_root_hex, generated_at, format_version}. */
export interface AuditExportTrailer {
  format_version: "1";
  key_id: string;                  // e.g. "zp_audit_v1"
  organization_id: string | null;  // null = "all" scope
  scope: "all" | "organization" | "agent" | "card";
  scope_ref: string | null;
  window_start: string;
  window_end: string;
  row_count: number;
  merkle_root_hex: string;
  generated_at: string;
  signature_b64: string;
}

/** Matches the signed manifest — the exact shape the signer canonicalises
 *  and the verifier must reproduce. Do not rearrange fields without updating
 *  the canonicaliser AND the published auditor guide. */
export type SignedManifest = Omit<AuditExportTrailer, "signature_b64">;

export interface AuditExportOptions {
  organization_id: string | null;  // null → "all" (service-role / ZeniPay internal only)
  scope: "all" | "organization" | "agent" | "card";
  scope_ref: string | null;        // agent/card id when scope is agent/card
  start: string;                   // ISO
  end: string;                     // ISO
  include_merkle_proofs: boolean;
  key_id?: string;                 // defaults to the current active key
}

export interface SignatureEnvelope {
  key_id: string;
  signature_b64: string;
  public_key_pem: string;          // included for offline convenience; auditor should still fetch from /.well-known
}
