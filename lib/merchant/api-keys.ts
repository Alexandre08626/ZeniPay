// PR 17 — merchant-scoped API key verification + creation.
//
// Keys are SHA-256 hashed at rest; the plaintext is returned once at
// creation time and never stored. A key has a prefix (zpk_live_ /
// zpk_test_) for quick identification, and a permissions array that
// routes can enforce.
//
// Routes that accept Bearer zpk_live_... keys call `verifyMerchantApiKey`
// and either receive a `{ ok: true, merchant_id, key_id, permissions }`
// result or a short `{ ok: false }` to 401.

import { createHash, randomBytes } from "node:crypto";
import { getSupabaseAdmin } from "@/modules/zenipay/services/supabase";

export type KeyEnv = "live" | "test";
export type KeyPermission = "read" | "write" | "admin";

export interface VerifyResult {
  ok: true;
  merchant_id: string;
  key_id: string;
  permissions: KeyPermission[];
  environment: KeyEnv;
}
export interface VerifyFailure {
  ok: false;
  reason: "missing" | "invalid" | "expired" | "revoked";
}

export function sha256(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function generateRaw(env: KeyEnv): string {
  const body = randomBytes(24).toString("hex");
  return `zpk_${env}_${body}`;
}

export async function createMerchantApiKey(params: {
  merchant_id: string;
  name: string;
  environment: KeyEnv;
  permissions: KeyPermission[];
}): Promise<{ id: string; name: string; prefix: string; raw: string }> {
  const raw = generateRaw(params.environment);
  const prefix = raw.slice(0, 14); // zpk_live_xxxxx
  const id = `ak_${randomBytes(12).toString("hex")}`;

  const { error } = await getSupabaseAdmin().from("zenipay_api_keys").insert({
    id,
    merchant_id: params.merchant_id,
    name: params.name,
    key_prefix: prefix,
    key_hash: sha256(raw),
    permissions: params.permissions,
    is_active: true,
    created_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);

  return { id, name: params.name, prefix, raw };
}

export async function verifyMerchantApiKey(raw: string): Promise<VerifyResult | VerifyFailure> {
  if (!raw || !raw.startsWith("zpk_")) return { ok: false, reason: "missing" };
  const env: KeyEnv = raw.startsWith("zpk_live_") ? "live" : raw.startsWith("zpk_test_") ? "test" : "live";
  const hash = sha256(raw);
  const { data } = await getSupabaseAdmin()
    .from("zenipay_api_keys")
    .select("id, merchant_id, permissions, is_active, expires_at")
    .eq("key_hash", hash)
    .maybeSingle();
  if (!data) return { ok: false, reason: "invalid" };
  if (!data.is_active) return { ok: false, reason: "revoked" };
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return { ok: false, reason: "expired" };

  // Update last_used_at without awaiting — a best-effort fire-and-forget.
  void getSupabaseAdmin().from("zenipay_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);

  return {
    ok: true,
    merchant_id: data.merchant_id,
    key_id: data.id,
    permissions: (data.permissions as KeyPermission[]) ?? [],
    environment: env,
  };
}

export async function revokeMerchantApiKey(keyId: string, merchantId: string): Promise<void> {
  await getSupabaseAdmin()
    .from("zenipay_api_keys")
    .update({ is_active: false })
    .eq("id", keyId)
    .eq("merchant_id", merchantId);
}

export async function logApiUsage(row: {
  api_key_id: string;
  merchant_id: string;
  endpoint: string;
  method: string;
  status_code: number;
  response_ms: number;
}): Promise<void> {
  try {
    await getSupabaseAdmin().from("zenipay_api_usage").insert({
      id: `use_${randomBytes(12).toString("hex")}`,
      ...row,
      created_at: new Date().toISOString(),
    });
  } catch { /* non-critical */ }
}
