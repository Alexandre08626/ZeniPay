// Ed25519 signer for audit-export manifests. Global signing key model
// (DECISION 1): one active keypair at a time, private half in Supabase
// Vault, public half in agents.zp_audit_keys.public_key_pem AND in the
// committed static file at public/.well-known/audit-signing-key.pub.
//
// Rotation model: at rotation time we insert a NEW row with retired_at
// NULL and set retired_at = NOW() on the previous row. New exports sign
// with the newest active key; historical verification still works because
// the old public key stays in the table and in the commit history of the
// static file.
//
// This module signs the CANONICAL JSON of the signed-manifest subset of
// the trailer (no signature_b64 field inside what gets signed — classical
// self-reference avoidance).

import { createPublicKey, createPrivateKey } from "node:crypto";
import { sign as rawSign, verify as rawVerify } from "../crypto";
import { getAgentsDb } from "../supabase-client";
import { readSecret } from "../approvals/vault-secrets";
import type { SignedManifest } from "./types";

export const ACTIVE_KEY_CACHE_MS = 60_000;

interface ActiveKeyRow {
  key_id: string;
  public_key_pem: string;
  vault_secret_id: string;
  created_at: string;
  retired_at: string | null;
}

interface CachedKey {
  row: ActiveKeyRow;
  private_key_base64: string;
  loadedAt: number;
}

let _cache: CachedKey | null = null;

/** Load the currently active signing key (retired_at IS NULL). Caches the
 *  decrypted private key for 60s — the audit export route may sign several
 *  manifests in a row. */
export async function loadActiveKey(): Promise<CachedKey> {
  if (_cache && Date.now() - _cache.loadedAt < ACTIVE_KEY_CACHE_MS) return _cache;
  const db = getAgentsDb();
  const { data, error } = await db
    .from("zp_audit_keys")
    .select("key_id, public_key_pem, vault_secret_id, created_at, retired_at")
    .is("retired_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`zp_audit_keys.select: ${error.message}`);
  if (!data) throw new Error("zp_audit_keys: no active signing key — run scripts/bootstrap-audit-signing-key.ts");
  const row = data as ActiveKeyRow;
  const private_key_base64 = await readSecret(row.vault_secret_id);
  _cache = { row, private_key_base64, loadedAt: Date.now() };
  return _cache;
}

/** Resolve a historical key by id — for verifying old exports after rotation. */
export async function loadKeyById(keyId: string): Promise<ActiveKeyRow | null> {
  const db = getAgentsDb();
  const { data } = await db
    .from("zp_audit_keys")
    .select("key_id, public_key_pem, vault_secret_id, created_at, retired_at")
    .eq("key_id", keyId)
    .maybeSingle();
  return (data as ActiveKeyRow) ?? null;
}

/** Canonicalise + sign a SignedManifest. Returns { signature_b64, key_id }. */
export async function signManifest(manifest: SignedManifest): Promise<{ signature_b64: string; key_id: string }> {
  const key = await loadActiveKey();
  // Key consistency — the manifest SAYS this key_id, so refuse if we're
  // about to sign with a different key.
  if (manifest.key_id !== key.row.key_id) {
    throw new Error(`signManifest: manifest.key_id=${manifest.key_id} but active=${key.row.key_id}`);
  }
  const canonical = canonicalSignedManifest(manifest);
  const signature_b64 = await rawSign(canonical, key.private_key_base64);
  return { signature_b64, key_id: key.row.key_id };
}

/** Offline verification — given a manifest + signature + pubkey PEM. Used
 *  by the tamper-verifier and also directly from auditor code. */
export async function verifyManifest(manifest: SignedManifest, signature_b64: string, publicKeyPem: string): Promise<boolean> {
  const raw = pemToBase64Raw(publicKeyPem);
  const canonical = canonicalSignedManifest(manifest);
  return rawVerify(signature_b64, canonical, raw);
}

/** Deterministic JSON serialization. Keys sorted alphabetically at the top
 *  level (SignedManifest is flat — no nested objects to recurse into). */
export function canonicalSignedManifest(m: SignedManifest): string {
  const keys = Object.keys(m).sort();
  const out: Record<string, unknown> = {};
  for (const k of keys) out[k] = (m as unknown as Record<string, unknown>)[k];
  return JSON.stringify(out);
}

// ---------------------------------------------------------------------------
// PEM helpers
// ---------------------------------------------------------------------------

/** Convert a 32-byte raw Ed25519 public key (base64) into a PEM-encoded
 *  SubjectPublicKeyInfo — the format auditors expect. Hand-build the DER
 *  (RFC 8410) so we don't depend on node-version-specific raw-key shortcuts. */
export function rawPublicKeyToPem(rawBase64: string): string {
  const raw = Buffer.from(rawBase64, "base64");
  if (raw.length !== 32) throw new Error(`rawPublicKeyToPem: expected 32 bytes, got ${raw.length}`);
  const der = buildEd25519Spki(raw);
  const keyObj = createPublicKey({ key: der, format: "der", type: "spki" });
  return keyObj.export({ type: "spki", format: "pem" }) as string;
}

/** SEQUENCE(SEQUENCE(OID 1.3.101.112), BIT STRING(0x00 || raw32)). */
function buildEd25519Spki(raw32: Buffer): Buffer {
  const prefix = Buffer.from("302a300506032b6570032100", "hex");
  return Buffer.concat([prefix, raw32]);
}

/** PEM → 32-byte raw pubkey (base64). */
export function pemToBase64Raw(pem: string): string {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const der = Buffer.from(b64, "base64");
  // Slice off the 12-byte SPKI prefix; what remains is the 32-byte key.
  if (der.length < 32) throw new Error("pemToBase64Raw: PEM too short");
  const raw = der.slice(der.length - 32);
  return Buffer.from(raw).toString("base64");
}

/** Convert a 32-byte raw Ed25519 private seed (base64) into PEM. Used by
 *  the bootstrap script so the operator can keep an offline backup. */
export function rawPrivateKeyToPem(rawBase64: string): string {
  const raw = Buffer.from(rawBase64, "base64");
  if (raw.length !== 32) throw new Error(`rawPrivateKeyToPem: expected 32 bytes, got ${raw.length}`);
  // PKCS#8 prefix for Ed25519: 302e020100300506032b657004220420
  const prefix = Buffer.from("302e020100300506032b657004220420", "hex");
  const der = Buffer.concat([prefix, raw]);
  const obj = createPrivateKey({ key: der, format: "der", type: "pkcs8" });
  return obj.export({ type: "pkcs8", format: "pem" }) as string;
}

/** Test helper — resets the cache. Not exported from the barrel. */
export function _resetKeyCacheForTests(): void { _cache = null; }
