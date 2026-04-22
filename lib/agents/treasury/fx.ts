// FX conversion wrapper. Delegates to the agents.fx_convert() Postgres fn
// which reads from the active row in agents.fx_rates. The cron job
// scripts/refresh-fx.ts rotates those rows daily.

import { getAgentsDb } from "../supabase-client";
import type { Currency } from "./types";

export async function convert(
  amountCents: number,
  from: Currency,
  to: Currency,
): Promise<number> {
  if (!Number.isInteger(amountCents)) {
    throw new Error(`fx.convert: amount must be integer cents, got ${amountCents}`);
  }
  if (from === to) return amountCents;

  const db = getAgentsDb();
  const { data, error } = await db.rpc("fx_convert", {
    p_amount_cents: amountCents,
    p_from: from,
    p_to: to,
  });
  if (error) throw new Error(`fx.convert: ${error.message}`);
  return Number(data ?? 0);
}

export async function getActiveRate(from: Currency, to: Currency): Promise<number> {
  if (from === to) return 1.0;
  const db = getAgentsDb();
  const { data, error } = await db
    .from("fx_rates")
    .select("rate")
    .eq("base_currency", from)
    .eq("quote_currency", to)
    .is("valid_to", null)
    .maybeSingle();
  if (error) throw new Error(`fx.getActiveRate: ${error.message}`);
  if (!data) throw new Error(`no active fx_rate for ${from} -> ${to}`);
  return Number(data.rate);
}
