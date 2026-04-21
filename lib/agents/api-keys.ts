// API key lifecycle for the Agents product. Keys are:
//   - prefixed: zpk_test_ or zpk_live_
//   - issued once (returned in plaintext at creation)
//   - persisted as SHA-256 hex of the raw key; raw is never stored
//   - identified by a truncated display prefix (first 12 chars)

import { createHash, randomBytes } from "node:crypto";
import { getAgentsDb } from "./supabase-client";
import type { AgentApiKeyRow, Environment } from "./types";

export const DEFAULT_SCOPES = ["agents:read", "agents:write", "payments:authorize"] as const;

export interface CreateApiKeyInput {
  organizationId: string;
  environment: Environment;
  name?: string;
  scopes?: string[];
}

export interface CreateApiKeyResult {
  /** The only time the raw key is ever exposed. Show once. */
  rawKey: string;
  row: AgentApiKeyRow;
}

export async function createApiKey(input: CreateApiKeyInput): Promise<CreateApiKeyResult> {
  const rawKey = generateRawKey(input.environment);
  const keyHash = sha256Hex(rawKey);
  const keyPrefix = rawKey.slice(0, 12);

  const db = getAgentsDb();
  const { data, error } = await db
    .from("agent_api_keys")
    .insert({
      organization_id: input.organizationId,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      environment: input.environment,
      name: input.name ?? "default",
      scopes: input.scopes ?? [...DEFAULT_SCOPES],
    })
    .select()
    .single();
  if (error || !data) throw new Error(`api-keys: ${error?.message ?? "insert failed"}`);
  return { rawKey, row: data as AgentApiKeyRow };
}

export interface VerifyApiKeyResult {
  ok: true;
  organizationId: string;
  environment: Environment;
  scopes: string[];
  keyId: string;
}
export interface VerifyApiKeyFailure {
  ok: false;
  reason: "malformed" | "not_found" | "revoked";
}

export async function verifyApiKey(rawKey: string): Promise<VerifyApiKeyResult | VerifyApiKeyFailure> {
  if (!isWellFormed(rawKey)) return { ok: false, reason: "malformed" };
  const keyHash = sha256Hex(rawKey);

  const db = getAgentsDb();
  const { data, error } = await db
    .from("agent_api_keys")
    .select("id, organization_id, environment, scopes, revoked_at")
    .eq("key_hash", keyHash)
    .maybeSingle();
  if (error || !data) return { ok: false, reason: "not_found" };
  if (data.revoked_at) return { ok: false, reason: "revoked" };

  // Fire-and-forget last_used_at update; ignore errors.
  void db
    .from("agent_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return {
    ok: true,
    keyId: data.id,
    organizationId: data.organization_id,
    environment: data.environment,
    scopes: (data.scopes as string[]) ?? [],
  };
}

export async function revokeApiKey(keyId: string): Promise<void> {
  const db = getAgentsDb();
  const { error } = await db
    .from("agent_api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId);
  if (error) throw new Error(`api-keys: revoke failed: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Pure helpers (unit-testable without DB).
// ---------------------------------------------------------------------------

export function generateRawKey(env: Environment): string {
  // 32 hex chars = 128 bits of entropy. Prefix is zpk_test_ (9) or zpk_live_ (9).
  const body = randomBytes(16).toString("hex");
  return `zpk_${env}_${body}`;
}

export function sha256Hex(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function isWellFormed(raw: string): boolean {
  return /^zpk_(test|live)_[0-9a-f]{32}$/.test(raw);
}
