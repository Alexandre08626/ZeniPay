#!/usr/bin/env -S node --experimental-strip-types
// scripts/bootstrap-system-user.ts
//
// Idempotent: creates auth.users row for the ZeniPay Agents worker so the
// migration's created_by / updated_by columns can reference it. Safe to run
// multiple times (ON CONFLICT DO NOTHING semantics via Admin API).
//
// Run once before merging any PR that writes to agents tables from cron jobs:
//   AGENTS_SYSTEM_USER_ID=a9e75c0c-0000-4000-a000-000000000001 \
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//   npx tsx scripts/bootstrap-system-user.ts

const DEFAULT_ID = "a9e75c0c-0000-4000-a000-000000000001";
const DEFAULT_EMAIL = "agents-worker@internal.zenipay.ca";

async function main(): Promise<void> {
  const url = mustEnv("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  const key = mustEnv("SUPABASE_SERVICE_ROLE_KEY");
  const id = process.env.AGENTS_SYSTEM_USER_ID ?? DEFAULT_ID;
  const email = process.env.AGENTS_SYSTEM_USER_EMAIL ?? DEFAULT_EMAIL;

  console.log(`→ provisioning ${email} (${id})`);

  // Use the admin REST API directly — no Supabase JS client dep needed for
  // a bootstrap script.
  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      id,
      email,
      email_confirm: true,
      user_metadata: { system: true, purpose: "agents-worker", label: "ZeniPay Agents Worker" },
      app_metadata: { provider: "system", providers: ["system"] },
    }),
  });

  if (res.ok) {
    console.log("✓ created");
    return;
  }
  const body = (await res.json().catch(() => ({}))) as { code?: string; msg?: string; message?: string };
  // 422 "User already registered" or equivalent is fine — idempotent.
  const msg = (body.msg || body.message || "").toLowerCase();
  if (
    res.status === 422 ||
    res.status === 409 ||
    msg.includes("already") ||
    msg.includes("exists") ||
    body.code === "email_exists" ||
    body.code === "user_already_exists"
  ) {
    console.log(`✓ already exists (status ${res.status})`);
    return;
  }
  throw new Error(`createUser failed ${res.status}: ${JSON.stringify(body)}`);
}

function mustEnv(...names: string[]): string {
  for (const n of names) {
    const v = process.env[n];
    if (v) return v;
  }
  throw new Error(`missing env: ${names.join(" / ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
