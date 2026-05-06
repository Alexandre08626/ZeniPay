/**
 * Server-only FX helpers for ZeniPay routes.
 *
 * Reads from agents.fx_rates (the same table the agents treasury uses).
 * Refreshed daily by scripts/refresh-fx.ts. Service-role client bypasses
 * RLS and uses Supabase JS v2's per-query schema selector so we don't
 * need a second client just for one schema.
 *
 * Why this lives in modules/zenipay (not lib/agents): it's invoked by
 * the customer-facing payment processor — a zenipay concern — and we
 * want to keep the agents <-> zenipay boundary one-directional.
 */
import { getSupabaseAdmin } from "./supabase";

export type Currency = "CAD" | "USD" | "EUR" | "USDC";

export async function getActiveRate(from: Currency, to: Currency): Promise<number> {
  if (from === to) return 1.0;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .schema("agents" as never)
    .from("fx_rates" as never)
    .select("rate")
    .eq("base_currency", from)
    .eq("quote_currency", to)
    .is("valid_to", null)
    .maybeSingle();
  if (error) throw new Error(`fx.getActiveRate: ${error.message}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;
  if (!row) throw new Error(`No active fx_rate for ${from} -> ${to}`);
  return Number(row.rate);
}

/**
 * Convert a decimal amount (e.g. 1000.00) from one currency to another
 * using the active fx_rates row. Returns a number rounded to 2 decimals.
 */
export async function convert(amount: number, from: Currency, to: Currency): Promise<number> {
  if (from === to) return amount;
  const rate = await getActiveRate(from, to);
  return Math.round(amount * rate * 100) / 100;
}
