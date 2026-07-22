/**
 * Configuration du projet Supabase LIVE (elanjzgxyauvirdyvfmn)
 * 
 * Crée les tables ZeniPay + Zeniva et configure le marchand.
 * Exécuter: node scripts/setup-live-project.cjs
 */
const { Client } = require("pg");
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://elanjzgxyauvirdyvfmn.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsYW5qemd4eWF1dmlyZHl2Zm1uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDU0NDg3NiwiZXhwIjoyMTAwMTIwODc2fQ.vhQXv48ZZL2z0nZL6VUyogGdghxERhMliARsU77bJs0";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Direct DB connection
const db = new Client({
  host: "db.elanjzgxyauvirdyvfmn.supabase.co",
  port: 5432,
  user: "postgres",
  password: "vIH7LPQRLu4SyGeu",
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});

async function run() {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║   ZENIVA/ZENIPAY - LIVE PROJECT SETUP              ║");
  console.log("║   Supabase: elanjzgxyauvirdyvfmn                    ║");
  console.log("╚══════════════════════════════════════════════════════╝");

  await db.connect();
  console.log("✅ Connected to database\n");

  // ─── 1. ZENIPAY TABLES ───────────────────────────────────
  console.log("═══════════ ZENIPAY TABLES ═══════════");

  const zenipayTables = [
    `CREATE TABLE IF NOT EXISTS zenipay_merchants (
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
    )`,
    `CREATE TABLE IF NOT EXISTS zenipay_payments (
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
    )`,
    `CREATE TABLE IF NOT EXISTS zenipay_ledger (
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
    )`,
    `CREATE TABLE IF NOT EXISTS zenipay_wallet_balances (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      merchant_id UUID REFERENCES zenipay_merchants(id),
      wallet_type TEXT NOT NULL,
      currency TEXT DEFAULT 'USD',
      available NUMERIC(12,2) DEFAULT 0,
      pending NUMERIC(12,2) DEFAULT 0,
      paid_out NUMERIC(12,2) DEFAULT 0,
      last_updated TIMESTAMPTZ DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS zenipay_idempotency_keys (
      key TEXT PRIMARY KEY,
      operation TEXT,
      result JSONB,
      created_at TIMESTAMPTZ DEFAULT now(),
      expires_at TIMESTAMPTZ
    )`,
    `CREATE TABLE IF NOT EXISTS zenipay_audit_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      user_id TEXT,
      changes JSONB,
      created_at TIMESTAMPTZ DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS zenipay_invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      merchant_id UUID REFERENCES zenipay_merchants(id),
      client_name TEXT,
      client_email TEXT,
      amount NUMERIC(12,2) NOT NULL,
      currency TEXT DEFAULT 'USD',
      status TEXT DEFAULT 'draft',
      description TEXT,
      due_date DATE,
      paid_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS zenipay_payouts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      merchant_id UUID REFERENCES zenipay_merchants(id),
      amount NUMERIC(12,2) NOT NULL,
      currency TEXT DEFAULT 'USD',
      status TEXT DEFAULT 'pending',
      destination TEXT,
      method TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )`,
  ];

  for (const sql of zenipayTables) {
    try {
      const tableName = sql.match(/zenipay_(\w+)/)?.[1] || "unknown";
      await db.query(sql);
      console.log(`  ✅ zenipay_${tableName}`);
    } catch (err) {
      console.error(`  ❌ ${err.message}`);
    }
  }

  // ─── 2. ZENIVA TABLES ────────────────────────────────────
  console.log("\n═══════════ ZENIVA TABLES ═══════════");

  const zenivaTables = [
    `CREATE TABLE IF NOT EXISTS clients (
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
    )`,
    `CREATE TABLE IF NOT EXISTS bookings (
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
    )`,
    `CREATE TABLE IF NOT EXISTS proposals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID REFERENCES clients(id),
      title TEXT,
      content JSONB DEFAULT '{}',
      status TEXT DEFAULT 'draft',
      amount NUMERIC(12,2),
      currency TEXT DEFAULT 'USD',
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS agent_inbox_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID REFERENCES clients(id),
      subject TEXT,
      message TEXT,
      direction TEXT,
      status TEXT DEFAULT 'unread',
      created_at TIMESTAMPTZ DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS leads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT,
      email TEXT,
      phone TEXT,
      source TEXT,
      notes TEXT,
      status TEXT DEFAULT 'new',
      created_at TIMESTAMPTZ DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID REFERENCES clients(id),
      title TEXT,
      file_path TEXT,
      file_type TEXT,
      category TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )`,
  ];

  for (const sql of zenivaTables) {
    try {
      const tableName = sql.match(/CREATE TABLE.*?(\w+)/)?.[1] || "unknown";
      await db.query(sql);
      console.log(`  ✅ ${tableName}`);
    } catch (err) {
      console.error(`  ❌ ${err.message}`);
    }
  }

  // ─── 3. CREATE MERCHANT (if not exists) ──────────────────
  console.log("\n═══════════ MERCHANT SETUP ═══════════");

  const { data: existingMerchant } = await supabase
    .from("zenipay_merchants")
    .select("id, name, status")
    .eq("website", "zenivatravel.com")
    .maybeSingle();

  if (existingMerchant) {
    console.log(`  ✅ Merchant already exists: ${existingMerchant.name} (${existingMerchant.status})`);
  } else {
    const { data: newMerchant, error: merchErr } = await supabase
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
          default_description: "Zeniva Travel - Luxury Travel Services",
        },
      })
      .select()
      .single();

    if (merchErr) {
      console.error(`  ❌ ${merchErr.message}`);
    } else {
      console.log(`  ✅ Merchant created: ${newMerchant.name} (${newMerchant.id})`);
    }
  }

  // ─── 4. UPDATE EXISTING ACCOUNTS ──────────────────────────
  console.log("\n═══════════ ACCOUNTS ═══════════");

  // Check existing accounts
  const { data: accounts } = await supabase
    .from("accounts")
    .select("email, role");

  console.log("Existing accounts:");
  for (const acc of accounts || []) {
    console.log(`  📧 ${acc.email} (${acc.role})`);
  }

  // ─── 5. COMPLETE ──────────────────────────────────────────
  console.log("\n═══════════ SETUP COMPLETE ═══════════");
  console.log("  ✅ ZeniPay tables: merchants, payments, ledger, wallets, invoices, payouts, audit, idempotency");
  console.log("  ✅ Zeniva tables: clients, bookings, proposals, messages, leads, documents");
  console.log("  ✅ Merchant: Zeniva Travel (zenivatravel.com)");
  console.log("\n🔗 Supabase Dashboard: https://supabase.com/dashboard/project/elanjzgxyauvirdyvfmn");
  console.log("🔗 Zeniva Travel: https://zenivatravel.com");
  console.log("🔗 ZeniPay: https://zenipay.ca");

  await db.end();
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
