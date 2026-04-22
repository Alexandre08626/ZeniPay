import { describe, it, expect } from "vitest";
import { base32Decode, base32Encode, generateSecret, generateCode, verifyCode, provisioningUri } from "../approvals/totp";

describe("totp base32", () => {
  it("roundtrips random bytes", () => {
    const bytes = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const encoded = base32Encode(bytes);
    const decoded = base32Decode(encoded);
    expect(Array.from(decoded)).toEqual(Array.from(bytes));
  });

  it("rejects non-base32 chars", () => {
    expect(() => base32Decode("A!B")).toThrow();
  });
});

describe("totp generateCode", () => {
  // RFC 6238 Appendix B test vectors (SHA-1). The standard secret is the
  // ASCII string "12345678901234567890" = base32 "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ".
  const SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

  it("produces 6 digits", () => {
    const code = generateCode(SECRET, 59);
    expect(code).toMatch(/^\d{6}$/);
  });

  it("is deterministic for the same timestamp", () => {
    const t = 1_111_111_109;
    expect(generateCode(SECRET, t)).toBe(generateCode(SECRET, t));
  });

  it("changes across 30s windows", () => {
    const a = generateCode(SECRET, 0);
    const b = generateCode(SECRET, 30);
    expect(a).not.toBe(b);
  });

  it("matches the RFC 6238 test vector for t=59", () => {
    // Expected code from RFC 6238 Appendix B for T=59 with SHA-1 / 20-byte key.
    expect(generateCode(SECRET, 59)).toBe("287082");
  });
});

describe("totp verifyCode", () => {
  const SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

  it("accepts the current code", () => {
    const t = 1_111_111_109;
    const code = generateCode(SECRET, t);
    expect(verifyCode(SECRET, code, t)).toBe(true);
  });

  it("accepts ±1 drift window (30s)", () => {
    const t = 1_111_111_109;
    const prev = generateCode(SECRET, t - 30);
    const next = generateCode(SECRET, t + 30);
    expect(verifyCode(SECRET, prev, t)).toBe(true);
    expect(verifyCode(SECRET, next, t)).toBe(true);
  });

  it("rejects ±2 drift windows", () => {
    const t = 1_111_111_109;
    const way_off = generateCode(SECRET, t - 120);
    expect(verifyCode(SECRET, way_off, t)).toBe(false);
  });

  it("rejects malformed input without throwing", () => {
    expect(verifyCode(SECRET, "abc123")).toBe(false);
    expect(verifyCode(SECRET, "12345")).toBe(false);   // 5 digits
    expect(verifyCode(SECRET, "1234567")).toBe(false); // 7 digits
    expect(verifyCode(SECRET, "")).toBe(false);
  });
});

describe("totp generateSecret + provisioningUri", () => {
  it("generates a 32-char base32 secret (160 bits)", () => {
    const s = generateSecret();
    expect(s).toMatch(/^[A-Z2-7]{32}$/);
  });

  it("provisioning URI embeds otpauth details", () => {
    const uri = provisioningUri({ secret: "ABCD", account: "alex@zeniva.ca", issuer: "ZeniPay" });
    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(uri).toContain("secret=ABCD");
    expect(uri).toContain("issuer=ZeniPay");
    expect(uri).toContain("period=30");
    expect(uri).toContain("digits=6");
  });
});
