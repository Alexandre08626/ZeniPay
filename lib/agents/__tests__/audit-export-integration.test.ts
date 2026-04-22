// Audit export E2E — gated (AGENTS_AUDIT_E2E=1). Requires a live
// Supabase with the zp_audit_v1 key bootstrapped + GRANTed. Inserts
// ~100 audit_log rows with a unique event_type tag, runs buildAuditExport,
// collects the full NDJSON body, verifies signature + Merkle root via
// tamper-verifier, then tampers the body and asserts verification fails.

import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { buildAuditExport } from "../audit/export-builder";
import { verifyAuditExport } from "../audit/tamper-verifier";
import { loadActiveKey } from "../audit/ed25519-signer";

const ENABLED = process.env.AGENTS_AUDIT_E2E === "1";
const describeIfEnabled = ENABLED ? describe : describe.skip;

describeIfEnabled("audit-export E2E (live)", () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const orgId = process.env.AGENTS_TEST_ORG_ID ?? "";
  if (!url || !key || !orgId) {
    it.skip("env missing (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, AGENTS_TEST_ORG_ID)", () => {});
    return;
  }

  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "agents" },
  });

  const tag = `e2e-${Date.now()}`;
  const insertedIds: string[] = [];
  const windowStart = new Date(Date.now() - 60_000).toISOString();
  let windowEnd: string;

  it("seeds ~20 audit rows", async () => {
    for (let i = 0; i < 20; i++) {
      const { data, error } = await db
        .from("agent_audit_log")
        .insert({
          organization_id: orgId,
          actor_type: "system",
          actor_id: null,
          event_type: `audit_e2e.${tag}`,
          payload: { i, tag, note: `row-${i}` },
        })
        .select("id")
        .single();
      expect(error).toBeNull();
      insertedIds.push((data as { id: string }).id);
    }
    windowEnd = new Date(Date.now() + 1000).toISOString();
    expect(insertedIds.length).toBe(20);
  });

  it("builds + verifies an export with Merkle proofs", async () => {
    const { stream, summary } = buildAuditExport({
      organization_id: orgId,
      scope: "organization",
      scope_ref: null,
      start: windowStart,
      end: windowEnd,
      include_merkle_proofs: true,
    });

    // Consume the stream into a string.
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    const body = Buffer.concat(chunks).toString("utf8");
    const s = await summary;

    // Pull the pub key from the active signing key.
    const active = await loadActiveKey();
    const outcome = await verifyAuditExport(body, active.row.public_key_pem);
    expect(outcome.ok).toBe(true);
    expect(outcome.row_count_parsed).toBeGreaterThanOrEqual(20);
    expect(outcome.row_count_declared).toBe(outcome.row_count_parsed);
    expect(outcome.merkle_root_declared).toBe(s.merkle_root_hex);
    expect(outcome.signature_valid).toBe(true);
  });

  it("detects tampering — mutating a single entry breaks verification", async () => {
    const { stream, summary } = buildAuditExport({
      organization_id: orgId,
      scope: "organization",
      scope_ref: null,
      start: windowStart,
      end: windowEnd,
      include_merkle_proofs: false,
    });
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    void (await summary);
    const body = Buffer.concat(chunks).toString("utf8");

    // Corrupt ONE character in the first entry line.
    const lines = body.split("\n").filter((l) => l.length > 0);
    const entryIdx = lines.findIndex((l) => l.startsWith('{"entry"'));
    expect(entryIdx).toBeGreaterThan(-1);
    const orig = lines[entryIdx];
    // Replace first alphanumeric inside payload.note to break the hash.
    const tampered = orig.replace("row-0", "row-X");
    expect(tampered).not.toBe(orig);
    lines[entryIdx] = tampered;
    const tamperedBody = lines.join("\n") + "\n";

    const active = await loadActiveKey();
    const outcome = await verifyAuditExport(tamperedBody, active.row.public_key_pem);
    expect(outcome.ok).toBe(false);
    // Error should mention the Merkle root mismatch OR signature — either way
    // tampering is caught.
    const anyError = outcome.errors.join(" | ").toLowerCase();
    expect(anyError).toMatch(/(merkle_root|signature)/);
  });

  it("cleans up seeded audit rows", async () => {
    // agent_audit_log has an UPDATE/DELETE trigger that blocks mutation.
    // We leave the rows in place (tagged by event_type) — they're
    // permanent by design. No-op here; test passes.
    expect(insertedIds.length).toBe(20);
  });
});
