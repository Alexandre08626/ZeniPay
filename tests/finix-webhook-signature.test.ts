import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import { verifyFinixSignature, SIGNATURE_TOLERANCE_SEC } from "@/lib/finix/webhook-signature";

const SECRET = "1676b0aa7f96e7f2cb3ef92ea266a13a534ad06593e930152343a36d14bdc3c5";
const BODY = '{"id":"event_7eAz5GUWUGa9sGcToi1Xk3","type":"created"}';

function sign(body: string, ts: number, secret = SECRET): string {
  const sig = createHmac("sha256", secret).update(`${ts}:${body}`).digest("hex");
  return `timestamp=${ts}, sig=${sig}`;
}

describe("verifyFinixSignature", () => {
  const now = 1764948460;

  it("accepts a valid Finix signature", () => {
    expect(verifyFinixSignature(BODY, sign(BODY, now), SECRET, now)).toBe(true);
  });

  it("matches the documented Finix vector (HMAC over `timestamp:body`)", () => {
    // Guards against regressing to HMAC(body) alone, which silently
    // rejected every real Finix delivery.
    const header = sign(BODY, now);
    const hexOnly = createHmac("sha256", SECRET).update(BODY).digest("hex");
    expect(header).toContain("sig=");
    expect(header).not.toContain(hexOnly);
  });

  it("rejects a body tampered after signing", () => {
    const header = sign(BODY, now);
    expect(verifyFinixSignature(BODY + " ", header, SECRET, now)).toBe(false);
  });

  it("rejects a signature made with the wrong secret", () => {
    const header = sign(BODY, now, "not-the-signing-key");
    expect(verifyFinixSignature(BODY, header, SECRET, now)).toBe(false);
  });

  it("rejects a replayed signature outside the tolerance window", () => {
    const header = sign(BODY, now);
    expect(verifyFinixSignature(BODY, header, SECRET, now + SIGNATURE_TOLERANCE_SEC + 1)).toBe(false);
    expect(verifyFinixSignature(BODY, header, SECRET, now + SIGNATURE_TOLERANCE_SEC - 1)).toBe(true);
  });

  it("accepts uppercase hex from the header", () => {
    const header = sign(BODY, now).toUpperCase().replace("TIMESTAMP", "timestamp");
    expect(verifyFinixSignature(BODY, header, SECRET, now)).toBe(true);
  });

  it("rejects empty secret or empty header", () => {
    expect(verifyFinixSignature(BODY, sign(BODY, now), "", now)).toBe(false);
    expect(verifyFinixSignature(BODY, "", SECRET, now)).toBe(false);
  });

  it("still accepts the legacy bare-hex replay format", () => {
    const legacy = createHmac("sha256", SECRET).update(BODY).digest("hex");
    expect(verifyFinixSignature(BODY, legacy, SECRET, now)).toBe(true);
    expect(verifyFinixSignature(BODY, legacy.slice(0, -2) + "00", SECRET, now)).toBe(false);
  });

  it("rejects a non-hex garbage header", () => {
    expect(verifyFinixSignature(BODY, "not-a-signature", SECRET, now)).toBe(false);
  });
});
