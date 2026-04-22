import { describe, it, expect } from "vitest";
import { mergeBlockedMcc, TRAVEL_MCC_DEFAULT_BLOCK } from "../issuing/mcc";

describe("mergeBlockedMcc", () => {
  it("always includes the travel MCC default block", () => {
    const out = mergeBlockedMcc([]);
    for (const code of TRAVEL_MCC_DEFAULT_BLOCK) {
      expect(out).toContain(code);
    }
  });

  it("merges user-supplied MCCs with the travel block (de-duplicated)", () => {
    const out = mergeBlockedMcc(["7372", "4722"]); // 4722 already in default
    expect(out).toContain("7372");
    expect(out).toContain("4722");
    expect(out.filter((c) => c === "4722").length).toBe(1);
  });

  it("accepts undefined for zero user MCCs", () => {
    const out = mergeBlockedMcc();
    expect(out.length).toBe(TRAVEL_MCC_DEFAULT_BLOCK.length);
  });

  it("never omits airlines (4511), hotels (7011), or trains (4111)", () => {
    const out = mergeBlockedMcc(["9999"]);
    expect(out).toContain("4511");
    expect(out).toContain("7011");
    expect(out).toContain("4111");
  });
});
