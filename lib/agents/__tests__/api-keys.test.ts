import { describe, it, expect } from "vitest";
import { generateRawKey, sha256Hex, isWellFormed } from "../api-keys";

describe("api-keys.generateRawKey", () => {
  it("produces a zpk_test_ prefixed 41-char key with 32 hex chars of entropy", () => {
    const raw = generateRawKey("test");
    expect(raw.startsWith("zpk_test_")).toBe(true);
    expect(raw.length).toBe("zpk_test_".length + 32);
    expect(/^zpk_test_[0-9a-f]{32}$/.test(raw)).toBe(true);
  });

  it("produces a zpk_live_ prefixed key for live env", () => {
    const raw = generateRawKey("live");
    expect(raw.startsWith("zpk_live_")).toBe(true);
  });

  it("has enough entropy that two draws never collide", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) seen.add(generateRawKey("test"));
    expect(seen.size).toBe(1000);
  });
});

describe("api-keys.sha256Hex", () => {
  it("matches the canonical SHA-256 hex of a known input", () => {
    expect(sha256Hex("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    expect(sha256Hex("zenipay")).toBe(
      "082662d6831e9cb9d3d05313aef9bc7f21d64ca07a2d0495a01e146cf6296416",
    );
  });

  it("is deterministic", () => {
    const raw = generateRawKey("test");
    expect(sha256Hex(raw)).toBe(sha256Hex(raw));
  });
});

describe("api-keys.isWellFormed", () => {
  it("accepts our generated keys", () => {
    for (const env of ["test", "live"] as const) {
      const raw = generateRawKey(env);
      expect(isWellFormed(raw)).toBe(true);
    }
  });

  it("rejects malformed inputs", () => {
    expect(isWellFormed("")).toBe(false);
    expect(isWellFormed("zpk_sandbox_abcd")).toBe(false);
    expect(isWellFormed("zpk_test_TOOSHORT")).toBe(false);
    expect(isWellFormed("zpk_live_" + "z".repeat(32))).toBe(false); // non-hex
    expect(isWellFormed("pk_test_" + "a".repeat(32))).toBe(false); // wrong prefix
  });
});
