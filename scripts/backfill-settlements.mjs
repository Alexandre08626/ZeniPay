#!/usr/bin/env node
// scripts/backfill-settlements.mjs
//
// One-shot repair: the Finix webhook was never subscribed to
// settlement.updated, so past settlements (money swept to the bank) were
// never recorded and merchant balances kept growing forever.
//
// For every APPROVED/SUCCEEDED Finix settlement with a positive amount:
//   1. upsert the `led_settle_<id>` settlement_to_bank ledger debit
//      (same id the webhook uses, so future redeliveries stay idempotent)
// then per merchant:
//   2. zenipay_merchants.balance  = max(0, ledger credits - ledger debits)
//   3. primary zenipay_accounts.balance = min(current, new merchant balance)
//      (account is net-of-fees; if everything was settled it goes to 0)
//
// Dry-run by default. Pass --apply to write.
//
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//   FINIX_API_USERNAME=... FINIX_API_PASSWORD=... [FINIX_ENV=sandbox] \
//   node scripts/backfill-settlements.mjs [--apply]

import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");

function mustEnv(...names) {
  for (const n of names) if (process.env[n]) return process.env[n];
  throw new Error(`Missing env: ${names.join(" | ")}`);
}

const SUPABASE_URL = mustEnv("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
const SUPABASE_KEY = mustEnv("SUPABASE_SERVICE_ROLE_KEY");
const FINIX_USER = mustEnv("FINIX_API_USERNAME");
const FINIX_PASS = mustEnv("FINIX_API_PASSWORD");
const FINIX_BASE = process.env.FINIX_ENV === "production"
  ? "https://finix.live-payments-api.com"
  : "https://finix.sandbox-payments-api.com";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

async function finixGet(path) {
  const res = await fetch(`${FINIX_BASE}${path}`, {
    headers: {
      Authorization: "Basic " + Buffer.from(`${FINIX_USER}:${FINIX_PASS}`).toString("base64"),
      "Finix-Version": "2022-02-01",
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`Finix ${path} → HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

async function listAllSettlements() {
  const out = [];
  let offset = 0;
  const limit = 100;
  for (;;) {
    const page = await finixGet(`/settlements?limit=${limit}&offset=${offset}`);
    const items = page?._embedded?.settlements ?? [];
    out.push(...items);
    if (items.length < limit) break;
    offset += limit;
  }
  return out;
}

async function resolveMerchantId(s) {
  if (s.merchant_id) {
    const { data } = await supabase.from("zenipay_merchants").select("id")
      .eq("finix_merchant_id", s.merchant_id).limit(1);
    if (data?.length) return data[0].id;
  }
  if (s.identity) {
    const { data } = await supabase.from("zenipay_merchants").select("id")
      .eq("finix_identity_id", s.identity).limit(1);
    if (data?.length) return data[0].id;
  }
  return null;
}

async function main() {
  console.log(`[backfill] mode=${APPLY ? "APPLY" : "DRY-RUN"} finix=${FINIX_BASE}`);

  const all = await listAllSettlements();
  const settled = all.filter((s) => {
    const st = String(s.status ?? s.state ?? "").toUpperCase();
    return (st === "APPROVED" || st === "SUCCEEDED") && Number(s.total_amount) > 0;
  });
  console.log(`[backfill] ${all.length} settlements at Finix, ${settled.length} approved & positive`);

  // 1) Ledger debits
  const touchedMerchants = new Set();
  let inserted = 0, skipped = 0, unresolved = 0;
  for (const s of settled) {
    const merchantId = await resolveMerchantId(s);
    if (!merchantId) { unresolved++; console.warn(`  ? ${s.id} → no merchant for ${s.merchant_id}/${s.identity}`); continue; }
    touchedMerchants.add(merchantId);

    const ledgerId = `led_settle_${s.id}`;
    const { data: existing } = await supabase.from("zenipay_ledger").select("id").eq("id", ledgerId).maybeSingle();
    const amount = Math.round(Number(s.total_amount)) / 100;
    if (existing) { skipped++; continue; }

    console.log(`  + ${s.id}  ${amount.toFixed(2)} ${s.currency}  ${s.created_at}  → ${merchantId}`);
    if (APPLY) {
      const { error } = await supabase.from("zenipay_ledger").upsert({
        id: ledgerId,
        payment_id: null,
        merchant_id: merchantId,
        event_type: "settlement_to_bank",
        wallet_type: "platform",
        direction: "debit",
        amount,
        currency: s.currency || "CAD",
        reference: s.id,
        note: `Settlement sent to bank account (Finix ${s.id}) — backfilled`,
        created_at: s.created_at || new Date().toISOString(),
      }, { onConflict: "id" });
      if (error) throw new Error(`ledger upsert ${ledgerId}: ${error.message}`);
    }
    inserted++;
  }
  console.log(`[backfill] ledger: ${inserted} to insert, ${skipped} already present, ${unresolved} unresolved`);

  // 2) + 3) Recompute balances for every touched merchant
  for (const merchantId of touchedMerchants) {
    const { data: rows, error } = await supabase.from("zenipay_ledger")
      .select("direction, amount").eq("merchant_id", merchantId);
    if (error) throw new Error(`ledger read ${merchantId}: ${error.message}`);

    let credits = 0, debits = 0;
    for (const r of rows ?? []) {
      const a = Number(r.amount) || 0;
      if (r.direction === "credit") credits += a; else if (r.direction === "debit") debits += a;
    }
    // In dry-run the pending settlement debits aren't in the DB yet — add them.
    if (!APPLY) {
      for (const s of settled) {
        if ((await resolveMerchantId(s)) !== merchantId) continue;
        const { data: ex } = await supabase.from("zenipay_ledger").select("id").eq("id", `led_settle_${s.id}`).maybeSingle();
        if (!ex) debits += Math.round(Number(s.total_amount)) / 100;
      }
    }
    const newBalance = Math.max(0, Math.round((credits - debits) * 100) / 100);

    const { data: m } = await supabase.from("zenipay_merchants").select("balance").eq("id", merchantId).maybeSingle();
    const { data: acct } = await supabase.from("zenipay_accounts").select("id, balance")
      .eq("merchant_id", merchantId).eq("is_primary", true).maybeSingle();
    const newAcct = acct ? Math.min(Number(acct.balance) || 0, newBalance) : null;

    console.log(`[backfill] ${merchantId}: credits ${credits.toFixed(2)} − debits ${debits.toFixed(2)}`);
    console.log(`           merchants.balance  ${Number(m?.balance ?? 0).toFixed(2)} → ${newBalance.toFixed(2)}`);
    if (acct) console.log(`           primary account    ${Number(acct.balance).toFixed(2)} → ${newAcct.toFixed(2)}`);

    if (APPLY) {
      const now = new Date().toISOString();
      const { error: e1 } = await supabase.from("zenipay_merchants")
        .update({ balance: newBalance, updated_at: now }).eq("id", merchantId);
      if (e1) throw new Error(`merchant update: ${e1.message}`);
      if (acct) {
        const { error: e2 } = await supabase.from("zenipay_accounts")
          .update({ balance: newAcct, updated_at: now }).eq("id", acct.id);
        if (e2) throw new Error(`account update: ${e2.message}`);
      }
    }
  }

  console.log(APPLY ? "[backfill] done." : "[backfill] dry-run complete — re-run with --apply to write.");
}

main().catch((e) => { console.error(e); process.exit(1); });
