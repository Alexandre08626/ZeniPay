import { describe, it, expect } from "vitest";
import { periodWindow } from "../accounting/report-builder";

describe("accounting periodWindow", () => {
  it("weekly: Wed → ISO week (Mon..Sun, UTC)", () => {
    const w = periodWindow("weekly", new Date("2026-04-22T10:00:00Z")); // Wed
    expect(w.start).toBe("2026-04-20"); // Mon
    expect(w.end).toBe("2026-04-26");   // Sun
  });

  it("weekly: anchored on Sunday picks the same week's Monday", () => {
    const w = periodWindow("weekly", new Date("2026-04-26T23:00:00Z"));
    expect(w.start).toBe("2026-04-20");
    expect(w.end).toBe("2026-04-26");
  });

  it("weekly: anchored on Monday at 00:05 UTC is same week", () => {
    const w = periodWindow("weekly", new Date("2026-04-20T00:05:00Z"));
    expect(w.start).toBe("2026-04-20");
    expect(w.end).toBe("2026-04-26");
  });

  it("monthly: mid-month UTC", () => {
    const w = periodWindow("monthly", new Date("2026-04-15T12:00:00Z"));
    expect(w.start).toBe("2026-04-01");
    expect(w.end).toBe("2026-04-30");
  });

  it("monthly: last-day-of-month (30d April)", () => {
    const w = periodWindow("monthly", new Date("2026-04-30T23:59:59Z"));
    expect(w.start).toBe("2026-04-01");
    expect(w.end).toBe("2026-04-30");
  });

  it("monthly: February non-leap", () => {
    const w = periodWindow("monthly", new Date("2027-02-15T10:00:00Z"));
    expect(w.start).toBe("2027-02-01");
    expect(w.end).toBe("2027-02-28");
  });

  it("monthly: February leap year", () => {
    const w = periodWindow("monthly", new Date("2028-02-10T10:00:00Z"));
    expect(w.start).toBe("2028-02-01");
    expect(w.end).toBe("2028-02-29");
  });

  it("monthly: December crosses year boundary", () => {
    const w = periodWindow("monthly", new Date("2026-12-31T23:00:00Z"));
    expect(w.start).toBe("2026-12-01");
    expect(w.end).toBe("2026-12-31");
  });

  it("weekly: end of year ISO week correctness", () => {
    const w = periodWindow("weekly", new Date("2027-01-01T00:00:00Z")); // Fri 2027-01-01
    expect(w.start).toBe("2026-12-28"); // Mon
    expect(w.end).toBe("2027-01-03");   // Sun
  });

  it("custom: pass-through", () => {
    const w = periodWindow("custom", new Date(), { start: "2026-01-01", end: "2026-06-30" });
    expect(w).toEqual({ start: "2026-01-01", end: "2026-06-30" });
  });

  it("custom: throws without start+end", () => {
    expect(() => periodWindow("custom", new Date())).toThrow();
  });
});
