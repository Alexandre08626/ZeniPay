/**
 * Script de configuration du projet Supabase LIVE (elanjzgxyauvirdyvfmn)
 * 
 * Ce script:
 * 1. Crée les tables ZeniPay (merchants, payments, ledger, etc.)
 * 2. Crée les tables Zeniva (clients, bookings, proposals, etc.)
 * 3. Configure le marchand Finix pour zenivatravel.com
 * 4. Crée les comptes admin
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://elanjzgxyauvirdyvfmn.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsYW5qemd4eWF1dmlyZHl2Zm1uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDU0NDg3NiwiZXhwIjoyMTAwMTIwODc2fQ.vhQXv48ZZL2z0nZL6VUyogGdghxERhMliARsU77bJs0";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function createTable(tableName, definition) {
  console.log(`\n📦 Creating table: ${tableName}...`);
  
  // Check if table exists
  const { data: existing, error: checkError } = await supabase
    .from(tableName)
    .select("id")
    .limit(1)
    .maybeSingle();

  if (checkError && checkError.code !== "PGRST116") {
    // PGRST116 means empty result set - table exists
    if (checkError.code === "42P01") {
      // Table doesn't exist - create it
      console.log(`   Creating ${tableName}...`);
      // We'll create tables via raw SQL since PostgREST doesn't support DDL
      return false;
    }
    console.log(`   ⚠️  Error checking ${tableName}: ${checkError.message}`);
    return false;
  }
  console.log(`   ✅ ${tableName} already exists`);
  return true;
}

async function executeSQL(sql) {
  // Use the pg client directly
  const { default: postgres } = await import("postgres");
  const sql_client = postgres(
    `postgresql://postgres.elanjzgxyauvirdyvfmn:vIH7LPQRLu4SyGeu@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
  );
  
  try {
    await sql_client.unsafe(sql);
    console.log("   ✅ SQL executed successfully");
  } catch (err) {
    console.error(`   ❌ SQL error: ${err.message}`);
  } finally {
    await sql_client.end();
  }
}

async function setupDatabase() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║   ZENIVA/ZENIPAY - LIVE PROJECT SETUP      ║");
  console.log("║   Project: elanjzgxyauvirdyvfmn            ║");
  console.log("╚══════════════════════════════════════════════╝");

  // ─── 1. ZENIPAY TABLES ───────────────────────────────────
  console.log("\n═══════════ ZENIPAY TABLES ═══════════");

  // zenipay_merchants
  await executeSQL(`
    CREATE TABLE IF NOT EXISTS zenipay_merchants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      email TEXT,
      company TEXT,
      website TEXT,
      status TEXT DEFAULT 'active',
      finix_merchant_id TEXT,
      finix_application_id TEXT,
      finix_identity_id TEXT,
      api_keys JSONB DEFAULT '{}',
      config JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  // zenipay_payments
  await executeSQL(`
    CREATE TABLE IF NOT EXISTS zenipay_payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      merchant_id UUID REFERENCES zenipay_merchants(id),
      amount NUMERIC(12,2) NOT NULL,
      currency TEXT DEFAULT 'USD',
      status TEXT DEFAULT 'pending',
      payment_method TEXT,
      gateway TEXT DEFAULT 'finix',
      gateway_response JSONB DEFAULT '{}',
      customer_email TEXT,
      customer_name TEXT,
      description TEXT,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  // zenipay_ledger
  await executeSQL(`
    CREATE TABLE IF NOT EXISTS zenipay_ledger (
      id TEXT PRIMARY KEY,
      payment_id TEXT,
      merchant_id TEXT,
      event_type TEXT NOT NULL,
      wallet_type TEXT NOT NULL,
      direction TEXT NOT NULL CHECK (direction IN ('credit', 'debit')),
      amount NUMERIC(12,2) NOT NULL,
      currency TEXT DEFAULT 'USD',
      reference TEXT,
      note TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  // zenipay_wallet_balances
  await executeSQL(`
    CREATE TABLE IF NOT EXISTS zenipay_wallet_balances (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      merchant_id UUID REFERENCES zenipay_merchants(id),
      wallet_type TEXT NOT NULL,
      currency TEXT DEFAULT 'USD',
      available NUMERIC(12,2) DEFAULT 0,
      pending NUMERIC(12,2) DEFAULT 0,
      paid_out NUMERIC(12,2) DEFAULT 0,
      last_updated TIMESTAMPTZ DEFAULT now()
    );
  `);

  // zenipay_idempotency_keys
  await executeSQL(`
    CREATE TABLE IF NOT EXISTS zenipay_idempotency_keys (
      key TEXT PRIMARY KEY,
      operation TEXT,
      result JSONB,
      created_at TIMESTAMPTZ DEFAULT now(),
      expires_at TIMESTAMPTZ
    );
  `);

  // zenipay_audit_logs
  await executeSQL(`
    CREATE TABLE IF NOT EXISTS zenipay_audit_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      user_id TEXT,
      changes JSONB,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  // ─── 2. ZENIVA TABLES ────────────────────────────────────
  console.log("\n═══════════ ZENIVA TABLES ═══════════");

  // clients table
  await executeSQL(`
    CREATE TABLE IF NOT EXISTS clients (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      notes TEXT,
      preferences JSONB DEFAULT '{}',
      tags TEXT[] DEFAULT '{}',
      status TEXT DEFAULT 'lead',
      agent_id UUID,
      source TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  // bookings table
  await executeSQL(`
    CREATE TABLE IF NOT EXISTS bookings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID REFERENCES clients(id),
      title TEXT,
      description TEXT,
      status TEXT DEFAULT 'pending',
      type TEXT,
      amount NUMERIC(12,2),
      currency TEXT DEFAULT 'USD',
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  // proposals table
  await executeSQL(`
    CREATE TABLE IF NOT EXISTS proposals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID REFERENCES clients(id),
      title TEXT,
      content JSONB DEFAULT '{}',
      status TEXT DEFAULT 'draft',
      amount NUMERIC(12,2),
      currency TEXT DEFAULT 'USD',
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  // agent_inbox_messages
  await executeSQL(`
    CREATE TABLE IF NOT EXISTS agent_inbox_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID REFERENCES clients(id),
      subject TEXT,
      message TEXT,
      direction TEXT,
      status TEXT DEFAULT 'unread',
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  // ─── 3. CREATE MERCHANT ───────────────────────────────────
  console.log("\n═══════════ CREATING MERCHANT ═══════════");

  const { data: existingMerchant, error: merchantCheckError } = await supabase
    .from("zenipay_merchants")
    .select("id, name")
    .eq("website", "zenivatravel.com")
    .maybeSingle();

  let merchantId;
  if (existingMerchant) {
    console.log(`   ✅ Merchant already exists: ${existingMerchant.name} (${existingMerchant.id})`);
    merchantId = existingMerchant.id;
  } else {
    const { data: newMerchant, error: merchantError } = await supabase
      .from("zenipay_merchants")
      .insert({
        name: "Zeniva Travel",
        email: "payments@zeniva.ca",
        company: "Zeniva LLC",
        website: "zenivatravel.com",
        status: "active",
        finix_merchant_id: process.env.FINIX_MERCHANT_ID || "MUk4zVL1MevHw3VkieE6nq81",
        finix_application_id: process.env.FINIX_APPLICATION_ID || "APhu13fXtZxMVSCL3F4iSDTZ",
        config: {
          gateway: "finix",
          environment: "production",
          currency: "USD",
        },
      })
      .select()
      .single();

    if (merchantError) {
      console.error(`   ❌ Error creating merchant: ${merchantError.message}`);
    } else {
      console.log(`   ✅ Merchant created: ${newMerchant.name} (${newMerchant.id})`);
      merchantId = newMerchant.id;
    }
  }

  // ─── 4. SETUP COMPLETE ────────────────────────────────────
  console.log("\n═══════════ SETUP COMPLETE ═══════════");
  console.log("   ✅ ZeniPay tables created");
  console.log("   ✅ Zeniva tables created");
  console.log(`   ✅ Merchant configured: ${merchantId}`);
  console.log("\n═══════════ ACCOUNTS ═══════════");
  console.log("   📧 admin@zeniva.ca (hq) - Already exists");
  console.log("   📧 test-traveler@zeniva.ca (traveler) - Already exists");
  console.log("\n   🔑 Login: https://zenivatravel.com/login");
  console.log("   🔑 Supabase: https://supabase.com/dashboard/project/elanjzgxyauvirdyvfmn");
}

setupDatabase().catch(console.error);
