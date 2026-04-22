#!/usr/bin/env -S node --experimental-strip-types
// scripts/bootstrap-audit-signing-key.ts
//
// One-shot. Creates the first global Ed25519 audit signing key:
//   1. Generates a 32-byte seed via @noble/ed25519.
//   2. Stores the seed (base64) in Supabase Vault under secret name
//      "zp_audit_signing_key_v1".
//   3. Derives the public key, PEM-encodes it.
//   4. Calls agents.register_audit_signing_key() — idempotent, so re-running
//      won't create a second active key.
//   5. Writes the PEM to public/.well-known/audit-signing-key.pub so
//      auditors can fetch it over HTTP at /.well-known/audit-signing-key.pub.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//   npx tsx scripts/bootstrap-audit-signing-key.ts [--key-id=zp_audit_v1]

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { generateKeypair } from "../lib/agents/crypto";
import { rawPublicKeyToPem } from "../lib/agents/audit/ed25519-signer";
import { storeSecret } from "../lib/agents/approvals/vault-secrets";

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) { console.error(`missing env: ${name}`); process.exit(1); }
  return v;
}

async function main(): Promise<void> {
  const SUPABASE_URL = mustEnv("SUPABASE_URL");
  const SERVICE_ROLE_KEY = mustEnv("SUPABASE_SERVICE_ROLE_KEY");
  const keyId = argv("key-id") ?? "zp_audit_v1";

  const agentsDb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "agents" },
  });

  // Check for an existing active key — early exit.
  const { data: existing } = await agentsDb
    .from("zp_audit_keys")
    .select("key_id")
    .is("retired_at", null)
    .limit(1)
    .maybeSingle();
  if (existing) {
    console.log(`already bootstrapped: active key_id=${(existing as { key_id: string }).key_id}`);
    return;
  }

  console.log("generating fresh Ed25519 keypair…");
  const kp = await generateKeypair();
  const publicKeyPem = rawPublicKeyToPem(kp.publicKeyBase64);

  console.log("storing private seed in Vault…");
  const { vault_secret_id } = await storeSecret(
    kp.privateKeyBase64,
    `zp_audit_signing_key_${keyId}`,
    "ZeniPay Agents — audit export signing seed",
  );
  console.log(`vault_secret_id=${vault_secret_id}`);

  console.log("registering key in agents.zp_audit_keys…");
  const { data: registered, error: regErr } = await agentsDb.rpc("register_audit_signing_key", {
    p_key_id: keyId,
    p_public_key_pem: publicKeyPem,
    p_vault_secret_id: vault_secret_id,
    p_actor: null,
  });
  if (regErr) { console.error(`register_audit_signing_key: ${regErr.message}`); process.exit(1); }
  console.log(`registered: ${String(registered)}`);

  // Write the public key to the well-known path so auditors can verify
  // without hitting the API. Commit this file to source control.
  const pubPath = join(process.cwd(), "public", ".well-known", "audit-signing-key.pub");
  mkdirSync(dirname(pubPath), { recursive: true });
  const pemWithHeader =
    `# ZeniPay Agents audit-signing public key\n` +
    `# key_id: ${keyId}\n` +
    `# algorithm: Ed25519\n` +
    `# created_at: ${new Date().toISOString()}\n` +
    `# verify at: https://zenipay.ca/.well-known/audit-signing-key.pub\n` +
    publicKeyPem;
  writeFileSync(pubPath, pemWithHeader, "utf8");
  console.log(`wrote ${pubPath}`);

  console.log("\ndone. commit public/.well-known/audit-signing-key.pub before pushing.");
}

function argv(name: string): string | null {
  const flag = `--${name}=`;
  const a = process.argv.find((x) => x.startsWith(flag));
  return a ? a.slice(flag.length) : null;
}

main().catch((e) => { console.error(e); process.exit(1); });
