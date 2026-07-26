#!/usr/bin/env node
// Creates auth users + merchant records for ZeniPay
// Works without requiring auth_user_id column to exist yet

import { createClient } from "@supabase/supabase-js";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = scryptSync(password, salt, 64);
  return `${salt}:${buf.toString("hex")}`;
}

async function createOrGetUser(email, password, id, metadata) {
  console.log(`  📧 Creating Supabase Auth user: ${email}`);
  const { data, error } = await sb.auth.admin.createUser({
    id,
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
    app_metadata: { provider: "email", providers: ["email"] },
  });
  if (error) {
    if (error.message.includes("already") || error.message.includes("exists")) {
      console.log(`  ⚠️ User already exists: ${email}`);
      // Try to get the existing user
      const { data: users } = await sb.auth.admin.listUsers();
      const existing = users.users.find((u) => u.email === email);
      if (existing) {
        // Reset password
        console.log(`  🔑 Resetting password for ${email}`);
        await sb.auth.admin.updateUserById(existing.id, { password });
        return existing;
      }
      return null;
    }
    throw new Error(`Failed to create user ${email}: ${error.message}`);
  }
  console.log(`  ✅ Created user: ${data.user.id}`);
  return data.user;
}

async function upsertMerchant(record) {
  console.log(`  🏪 Creating merchant record: ${record.email}`);
  
  // Try with auth_user_id first
  const { error } = await sb.from("zenipay_merchants").upsert(record, { onConflict: "id" });
  
  if (error && error.message?.includes("auth_user_id")) {
    console.log(`  ⚠️ auth_user_id column not found, retrying without it...`);
    const { id, auth_user_id, ...recordWithoutAuth } = record;
    const { error: error2 } = await sb.from("zenipay_merchants").upsert(recordWithoutAuth, { onConflict: "id" });
    if (error2) {
      if (error2.message?.includes("duplicate") || error2.code === "23505") {
        console.log(`  ⚠️ Merchant already exists, skipping`);
        return;
      }
      if (error2.message?.includes("onboarding_state")) {
        const { onboarding_state, ...recordWithoutOnboarding } = recordWithoutAuth;
        const { error: error3 } = await sb.from("zenipay_merchants").upsert(recordWithoutOnboarding, { onConflict: "id" });
        if (error3) {
          throw new Error(`Failed to create merchant (retry 2): ${error3.message}`);
        }
      } else {
        throw new Error(`Failed to create merchant (retry): ${error2.message}`);
      }
    } else {
      console.log(`  ✅ Created merchant (without auth_user_id)`);
    }
  } else if (error) {
    if (error.message?.includes("duplicate") || error.code === "23505") {
      console.log(`  ⚠️ Merchant already exists, skipping`);
      return;
    }
    // Maybe onboarding_state is missing
    if (error.message?.includes("onboarding_state")) {
      const { onboarding_state, ...rest } = record;
      const { error: error3 } = await sb.from("zenipay_merchants").upsert(rest, { onConflict: "id" });
      if (error3) throw new Error(`Failed: ${error3.message}`);
      console.log(`  ✅ Created merchant (without onboarding_state)`);
    } else {
      throw new Error(`Failed to create merchant: ${error.message}`);
    }
  } else {
    console.log(`  ✅ Created merchant`);
  }
}

async function main() {
  console.log("🚀 Creating ZeniPay accounts...\n");

  const accounts = [
    {
      id: "zeniva-admin-001",
      authUserId: "a9e75c0c-0000-4000-a000-000000000002",
      email: "admin@zeniva.ca",
      password: "ZenivaAdmin2026!",
      businessName: "Zeniva Platform",
      ownerName: "Zeniva Admin",
      status: "active",
      plan: "Enterprise",
    },
    {
      id: "zeniva-merchant-001",
      authUserId: "a9e75c0c-0000-4000-a000-000000000003",
      email: "payments@zeniva.ca",
      password: "ZenivaPayments2026!",
      businessName: "Zeniva Travel",
      ownerName: "Zeniva Travel",
      status: "sandbox",
      plan: "Professional",
    },
    {
      id: "zeniva-dev-001",
      authUserId: "a9e75c0c-0000-4000-a000-000000000004",
      email: "dev@zeniva.ca",
      password: "ZenivaDev2026!",
      businessName: "Zeniva Development",
      ownerName: "Zeniva Dev",
      status: "active",
      plan: "Enterprise",
    },
  ];

  for (const acct of accounts) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`📋 ${acct.businessName} (${acct.email})`);
    console.log(`=${"=".repeat(59)}`);

    const user = await createOrGetUser(acct.email, acct.password, acct.authUserId, {
      role: acct.id.includes("admin") ? "admin" : "merchant",
      platform: "zenipay",
      label: acct.businessName,
      merchant_id: acct.id,
    });

    const merchantRecord = {
      id: acct.id,
      auth_user_id: user?.id || acct.authUserId,
      business_name: acct.businessName,
      owner_name: acct.ownerName,
      email: acct.email,
      phone: "+1-581-748-7017",
      website: "https://zenivatravel.com",
      business_type: acct.id.includes("admin") ? "platform" : "travel_agency",
      country: "CA",
      monthly_volume: "10000000",
      status: acct.status,
      plan: acct.plan,
      sandbox_key: `zpk_sb_${acct.id}`,
      sandbox_secret: `zps_sb_${acct.id}`,
      live_key: `zpk_lk_${acct.id}`,
      live_secret: `zps_lk_${acct.id}`,
      volume: 0,
      tx_count: 0,
      balance: 100000, // Give them some starting balance
      notes: "",
      onboarding_state: "completed",
      merchant_data: {
        email: acct.email,
        businessName: acct.businessName,
        ownerName: acct.ownerName,
        phone: "+1-581-748-7017",
        website: "https://zenivatravel.com",
        businessType: acct.id.includes("admin") ? "platform" : "travel_agency",
        country: "CA",
        monthlyVolume: "10000000",
        plan: acct.plan,
        status: acct.status,
        password: hashPassword(acct.password),
      },
    };

    await upsertMerchant(merchantRecord);
  }

  console.log("\n" + "=".repeat(60));
  console.log("🎉 ALL ACCOUNTS CREATED!");
  console.log("=".repeat(60));
  console.log("\n📋 Login Credentials:");
  console.log("  👑 admin@zeniva.ca   / ZenivaAdmin2026!    (Admin)");
  console.log("  🏪 payments@zeniva.ca / ZenivaPayments2026! (Merchant)");
  console.log("  🧪 dev@zeniva.ca      / ZenivaDev2026!      (Dev)");
  console.log("\n🌐 https://zenipay.ca/login");
}

main().catch((err) => {
  console.error("❌ Fatal error:", err.message);
  process.exit(1);
});
