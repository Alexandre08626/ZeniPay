#!/usr/bin/env node
// scripts/ensure-zenicorp-account.mjs
//
// Ensures the ZeniCorp merchant has a primary `zenipay_accounts` row so its
// balance has somewhere to land when a pay link is paid. Idempotent.
//
// Run: node scripts/ensure-zenicorp-account.mjs

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MERCHANT_ID = process.env.ZENICORP_MERCHANT_ID || "44e58231-170a-4904-b94f-eb3c791af4f3";

if (!url || !key) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function main() {
  const { data: existing } = await sb
    .from("zenipay_accounts")
    .select("id, is_primary")
    .eq("merchant_id", MERCHANT_ID);

  if (existing && existing.length > 0) {
    console.log("✅ ZeniCorp already has an account:", existing.map((a) => a.id).join(", "));
    return;
  }

  const acctNum = String(Math.floor(Math.random() * 9e9) + 1e9);
  const now = new Date().toISOString();
  const { data, error } = await sb.from("zenipay_accounts").insert({
    id: randomUUID(),
    merchant_id: MERCHANT_ID,
    account_type: "business_checking",
    account_name: "ZeniCorp",
    account_number: acctNum,
    balance: 0,
    currency: "CAD",
    is_primary: true,
    status: "active",
    interest_rate: 0,
    goal_amount: null,
    goal_deadline: null,
    account_data: {},
    created_at: now,
    updated_at: now,
  }).select().single();

  if (error) {
    throw new Error(`Failed to create account: ${error.message}`);
  }

  console.log("✅ Created primary account for ZeniCorp:", data.id, "| balance 0", data.currency);
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});