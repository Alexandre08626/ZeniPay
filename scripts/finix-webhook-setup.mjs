#!/usr/bin/env node
// scripts/finix-webhook-setup.mjs
//
// Ensure the Finix webhook for zenipay.ca exists and is subscribed to the
// events the handler at app/api/zenipay/webhooks/finix/route.ts needs —
// in particular settlement.updated, which carries the APPROVED transition
// (money swept to the bank → balances reset to 0).
//
// Uses FINIX_ENV to pick sandbox vs live. Read-only unless --apply.
//
//   FINIX_API_USERNAME=... FINIX_API_PASSWORD=... FINIX_ENV=production \
//   node scripts/finix-webhook-setup.mjs [--apply]

const APPLY = process.argv.includes("--apply");
const URL_ = process.env.ZENIPAY_WEBHOOK_URL || "https://zenipay.ca/api/zenipay/webhooks/finix";

const USER = process.env.FINIX_API_USERNAME;
const PASS = process.env.FINIX_API_PASSWORD;
if (!USER || !PASS) { console.error("Missing FINIX_API_USERNAME / FINIX_API_PASSWORD"); process.exit(1); }
const BASE = process.env.FINIX_ENV === "production"
  ? "https://finix.live-payments-api.com"
  : "https://finix.sandbox-payments-api.com";

// Everything the route handles today.
const REQUIRED = {
  settlement: ["created", "updated", "accruing_started"],
  transfer:   ["created", "updated"],
  merchant:   ["created", "updated", "underwritten"],
  dispute:    ["created", "updated"],
};

async function finix(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: "Basic " + Buffer.from(`${USER}:${PASS}`).toString("base64"),
      "Finix-Version": "2022-02-01",
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`${method} ${path} → HTTP ${res.status}: ${text.slice(0, 400)}`);
  return json;
}

function merged(existingEvents) {
  const byEntity = new Map();
  for (const e of existingEvents || []) byEntity.set(e.entity, new Set(e.types || []));
  for (const [entity, types] of Object.entries(REQUIRED)) {
    const set = byEntity.get(entity) || new Set();
    types.forEach((t) => set.add(t));
    byEntity.set(entity, set);
  }
  return [...byEntity.entries()].map(([entity, types]) => ({ entity, types: [...types] }));
}

async function main() {
  console.log(`[webhook-setup] env=${process.env.FINIX_ENV || "sandbox"} base=${BASE} mode=${APPLY ? "APPLY" : "DRY-RUN"}`);
  const list = await finix("GET", "/webhooks?limit=100");
  const hooks = list?._embedded?.webhooks ?? [];
  console.log(`[webhook-setup] ${hooks.length} webhook(s) configured`);
  for (const w of hooks) console.log(`  ${w.id}  enabled=${w.enabled}  ${w.url}`);

  const mine = hooks.find((w) => w.url === URL_);

  if (!mine) {
    console.log(`[webhook-setup] no webhook for ${URL_} → will CREATE with events:`);
    console.log("  " + JSON.stringify(merged([])));
    if (APPLY) {
      // Finix requires an authentication block. We rely on the
      // Finix-Signature HMAC for verification; the BASIC credentials are
      // just a random pair Finix will echo back on each delivery.
      const { randomBytes } = await import("node:crypto");
      const created = await finix("POST", "/webhooks", {
        url: URL_,
        enabled_events: merged([]),
        nickname: `ZeniPay ${process.env.FINIX_ENV || "sandbox"}`,
        authentication: {
          type: "BASIC",
          basic: { username: "zenipay-webhook", password: randomBytes(24).toString("hex") },
        },
      });
      console.log(`[webhook-setup] created ${created.id}`);
      const key = created.secret_signing_key || created.secret;
      if (key) {
        // Shown only once by Finix. Write it to a file instead of the
        // terminal so it can be piped into `vercel env add`.
        const out = process.env.SIGNING_KEY_OUT || `finix-signing-key.${process.env.FINIX_ENV || "sandbox"}.txt`;
        const { writeFileSync } = await import("node:fs");
        writeFileSync(out, key, { mode: 0o600 });
        console.log(`[webhook-setup] secret_signing_key written to ${out} → set it as FINIX_WEBHOOK_SECRET in Vercel, then delete the file.`);
      } else {
        console.warn("[webhook-setup] ⚠️  no secret_signing_key in response — check the Finix dashboard.");
      }
    }
    return;
  }

  const current = mine.enabled_events || [];
  const want = merged(current);
  const missing = [];
  for (const [entity, types] of Object.entries(REQUIRED)) {
    const have = new Set((current.find((e) => e.entity === entity) || {}).types || []);
    for (const t of types) if (!have.has(t)) missing.push(`${entity}.${t}`);
  }
  if (!missing.length && mine.enabled) { console.log(`[webhook-setup] ${mine.id} already OK.`); return; }

  console.log(`[webhook-setup] ${mine.id} missing: ${missing.join(", ") || "(none)"}${mine.enabled ? "" : " — and DISABLED"}`);
  if (APPLY) {
    await finix("PUT", `/webhooks/${mine.id}`, { enabled: true, enabled_events: want });
    console.log(`[webhook-setup] updated ${mine.id}`);
  }
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
