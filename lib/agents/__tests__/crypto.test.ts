import { describe, it, expect } from "vitest";
import {
  generateKeypair,
  sign,
  verify,
  canonicalJsonForSigning,
} from "../crypto";

describe("crypto.generateKeypair", () => {
  it("produces a 32-byte private key and 32-byte public key (base64)", async () => {
    const kp = await generateKeypair();
    expect(Buffer.from(kp.privateKeyBase64, "base64").length).toBe(32);
    expect(Buffer.from(kp.publicKeyBase64, "base64").length).toBe(32);
  });

  it("produces unique keys on each call", async () => {
    const a = await generateKeypair();
    const b = await generateKeypair();
    expect(a.privateKeyBase64).not.toBe(b.privateKeyBase64);
    expect(a.publicKeyBase64).not.toBe(b.publicKeyBase64);
  });
});

describe("crypto.sign/verify", () => {
  it("round-trips a string message", async () => {
    const kp = await generateKeypair();
    const sig = await sign("hello agents", kp.privateKeyBase64);
    expect(await verify(sig, "hello agents", kp.publicKeyBase64)).toBe(true);
  });

  it("rejects a wrong message", async () => {
    const kp = await generateKeypair();
    const sig = await sign("hello", kp.privateKeyBase64);
    expect(await verify(sig, "goodbye", kp.publicKeyBase64)).toBe(false);
  });

  it("rejects a wrong public key", async () => {
    const kpA = await generateKeypair();
    const kpB = await generateKeypair();
    const sig = await sign("x", kpA.privateKeyBase64);
    expect(await verify(sig, "x", kpB.publicKeyBase64)).toBe(false);
  });

  it("returns false on malformed signature without throwing", async () => {
    const kp = await generateKeypair();
    expect(await verify("not-base64!!!", "x", kp.publicKeyBase64)).toBe(false);
    expect(await verify("AAAA", "x", kp.publicKeyBase64)).toBe(false);
  });
});

describe("crypto.canonicalJsonForSigning", () => {
  it("produces identical bytes regardless of key insertion order", () => {
    const a = canonicalJsonForSigning({ b: 1, a: 2, c: 3 });
    const b = canonicalJsonForSigning({ c: 3, a: 2, b: 1 });
    expect(a).toBe(b);
  });
});
