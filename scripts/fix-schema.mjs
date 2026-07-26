#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const sb = createClient(url, key, { auth: { persistSession: false } });

async function run() {
  console.log("=== Current Schema Check ===");
  const { data: merchants, error: checkError } = await sb
    .from("zenipay_merchants")
    .select("id, email, auth_user_id, merchant_data")
    .limit(5);
  if (checkError) {
    console.log("Error checking merchants:", checkError.message);
  } else {
    console.log("Current merchants:", JSON.stringify(merchants, null, 2));
  }

  console.log("\n=== Adding auth_user_id column ===");
  const resp = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": key,
      "Authorization": `Bearer ${key}`,
    },
    body: JSON.stringify({
      sql: `ALTER TABLE public.zenipay_merchants ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL; CREATE INDEX IF NOT EXISTS idx_merchants_auth_user ON public.zenipay_merchants(auth_user_id);`,
    }),
  });
  console.log("status:", resp.status, await resp.text());

  console.log("\n=== Adding merchant_data column ===");
  const resp2 = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": key,
      "Authorization": `Bearer ${key}`,
    },
    body: JSON.stringify({
      sql: `ALTER TABLE public.zenipay_merchants ADD COLUMN IF NOT EXISTS merchant_data JSONB DEFAULT '{}'::jsonb; ALTER TABLE public.zenipay_merchants ADD COLUMN IF NOT EXISTS onboarding_state TEXT DEFAULT '';`,
    }),
  });
  console.log("status:", resp2.status, await resp2.text());

  console.log("\n=== Auth Users ===");
  const { data: users, error: usersError } = await sb.auth.admin.listUsers();
  if (usersError) {
    console.log("Error listing users:", usersError.message);
    return;
  }
  console.log("Existing auth users:", users.users.length);
  users.users.forEach(u => console.log(`  - ${u.email} (${u.id})`));
}

run().catch(console.error);
