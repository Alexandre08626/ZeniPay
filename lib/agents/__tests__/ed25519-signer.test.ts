// Ed25519 signer unit tests — sign/verify roundtrip + tamper rejection.
//
// These tests bypass Vault entirely: they generate a keypair locally and
// exercise canonicalSignedManifest + rawPublicKeyToPem + pemToBase64Raw.
// No DB. No network.

import { describe, it, expect } from "vitest";
import { generateKeypair, sign, verify } from "../crypto";
import {
  canonicalSignedManifest,
  rawPublicKeyToPem,
  rawPrivateKeyToPem,
  pemToBase64Raw,
} from "../audit/ed25519-signer";
import type { SignedManifest } from "../audit/types";

describe("ed25519-signer", () => {
  it("canonicalSignedManifest sorts keys alphabetically", () => {
    const m: SignedManifest = {
      format_version: "1",
      key_id: "zp_audit_v1",
      organization_id: "org_x",
      scope: "organization",
      scope_ref: null,
      window_start: "2026-04-01T00:00:00Z",
      window_end: "2026-04-02T00:00:00Z",
      row_count: 3,
      merkle_root_hex: "abc",
      generated_at: "2026-04-22T00:00:00Z",
    };
    const out = canonicalSignedManifest(m);
    // Keys should appear alphabetically — format_version before generated_at
    // before key_id before merkle_root_hex etc.
    const keys = Object.keys(JSON.parse(out));
    expect(keys).toEqual([...keys].sort());
  });

  it("rawPublicKeyToPem + pemToBase64Raw roundtrip", () => {
    const raw = Buffer.alloc(32);
    for (let i = 0; i < 32; i++) raw[i] = (i * 13) % 256;
    const pem = rawPublicKeyToPem(raw.toString("base64"));
    expect(pem).toMatch(/^-----BEGIN PUBLIC KEY-----/);
    expect(pem).toMatch(/-----END PUBLIC KEY-----\s*$/);
    const roundtrip = pemToBase64Raw(pem);
    expect(roundtrip).toBe(raw.toString("base64"));
  });

  it("sign/verify roundtrip with a fresh keypair", async () => {
    const kp = await generateKeypair();
    const message = "hello world";
    const sig = await sign(message, kp.privateKeyBase64);
    expect(await verify(sig, message, kp.publicKeyBase64)).toBe(true);
  });

  it("rejects a tampered message", async () => {
    const kp = await generateKeypair();
    const sig = await sign("original", kp.privateKeyBase64);
    expect(await verify(sig, "modified", kp.publicKeyBase64)).toBe(false);
  });

  it("rejects a signature produced by a different key", async () => {
    const kp1 = await generateKeypair();
    const kp2 = await generateKeypair();
    const sig = await sign("msg", kp1.privateKeyBase64);
    expect(await verify(sig, "msg", kp2.publicKeyBase64)).toBe(false);
  });

  it("end-to-end: signed manifest verifies via canonicalSignedManifest + crypto.verify", async () => {
    const kp = await generateKeypair();
    const m: SignedManifest = {
      format_version: "1",
      key_id: "zp_audit_v1",
      organization_id: "org_x",
      scope: "organization",
      scope_ref: null,
      window_start: "2026-04-01T00:00:00Z",
      window_end: "2026-04-02T00:00:00Z",
      row_count: 100,
      merkle_root_hex: "a".repeat(64),
      generated_at: "2026-04-22T00:00:00Z",
    };
    const canonical = canonicalSignedManifest(m);
    const sig = await sign(canonical, kp.privateKeyBase64);
    expect(await verify(sig, canonical, kp.publicKeyBase64)).toBe(true);

    // Mutate a field, re-canonicalize, verify must fail.
    const tampered = { ...m, row_count: 101 };
    expect(await verify(sig, canonicalSignedManifest(tampered), kp.publicKeyBase64)).toBe(false);
  });

  it("rawPrivateKeyToPem produces valid PEM header", () => {
    const raw = Buffer.alloc(32);
    const pem = rawPrivateKeyToPem(raw.toString("base64"));
    expect(pem).toMatch(/^-----BEGIN PRIVATE KEY-----/);
  });
});
