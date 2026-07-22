#!/usr/bin/env -S node --experimental-strip-types
// scripts/create-zeniva-accounts.ts
//
// Creates two accounts on ZeniPay Merchant Platform:
// 1. Admin account for Zeniva (full platform access)
// 2. Merchant account for Zeniva Travel (payment processing)
//
// Prerequisites:
//   - Copy .env.local.template to .env.local and fill in Supabase credentials
//   - Run: npx tsx scripts/create-zeniva-accounts.ts
//
// Environment variables needed:
//   SUPABASE_URL=https://your-project.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
//   ADMIN_EMAIL=admin@zeniva.ca
//   ADMIN_PASSWORD=your_secure_password
//   MERCHANT_EMAIL=payments@zeniva.ca
//   MERCHANT_PASSWORD=your_secure_password

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { hashPassword } from "../modules/zenipay/services/auth";
import { generateApiKey, generateApiSecret, generateMerchantId } from "../modules/zenipay/services/keys";

function getEnv(name: string, ...keys: string[]): string {
  for (const k of keys) {
    const v = process.env[k];
    if (v) return v;
  }
  throw new Error(`Missing env: ${name} (tried ${keys.join(", ")})`);
}

async function createAuthUser(
  adminClient: SupabaseClient,
  email: string,
  password: string,
  userId: string,
  userMetadata: Record<string, unknown>
): Promise<{ id: string; email: string } | null> {
  console.log(`  Creating Supabase Auth user: ${email}`);

  const { data, error } = await adminClient.auth.admin.createUser({
    id: userId,
    email,
    password,
    email_confirm: true,
    user_metadata: userMetadata,
    app_metadata: { provider: "email", providers: ["email"] },
  });

  if (error) {
    if (error.message.includes("already") || error.message.includes("exists")) {
      console.log(`  ⚠️ User already exists (${email})`);
      // Try to get existing user
      const { data: users } = await adminClient.auth.admin.listUsers();
      const existing = users.users.find((u) => u.email === email);
      return existing ? { id: existing.id, email: existing.email } : null;
    }
    throw new Error(`Failed to create user ${email}: ${error.message}`);
  }

  console.log(`  ✅ Created user: ${data.user.id}`);
  return { id: data.user.id, email: data.user.email! };
}

