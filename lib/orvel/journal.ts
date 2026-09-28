// Orvel's action journal: table zenipay_orvel_actions when it exists,
// otherwise the merchant's config JSONB (last MAX_FALLBACK actions).

import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingTable, readConfigKey, updateConfigKey } from "@/lib/zenipay/merchant-store";

const TABLE = "zenipay_orvel_actions";
const CFG_KEY = "zp_orvel_actions";
const MAX_FALLBACK = 200;

export interface ActionRecord {
  id: string;
  merchant_id: string;
  tool: string;
  args: Record<string, unknown>;
  status: "done" | "failed" | "denied" | "undone";
  result: Record<string, unknown> | null;
  undo: Record<string, unknown> | null;
  prompt: string | null;
  created_at: string;
  undone_at: string | null;
}

export async function recordAction(
  supabase: SupabaseClient,
  row: Omit<ActionRecord, "id" | "created_at" | "undone_at">,
): Promise<string | undefined> {
  const full: ActionRecord = { ...row, id: crypto.randomUUID(), created_at: new Date().toISOString(), undone_at: null };
  try {
    const { error } = await supabase.from(TABLE).insert(full);
    if (!error) return full.id;
    if (!isMissingTable(error)) return undefined;
    await updateConfigKey<ActionRecord[]>(supabase, row.merchant_id, CFG_KEY, [], (cur) => [full, ...cur].slice(0, MAX_FALLBACK));
    return full.id;
  } catch { return undefined; }
}

export async function listActions(supabase: SupabaseClient, merchantId: string, limit = 100): Promise<ActionRecord[]> {
  const { data, error } = await supabase.from(TABLE).select("*").eq("merchant_id", merchantId)
    .order("created_at", { ascending: false }).limit(limit);
  if (!error) return (data || []) as ActionRecord[];
  if (!isMissingTable(error)) return [];
  return (await readConfigKey<ActionRecord[]>(supabase, merchantId, CFG_KEY, [])).slice(0, limit);
}

export async function getAction(supabase: SupabaseClient, merchantId: string, id: string): Promise<ActionRecord | null> {
  const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).eq("merchant_id", merchantId).maybeSingle();
  if (!error) return (data as ActionRecord) || null;
  if (!isMissingTable(error)) return null;
  return (await readConfigKey<ActionRecord[]>(supabase, merchantId, CFG_KEY, [])).find((a) => a.id === id) || null;
}

/** Mark an action undone, only if it isn't already. Returns false if someone got there first. */
export async function claimUndo(supabase: SupabaseClient, merchantId: string, id: string): Promise<boolean> {
  const now = new Date().toISOString();
  const { data, error } = await supabase.from(TABLE).update({ undone_at: now, status: "undone" })
    .eq("id", id).eq("merchant_id", merchantId).is("undone_at", null).select("id");
  if (!error) return !!data && data.length > 0;
  if (!isMissingTable(error)) return false;
  let won = false;
  await updateConfigKey<ActionRecord[]>(supabase, merchantId, CFG_KEY, [], (cur) => {
    const i = cur.findIndex((a) => a.id === id);
    if (i < 0 || cur[i].undone_at) return undefined;
    won = true;
    const next = [...cur];
    next[i] = { ...cur[i], undone_at: now, status: "undone" };
    return next;
  });
  return won;
}

export async function releaseUndo(supabase: SupabaseClient, merchantId: string, id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).update({ undone_at: null, status: "done" }).eq("id", id).eq("merchant_id", merchantId);
  if (!error || !isMissingTable(error)) return;
  await updateConfigKey<ActionRecord[]>(supabase, merchantId, CFG_KEY, [], (cur) =>
    cur.map((a) => (a.id === id ? { ...a, undone_at: null, status: "done" } : a)));
}
