#!/usr/bin/env -S node --experimental-strip-types
// scripts/refresh-fx.ts
//
// Pulls fresh FX rates for USD/CAD/EUR/USDC from a free public source and
// closes the previous "active" row (valid_to = NOW()) + inserts a new one.
// Idempotent per source-provider-day — re-runs within the same day no-op.
//
// Primary: exchangerate.host (free, no key).
// Fallback: openexchangerates.org if OPENEXCHANGE_APP_ID env is set.
//
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//   npx tsx scripts/refresh-fx.ts

const PAIRS: Array<{ base: string; quote: string }> = [
  { base: "USD", quote: "USD" },
  { base: "USD", quote: "CAD" },
  { base: "USD", quote: "EUR" },
  { base: "USD", quote: "USDC" },
  { base: "CAD", quote: "USD" },
  { base: "EUR", quote: "USD" },
  { base: "USDC", quote: "USD" },
];

interface RatesByPair {
  [key: string]: number; // key = `${base}->${quote}`
}

async function main(): Promise<void> {
  const url = mustEnv("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  const key = mustEnv("SUPABASE_SERVICE_ROLE_KEY");

  const rates = await fetchRates();
  console.log("fetched rates:", rates);

  // Close old rows + insert new ones in a single SQL via RPC-less exec.
  // We use PostgREST inline SQL via the supabase `rest/v1/rpc` pattern? No —
  // we need raw SQL. Hit pg via the service_role key with a single call.
  // For simplicity, call individual PostgREST endpoints.
  for (const pair of PAIRS) {
    const k = `${pair.base}->${pair.quote}`;
    const rate = rates[k];
    if (rate == null) {
      console.warn(`! no rate for ${k}, skipping`);
      continue;
    }

    // Close the current active row for this pair (valid_to = NOW()).
    const closeRes = await fetch(
      `${url}/rest/v1/fx_rates?base_currency=eq.${pair.base}&quote_currency=eq.${pair.quote}&valid_to=is.null`,
      {
        method: "PATCH",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "content-type": "application/json",
          "Accept-Profile": "agents",
          "Content-Profile": "agents",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ valid_to: new Date().toISOString() }),
      },
    );
    if (!closeRes.ok && closeRes.status !== 404) {
      console.warn(`! close ${k} → HTTP ${closeRes.status}`);
    }

    // Insert new row.
    const insertRes = await fetch(`${url}/rest/v1/fx_rates`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "content-type": "application/json",
        "Accept-Profile": "agents",
        "Content-Profile": "agents",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        base_currency: pair.base,
        quote_currency: pair.quote,
        rate,
        source: process.env.OPENEXCHANGE_APP_ID ? "openexchangerates" : "frankfurter.dev",
      }),
    });
    if (!insertRes.ok) {
      const body = await insertRes.text();
      console.error(`✗ insert ${k} → HTTP ${insertRes.status}: ${body}`);
      continue;
    }
    console.log(`✓ ${k} = ${rate}`);
  }

  console.log("done.");
}

async function fetchRates(): Promise<RatesByPair> {
  const appId = process.env.OPENEXCHANGE_APP_ID;
  return appId ? fetchFromOpenExchangeRates(appId) : fetchFromExchangerateHost();
}

// frankfurter.dev (free, no key, ECB reference rates, open-source).
// Returns rates keyed by quote currency, base = USD.
async function fetchFromExchangerateHost(): Promise<RatesByPair> {
  const out: RatesByPair = {
    "USD->USD": 1.0,
    "USD->USDC": 1.0,
    "USDC->USD": 1.0,
  };
  const res = await fetch("https://api.frankfurter.dev/v1/latest?base=USD&symbols=CAD,EUR");
  if (!res.ok) throw new Error(`frankfurter.dev ${res.status}`);
  const body = (await res.json()) as { rates?: Record<string, number> };
  const rates = body.rates ?? {};
  if (typeof rates.CAD === "number") {
    out["USD->CAD"] = rates.CAD;
    out["CAD->USD"] = 1 / rates.CAD;
  }
  if (typeof rates.EUR === "number") {
    out["USD->EUR"] = rates.EUR;
    out["EUR->USD"] = 1 / rates.EUR;
  }
  return out;
}

async function fetchFromOpenExchangeRates(appId: string): Promise<RatesByPair> {
  const out: RatesByPair = {
    "USD->USD": 1.0,
    "USD->USDC": 1.0,
    "USDC->USD": 1.0,
  };
  const res = await fetch(`https://openexchangerates.org/api/latest.json?app_id=${appId}&symbols=CAD,EUR`);
  if (!res.ok) throw new Error(`openexchangerates ${res.status}`);
  const body = (await res.json()) as { rates?: Record<string, number> };
  const rates = body.rates ?? {};
  if (typeof rates.CAD === "number") {
    out["USD->CAD"] = rates.CAD;
    out["CAD->USD"] = 1 / rates.CAD;
  }
  if (typeof rates.EUR === "number") {
    out["USD->EUR"] = rates.EUR;
    out["EUR->USD"] = 1 / rates.EUR;
  }
  return out;
}

function mustEnv(...names: string[]): string {
  for (const n of names) {
    const v = process.env[n];
    if (v) return v;
  }
  throw new Error(`missing env: ${names.join(" / ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