async function createMerchantRecord(
  adminClient: SupabaseClient,
  merchant: {
    id: string;
    authUserId: string;
    businessName: string;
    ownerName: string;
    email: string;
    phone?: string;
    website?: string;
    businessType?: string;
    country?: string;
    monthlyVolume?: string;
    status: string;
    plan: string;
    sandboxKey: string;
    sandboxSecret: string;
    liveKey: string;
    liveSecret: string;
    passwordHash: string;
  }
): Promise<void> {
  console.log(`  Creating merchant record: ${merchant.businessName} (${merchant.email})`);

  const { error } = await adminClient.from("zenipay_merchants").upsert({
    id: merchant.id,
    auth_user_id: merchant.authUserId,
    business_name: merchant.businessName,
    owner_name: merchant.ownerName,
    email: merchant.email,
    phone: merchant.phone ?? null,
    website: merchant.website ?? null,
    business_type: merchant.businessType ?? null,
    country: merchant.country ?? null,
    monthly_volume: merchant.monthlyVolume ?? null,
    status: merchant.status,
    plan: merchant.plan,
    sandbox_key: merchant.sandboxKey,
    sandbox_secret: merchant.sandboxSecret,
    live_key: merchant.liveKey,
    live_secret: merchant.liveSecret,
    volume: 0,
    tx_count: 0,
    balance: 0,
    notes: "",
    onboarding_state: "completed",
    merchant_data: {
      email: merchant.email,
      businessName: merchant.businessName,
      ownerName: merchant.ownerName,
      phone: merchant.phone ?? "",
      website: merchant.website ?? "",
      businessType: merchant.businessType ?? "",
      country: merchant.country ?? "",
      monthlyVolume: merchant.monthlyVolume ?? "",
      plan: merchant.plan,
      status: merchant.status,
      password: merchant.passwordHash,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });

  if (error) {
    if (error.message.includes("duplicate") || error.code === "23505") {
      console.log(`  ⚠️ Merchant already exists`);
      return;
    }
    throw new Error(`Failed to create merchant: ${error.message}`);
  }

  console.log(`  ✅ Created merchant: ${merchant.id}`);
}

async function main(): Promise<void> {
  console.log("🚀 Creating Zeniva accounts on ZeniPay Merchant Platform...\n");

  // Load environment
  const supabaseUrl = getEnv("Supabase URL", "SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = getEnv("Supabase Service Key", "SUPABASE_SERVICE_ROLE_KEY");

  const adminEmail = process.env.ADMIN_EMAIL || "admin@zeniva.ca";
  const adminPassword = process.env.ADMIN_PASSWORD || "ZenivaAdmin2026!";
  const merchantEmail = process.env.MERCHANT_EMAIL || "payments@zeniva.ca";
  const merchantPassword = process.env.MERCHANT_PASSWORD || "ZenivaPayments2026!";

  // Create Supabase admin client
  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ═══════════════════════════════════════════════════════════════
  // ADMIN ACCOUNT (Zeniva Platform Admin)
  // ═══════════════════════════════════════════════════════════════
  console.log("👑 Creating Admin Account (Zeniva Platform Admin)");
  console.log("═".repeat(60));

  const adminId = "zeniva-admin-001";
  const adminAuthId = "a9e75c0c-0000-4000-a000-000000000002";

  const adminUser = await createAuthUser(adminClient, adminEmail, adminPassword, adminAuthId, {
    role: "admin",
    platform: "zenipay",
    label: "Zeniva Platform Admin",
    permissions: ["all"],
    merchant_id: adminId,
  });

  if (adminUser) {
    await createMerchantRecord(adminClient, {
      id: adminId,
      authUserId: adminUser.id,
      businessName: "Zeniva Platform",
      ownerName: "Zeniva Admin",
      email: adminEmail,
      phone: "+1-581-748-7017",
      website: "https://zenivatravel.com",
      businessType: "platform",
      country: "CA",
      monthlyVolume: "10000000",
      status: "active",
      plan: "Enterprise",
      sandboxKey: generateApiKey("zpk_sb_admin"),
      sandboxSecret: generateApiSecret("zps_sb_admin"),
      liveKey: generateApiKey("zpk_lk_admin"),
      liveSecret: generateApiSecret("zps_lk_admin"),
      passwordHash: await hashPassword(adminPassword),
    });
  }

  console.log("");

  // ═══════════════════════════════════════════════════════════════
  // MERCHANT ACCOUNT (Zeniva Travel)
  // ═══════════════════════════════════════════════════════════════
  console.log("🏪 Creating Merchant Account (Zeniva Travel)");
  console.log("═".repeat(60));

  const merchantId = generateMerchantId(); // e.g., mer_abc123...
  const merchantAuthId = "a9e75c0c-0000-4000-a000-000000000003";

  const merchantUser = await createAuthUser(adminClient, merchantEmail, merchantPassword, merchantAuthId, {
    role: "merchant",
    platform: "zenipay",
    label: "Zeniva Travel Merchant",
    businessName: "Zeniva Travel",
    merchant_id: merchantId,
  });

  if (merchantUser) {
    await createMerchantRecord(adminClient, {
      id: merchantId,
      authUserId: merchantUser.id,
      businessName: "Zeniva Travel",
      ownerName: "Alexandre Dupont",
      email: merchantEmail,
      phone: "+1-581-748-7017",
      website: "https://zenivatravel.com",
      businessType: "travel_agency",
      country: "CA",
      monthlyVolume: "5000000",
      status: "sandbox",
      plan: "Professional",
      sandboxKey: generateApiKey("zpk_sb_zeniva"),
      sandboxSecret: generateApiSecret("zps_sb_zeniva"),
      liveKey: generateApiKey("zpk_lk_zeniva"),
      liveSecret: generateApiSecret("zps_lk_zeniva"),
      passwordHash: await hashPassword(merchantPassword),
    });
  }

  console.log("");
  console.log("🎉 Account creation complete!");
  console.log("═".repeat(60));
  console.log("");
  console.log("📋 Login Credentials:");
  console.log("");
  console.log("  👑 ADMIN (Zeniva Platform):");
  console.log(`     Email:    ${adminEmail}`);
  console.log(`     Password: ${adminPassword}`);
  console.log(`     Status:   active (Enterprise plan)`);
  console.log(`     Sandbox:  ${generateApiKey("zpk_sb_admin")} / ${generateApiSecret("zps_sb_admin")}`);
  console.log(`     Live:     ${generateApiKey("zpk_lk_admin")} / ${generateApiSecret("zps_lk_admin")}`);
  console.log("");
  console.log("  🏪 MERCHANT (Zeniva Travel):");
  console.log(`     Email:    ${merchantEmail}`);
  console.log(`     Password: ${merchantPassword}`);
  console.log(`     Status:   sandbox (Professional plan)`);
  console.log(`     Sandbox:  ${generateApiKey("zpk_sb_zeniva")} / ${generateApiSecret("zps_sb_zeniva")}`);
  console.log(`     Live:     ${generateApiKey("zpk_lk_zeniva")} / ${generateApiSecret("zps_lk_zeniva")}`);
  console.log("");
  console.log("🌐 Access URLs (zenipay.ca production):");
  console.log("   Login:        https://zenipay.ca/login");
  console.log("   Admin Login:  https://zenipay.ca/admin/login");
  console.log("   Admin Dash:   https://zenipay.ca/admin");
  console.log("   Merchant App: https://zenipay.ca/app/overview");
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});