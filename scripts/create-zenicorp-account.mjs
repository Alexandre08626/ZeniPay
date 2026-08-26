#!/usr/bin/env node
// scripts/create-zenicorp-account.mjs
//
// Creates a single merchant account for ZeniCorp (Construction Group) on the
// ZeniPay platform, mirroring how the Zeniva Travel account was created.
//
// The production `zenipay_merchants` table uses the LEGACY schema:
//   id (uuid), name, email, company, website, status,
//   finix_merchant_id, finix_application_id, finix_identity_id,
//   api_keys (jsonb), config (jsonb), created_at, updated_at
//
// (NOT the newer business_name / merchant_data schema in the migration files.)
//
// Prerequisites:
//   SUPABASE_URL=https://<project>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
//
// Run: node scripts/create-zenicorp-account.mjs

import { createClient } from "@supabase/supabase-js";
import { randomBytes, scryptSync } from "node:crypto";
import { randomUUID } from "node:crypto";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = scryptSync(password, salt, 64);
  return `${salt}:${buf.toString("hex")}`;
}

const EMAIL = process.env.ZENICORP_EMAIL || "info@zenicorp.ca";
const PASSWORD = process.env.ZENICORP_PASSWORD || "ZeniCorp2026!";
const BUSINESS_NAME = "ZeniCorp";
const OWNER_NAME = "ZeniCorp Admin";
const WEBSITE = "zenicorp.ca";
const PHONE = "+1-581-748-7017";

async function main() {
  console.log("🚀 Creating ZeniCorp merchant account on ZeniPay...\n");

  // ── 1. Supabase Auth user ──────────────────────────────────────
  console.log(`  📧 Creating Supabase Auth user: ${EMAIL}`);
  let authUserId = null;
  const { data: created, error: createErr } = await sb.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: {
      role: "merchant",
      platform: "zenipay",
      label: "ZeniCorp Merchant",
      businessName: BUSINESS_NAME,
    },
    app_metadata: { provider: "email", providers: ["email"] },
  });

  if (createErr) {
    if (createErr.message.includes("already") || createErr.message.includes("exists")) {
      console.log(`  ⚠️ Auth user already exists: ${EMAIL}`);
      const { data: users } = await sb.auth.admin.listUsers();
      const existing = users.users.find((u) => u.email === EMAIL);
      if (existing) {
        authUserId = existing.id;
        await sb.auth.admin.updateUserById(existing.id, { password: PASSWORD });
        console.log(`  🔑 Password reset for existing user`);
      }
    } else {
      throw new Error(`Failed to create auth user: ${createErr.message}`);
    }
  } else {
    authUserId = created.user.id;
    console.log(`  ✅ Auth user created: ${authUserId}`);
  }

  // ── 2. Merchant record (legacy schema) ─────────────────────────
  const merchantId = randomUUID();
  const passwordHash = hashPassword(PASSWORD);

  const record = {
    id: merchantId,
    name: BUSINESS_NAME,
    email: EMAIL,
    company: BUSINESS_NAME,
    website: WEBSITE,
    status: "active",
    api_keys: {},
    config: {
      email: EMAIL,
      password: passwordHash,
      environment: "production",
      businessName: BUSINESS_NAME,
      ownerName: OWNER_NAME,
      phone: PHONE,
      website: WEBSITE,
      businessType: "construction_group",
      country: "CA",
      monthlyVolume: "under_10k",
      plan: "Professional",
      status: "active",
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  console.log(`  🏪 Creating merchant record: ${BUSINESS_NAME} (${EMAIL})`);
  const { error: insertErr } = await sb.from("zenipay_merchants").insert(record);

  if (insertErr) {
    if (insertErr.message.includes("duplicate") || insertErr.code === "23505") {
      console.log(`  ⚠️ Merchant already exists`);
    } else {
      throw new Error(`Failed to create merchant: ${insertErr.message}`);
    }
  } else {
    console.log(`  ✅ Merchant record created: ${merchantId}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("🎉 ZeniCorp account created!");
  console.log("=".repeat(60));
  console.log("\n📋 Login Credentials:");
  console.log(`  🏪 MERCHANT (ZeniCorp):`);
  console.log(`     Email:    ${EMAIL}`);
  console.log(`     Password: ${PASSWORD}`);
  console.log(`     Status:   active (Professional plan)`);
  console.log(`     Merchant ID: ${merchantId}`);
  console.log(`     Auth User ID: ${authUserId}`);
  console.log("");
  console.log("🌐 Access URLs:");
  console.log("   Login:        https://zenipay.ca/login");
  console.log("   Merchant App: https://zenipay.ca/app/overview");
}

main().catch((err) => {
  console.error("❌ Fatal error:", err.message);
  process.exit(1);
});
