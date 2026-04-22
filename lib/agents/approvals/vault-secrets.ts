// Supabase Vault wrapper for user_approval_secrets.
//
// The flow for TOTP enrollment:
//   1. server: generateSecret() -> 20-byte base32
//   2. server: INSERT into vault.secrets (returns a UUID)
//   3. server: UPSERT into agents.user_approval_secrets with vault_secret_id
//   4. server: returns provisioningUri + the plaintext secret ONCE to the
//              client so the user can scan the QR / paste the seed.
//   5. client: proves ownership by submitting a code via POST /verify.
//
// At verify time:
//   1. server: SELECT vault_secret_id FROM user_approval_secrets
//   2. server: SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = ...
//   3. server: totp.verifyCode(decrypted, user_submitted_code)
//
// The raw secret NEVER lives in our columns; it's symmetrically encrypted
// at rest by Vault (AES-256-GCM).

import { getAgentsDb } from "../supabase-client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _publicDb: SupabaseClient | null = null;
function getPublicDb(): SupabaseClient {
  if (_publicDb) return _publicDb;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("supabase env missing for vault access");
  // Vault lives in the `vault` schema; we talk to it via RPC functions
  // exposed in public for convenience. Use default schema client.
  _publicDb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return _publicDb;
}

export interface StoreSecretResult {
  vault_secret_id: string;
}

/** Insert a secret into Vault and return its id. */
export async function storeSecret(plaintext: string, name: string, description?: string): Promise<StoreSecretResult> {
  const db = getPublicDb();
  // supabase_vault exposes vault.create_secret(secret, name, description) RPC.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any).schema("vault").rpc("create_secret", {
    new_secret: plaintext,
    new_name: name,
    new_description: description ?? "",
  });
  if (error) throw new Error(`vault.create_secret failed: ${error.message}`);
  return { vault_secret_id: String(data) };
}

/** Decrypt a Vault secret by id. Service-role only. */
export async function readSecret(vaultSecretId: string): Promise<string> {
  const db = getPublicDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .schema("vault")
    .from("decrypted_secrets")
    .select("decrypted_secret")
    .eq("id", vaultSecretId)
    .maybeSingle();
  if (error) throw new Error(`vault.decrypted_secrets read failed: ${error.message}`);
  if (!data) throw new Error(`vault secret ${vaultSecretId} not found`);
  return String((data as { decrypted_secret: string }).decrypted_secret);
}

/** Register (or rotate) a user's TOTP secret. Writes to vault + pointer row. */
export async function enrollUserTotp(params: { userId: string; plaintextSecret: string }): Promise<{ vault_secret_id: string }> {
  const { vault_secret_id } = await storeSecret(
    params.plaintextSecret,
    `agents_totp_${params.userId}`,
    "ZeniPay Agents — TOTP seed",
  );
  const agentsDb = getAgentsDb();
  const { error } = await agentsDb
    .from("user_approval_secrets")
    .upsert(
      { user_id: params.userId, vault_secret_id, rotated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  if (error) throw new Error(`user_approval_secrets upsert failed: ${error.message}`);
  return { vault_secret_id };
}

/** Fetch & decrypt a user's current TOTP secret. Returns null if not enrolled. */
export async function readUserTotpSecret(userId: string): Promise<string | null> {
  const agentsDb = getAgentsDb();
  const { data } = await agentsDb
    .from("user_approval_secrets")
    .select("vault_secret_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  const vaultSecretId = (data as { vault_secret_id: string }).vault_secret_id;
  return readSecret(vaultSecretId);
}
