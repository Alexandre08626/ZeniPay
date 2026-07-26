#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function run() {
  // Try inserting a minimal record to see what columns are allowed
  console.log("=== Try minimal insert ===");
  const { data: insData, error: insError } = await sb
    .from("zenipay_merchants")
    .insert({ id: "test-schema-check", email: "test@test.ca", business_name: "Test" })
    .select();
  
  if (insError) {
    console.log("Insert error:", insError.message);
    console.log("Details:", JSON.stringify(insError, null, 2));
  } else {
    console.log("Insert success:", JSON.stringify(insData, null, 2));
  }
  
  // Try to get the table definition via the OpenAPI schema
  console.log("\n=== Try to infer schema by trying various columns ===");
  
  const testColumns = [
    { id: "test-c1", email: "t1@t.ca", business_name: "T1" },
    { id: "test-c2", email: "t2@t.ca", business_name: "T2", status: "active" },
    { id: "test-c3", email: "t3@t.ca", business_name: "T3", plan: "Standard" },
  ];
  
  for (const tc of testColumns) {
    const { error } = await sb.from("zenipay_merchants").upsert(tc, { onConflict: "id" });
    if (error) {
      console.log(`Failed with ${Object.keys(tc).join(",")}: ${error.message}`);
    } else {
      console.log(`OK with ${Object.keys(tc).join(",")}`);
    }
  }
  
  // Cleanup
  await sb.from("zenipay_merchants").delete().in("id", ["test-schema-check", "test-c1", "test-c2", "test-c3"]);
  
  // Check primary migration
  console.log("\n=== Existing columns via select ===");
  const { data: sample } = await sb.from("zenipay_merchants").select("*").limit(1);
  if (sample && sample.length > 0) {
    console.log("Columns:", Object.keys(sample[0]));
    console.log("Sample:", JSON.stringify(sample[0], null, 2));
  } else {
    console.log("No rows found (table empty)");
    // Try to select any column
    const { data: anyData, error: anyError } = await sb.from("zenipay_merchants").select("id").limit(1);
    if (anyError) {
      console.log("Even id fails:", anyError.message);
    } else {
      console.log("Table has id column, but is empty");
      // Add a minimal row to see schema
      const { data: ins, error: insErr } = await sb.from("zenipay_merchants").insert({ id: "schema-check", email: "s@c.ca", business_name: "SchemaCheck" }).select();
      if (insErr) {
        console.log("Cannot insert even minimal:", insErr.message);
      } else {
        console.log("Inserted:", JSON.stringify(ins, null, 2));
        console.log("Columns:", Object.keys(ins[0]));
        await sb.from("zenipay_merchants").delete().eq("id", "schema-check");
      }
    }
  }
  
  // List auth users
  console.log("\n=== Auth Users ===");
  const { data: users } = await sb.auth.admin.listUsers();
  if (users) {
    console.log("Found", users.users.length, "users:");
    users.users.forEach(u => console.log(`  ${u.email} (${u.id})`));
  }
}

run().catch(console.error);
