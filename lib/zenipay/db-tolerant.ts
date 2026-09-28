// Schema-tolerant writes. Production tables lag behind the repo migrations
// (e.g. zenipay_invoices only has the legacy columns), so a write that names
// a missing column is retried without it instead of failing outright.

import type { SupabaseClient } from "@supabase/supabase-js";

type PgErr = { code?: string; message?: string } | null;

/** Column name from "Could not find the 'x' column…" (PGRST204) or 'column "x" … does not exist' (42703). */
export function missingColumn(err: PgErr): string | null {
  if (!err) return null;
  if (err.code !== "PGRST204" && err.code !== "42703") return null;
  const m = /'([^']+)' column/.exec(err.message || "") || /column "?(?:[\w]+\.)?([\w]+)"? (?:of relation "[\w]+" )?does not exist/.exec(err.message || "");
  return m ? m[1] : null;
}

export async function insertTolerant(
  supabase: SupabaseClient,
  table: string,
  row: Record<string, unknown>,
): Promise<{ error: PgErr; row: Record<string, unknown>; dropped: string[] }> {
  let current = { ...row };
  const dropped: string[] = [];
  for (let i = 0; i < 25; i++) {
    const { error } = await supabase.from(table).insert(current);
    const col = missingColumn(error);
    if (!col || !(col in current)) return { error, row: current, dropped };
    dropped.push(col);
    const { [col]: _gone, ...rest } = current;
    current = rest;
  }
  return { error: { message: "too many missing columns" }, row: current, dropped };
}

/** Update rows matching `filter` (applied to the query builder), dropping unknown columns. */
export async function updateTolerant(
  supabase: SupabaseClient,
  table: string,
  patch: Record<string, unknown>,
  filter: (q: any) => any,
): Promise<{ error: PgErr; dropped: string[] }> {
  let current = { ...patch };
  const dropped: string[] = [];
  for (let i = 0; i < 25; i++) {
    if (Object.keys(current).length === 0) return { error: null, dropped };
    const { error } = await filter(supabase.from(table).update(current));
    const col = missingColumn(error);
    if (!col || !(col in current)) return { error, dropped };
    dropped.push(col);
    const { [col]: _gone, ...rest } = current;
    current = rest;
  }
  return { error: { message: "too many missing columns" }, dropped };
}
