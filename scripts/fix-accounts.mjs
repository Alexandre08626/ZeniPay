#!/usr/bin/env node
// Reset auth user passwords + store password hash in merchant config
import { createClient } from "@supabase/supabase-js";
import { randomBytes, scryptSync } from "node:crypto";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = scryptSync(password, salt, 64);
  return `${salt}:${buf.toString("hex")}`;
}

async function main() {
  // Accounts to fix: auth user + merchant record
  const accounts = [
    { email: "dev@zeniva.ca",     password: "ZenivaDev2026!" },
    { email: "admin@zeniva.ca",   password: "ZenivaAdmin2026!" },
    { email: "payments@zeniva.ca", password: "ZenivaPayments2026!" },
  ];

  // 1. List auth users to find their IDs
  const { data: usersData } = await sb.auth.admin.listUsers();
  const users = usersData?.users || [];

  for (const acct of accounts) {
    console.log(`\n=== ${acct.email} ===`);
    
    // Find auth user
    let user = users.find(u => u.email === acct.email);
    
    if (user) {
      // Reset password
      console.log(`  Auth user found: ${user.id}`);
      const { error: pwError } = await sb.auth.admin.updateUserById(user.id, { password: acct.password });
      if (pwError) {
        console.log(`  ❌ Password reset failed: ${pwError.message}`);
      } else {
        console.log(`  ✅ Password reset to: ${acct.password}`);
      }
    } else {
      // Create auth user
      console.log(`  Auth user not found, creating...`);
      const { data: newUser, error: createError } = await sb.auth.admin.createUser({
        email: acct.email,
        password: acct.password,
        email_confirm: true,
      });
      if (createError) {
        console.log(`  ❌ Create failed: ${createError.message}`);
        continue;
      }
      user = newUser.user;
      console.log(`  ✅ Created auth user: ${user.id}`);
    }

    // 2. Find merchant record and update config
    const { data: merchants, error: mErr } = await sb
      .from("zenipay_merchants")
      .select("id, email, name, config")
      .eq("email", acct.email);

    if (mErr) {
      console.log(`  ❌ Merchant lookup failed: ${mErr.message}`);
      continue;
    }

    if (!merchants || merchants.length === 0) {
      console.log(`  ⚠️ No merchant record found. Creating one...`);
      const h = hashPassword(acct.password);
      const { error: insErr } = await sb.from("zenipay_merchants").insert({
        id: `merchant-${acct.email.replace(/[^a-z0-9]/g, "-")}`,
        email: acct.email,
        name: acct.email === "admin@zeniva.ca" ? "Zeniva Admin" : "Zeniva Travel",
        status: "active",
        config: {
          environment: "production",
          password: h,
          email: acct.email,
        }
      });
      if (insErr) {
        console.log(`  ❌ Create merchant failed: ${insErr.message}`);
      } else {
        console.log(`  ✅ Created merchant record`);
      }
    } else {
      const merchant = merchants[0];
      console.log(`  Merchant found: ${merchant.id} (${merchant.name})`);

      // Update config with password hash
      const currentConfig = merchant.config || {};
      const h = hashPassword(acct.password);
      currentConfig.password = h;
      
      const { error: updErr } = await sb
        .from("zenipay_merchants")
        .update({ config: currentConfig })
        .eq("id", merchant.id);
      
      if (updErr) {
        console.log(`  ❌ Config update failed: ${updErr.message}`);
      } else {
        console.log(`  ✅ Password hash stored in config`);
      }
    }
  }

  console.log("\n=== Summary ===");
  console.log("dev@zeniva.ca     / ZenivaDev2026!");
  console.log("admin@zeniva.ca   / ZenivaAdmin2026!");
  console.log("payments@zeniva.ca / ZenivaPayments2026!");
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
