// Pay-link hooks: what a merchant's server asked us to remember when it created the link
// (metadata, return_url, notify_url), and the signed "payment.succeeded" call back to it.
//
// Stored in the merchant's `config` JSONB (config.linkHooks[linkId]) — no schema change.
// Signature: header x-zenipay-signature = hex HMAC-SHA256(body) keyed with
// sha256(api_key used to create the link). The merchant knows its own key, so it can
// verify; we never store the raw key a second time.

import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export type LinkHook = {
  metadata?: Record<string, string>;
  return_url?: string;
  notify_url?: string;
  key_hash?: string;
  created_at?: string;
  notified_at?: string;
};

const MAX_HOOKS = 500;

function safeHttpsUrl(v: unknown): string | undefined {
  if (typeof v !== "string" || v.length > 500) return undefined;
  try {
    const u = new URL(v);
    if (u.protocol !== "https:") return undefined;
    // No internal / loopback targets for server-side calls.
    if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(u.hostname) || u.hostname.endsWith(".internal")) return undefined;
    return u.toString();
  } catch {
    return undefined;
  }
}

export function cleanMetadata(v: unknown): Record<string, string> | undefined {
  if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>).slice(0, 20)) {
    if (!/^[A-Za-z0-9_.-]{1,40}$/.test(k)) continue;
    if (val === null || val === undefined) continue;
    out[k] = String(val).slice(0, 500);
  }
  return Object.keys(out).length ? out : undefined;
}

export const keyHash = (apiKey: string) => crypto.createHash("sha256").update(apiKey).digest("hex");

export function buildHook(input: { metadata?: unknown; return_url?: unknown; notify_url?: unknown; api_key?: string }): LinkHook | null {
  const hook: LinkHook = {
    metadata: cleanMetadata(input.metadata),
    return_url: safeHttpsUrl(input.return_url),
    // A callback is only allowed for server-to-server links created with an API key (it is signed with it).
    notify_url: input.api_key ? safeHttpsUrl(input.notify_url) : undefined,
    key_hash: input.api_key ? keyHash(input.api_key) : undefined,
    created_at: new Date().toISOString(),
  };
  if (!hook.metadata && !hook.return_url && !hook.notify_url) return null;
  return hook;
}

export async function saveLinkHook(supabase: SupabaseClient, merchantId: string, linkId: string, hook: LinkHook) {
  const { data: m } = await supabase.from("zenipay_merchants").select("config").eq("id", merchantId).maybeSingle();
  const cfg = (m?.config || {}) as Record<string, unknown>;
  const hooks = { ...((cfg.linkHooks || {}) as Record<string, LinkHook>), [linkId]: hook };
  const keys = Object.keys(hooks);
  for (const k of keys.slice(0, Math.max(0, keys.length - MAX_HOOKS))) delete hooks[k];
  const { error } = await supabase
    .from("zenipay_merchants")
    .update({ config: { ...cfg, linkHooks: hooks }, updated_at: new Date().toISOString() })
    .eq("id", merchantId);
  if (error) console.warn("[link-hooks] save error:", error.message);
}

export async function getLinkHook(supabase: SupabaseClient, merchantId: string, linkId: string): Promise<LinkHook | null> {
  const { data: m } = await supabase.from("zenipay_merchants").select("config").eq("id", merchantId).maybeSingle();
  const hooks = ((m?.config as Record<string, unknown> | null)?.linkHooks || {}) as Record<string, LinkHook>;
  return hooks[linkId] || null;
}

/** POST the signed payment.succeeded event to the merchant. Never throws. */
export async function notifyPaid(supabase: SupabaseClient, merchantId: string, linkId: string, payment: Record<string, unknown>) {
  try {
    const hook = await getLinkHook(supabase, merchantId, linkId);
    if (!hook?.notify_url || !hook.key_hash) return;
    const body = JSON.stringify({
      event: "payment.succeeded",
      pay_link_id: linkId,
      metadata: hook.metadata || {},
      paid_at: new Date().toISOString(),
      ...payment,
    });
    const sig = crypto.createHmac("sha256", hook.key_hash).update(body).digest("hex");
    const r = await fetch(hook.notify_url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-zenipay-signature": sig, "x-zenipay-event": "payment.succeeded" },
      body,
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) console.warn(`[link-hooks] notify ${linkId} → HTTP ${r.status}`);
  } catch (e) {
    console.warn(`[link-hooks] notify ${linkId} failed:`, e instanceof Error ? e.message : String(e));
  }
}
