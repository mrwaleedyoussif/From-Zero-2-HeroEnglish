import { describe, expect, it } from "vitest";
import { dayStart, localDay, zonedTimeToUtc } from "./time";

describe("zonedTimeToUtc", () => {
  it("reads a typed time as Riyadh time (UTC+3) by default", () => {
    expect(zonedTimeToUtc("2026-11-23T08:00").toISOString()).toBe("2026-11-23T05:00:00.000Z");
  });
  it("handles zones behind UTC and midnight roll-over", () => {
    expect(zonedTimeToUtc("2026-01-01T00:30", "Asia/Riyadh").toISOString()).toBe(
      "2025-12-31T21:30:00.000Z",
    );
    expect(zonedTimeToUtc("2026-01-15T20:00", "America/New_York").toISOString()).toBe(
      "2026-01-16T01:00:00.000Z",
    );
  });
});

describe("school days", () => {
  it("start at local midnight, not at 03:00 (UTC midnight)", () => {
    // 01:30 on the 24th in Riyadh is still the 23rd in UTC.
    expect(localDay(new Date("2026-11-23T22:30:00Z"))).toBe("2026-11-24");
    expect(localDay(new Date("2026-11-23T20:59:00Z"))).toBe("2026-11-23");
    expect(dayStart("2026-11-24")).toBe("2026-11-23T21:00:00.000Z");
  });
});
