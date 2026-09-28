// Small key/value store inside zenipay_merchants.config (JSONB).
//
// Production doesn't have the tables from migration 20260927000002 (and we
// can't run DDL from the app), so installments and Orvel's settings/journal
// fall back to keys in the merchant's config. Each write re-reads the row
// right before updating and only replaces its own key, like the existing
// merchant-data route does.

import type { SupabaseClient } from "@supabase/supabase-js";

export function isMissingTable(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  return err.code === "PGRST205" || err.code === "42P01" || /Could not find the table|does not exist/i.test(err.message || "");
}

export async function readConfigKey<T>(supabase: SupabaseClient, merchantId: string, key: string, fallback: T): Promise<T> {
  const { data } = await supabase.from("zenipay_merchants").select("config").eq("id", merchantId).maybeSingle();
  const cfg = (data?.config || {}) as Record<string, unknown>;
  return (cfg[key] as T) ?? fallback;
}

/** Read-modify-write one config key. `update` returns the new value (or undefined to skip the write). */
export async function updateConfigKey<T>(
  supabase: SupabaseClient,
  merchantId: string,
  key: string,
  fallback: T,
  update: (current: T) => T | undefined,
): Promise<T | undefined> {
  const { data } = await supabase.from("zenipay_merchants").select("config").eq("id", merchantId).maybeSingle();
  if (!data) return undefined;
  const cfg = (data.config || {}) as Record<string, unknown>;
  const next = update(((cfg[key] as T) ?? fallback));
  if (next === undefined) return undefined;
  const { error } = await supabase.from("zenipay_merchants")
    .update({ config: { ...cfg, [key]: next } }).eq("id", merchantId);
  if (error) throw new Error(error.message);
  return next;
}

/** Every merchant's value for one config key (small merchant count — same approach as legacy pay links). */
export async function scanConfigKey<T>(supabase: SupabaseClient, key: string): Promise<Array<{ merchantId: string; value: T }>> {
  const { data } = await supabase.from("zenipay_merchants").select("id, config");
  return (data || [])
    .map((m: any) => ({ merchantId: String(m.id), value: (m.config || {})[key] as T }))
    .filter((r) => r.value != null);
}
