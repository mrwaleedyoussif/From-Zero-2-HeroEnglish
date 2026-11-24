import { describe, expect, it } from "vitest";
import { BLOOM_SECONDS, bloomDots } from "./bloom";

describe("opening bloom", () => {
  const dots = bloomDots();

  it("stays inside its square and finishes on time", () => {
    for (const d of dots) {
      expect(Math.hypot(d.x, d.y)).toBeLessThanOrEqual(1.02);
      expect(d.at).toBeGreaterThanOrEqual(0);
      expect(d.at).toBeLessThanOrEqual(BLOOM_SECONDS + 1);
    }
  });

  it("is red first and white later, in the order it is drawn", () => {
    expect(dots[0]?.white).toBe(false);
    expect(dots.findIndex((d) => d.white)).toBeGreaterThan(dots.length / 3);
    expect(dots.every((d, i) => i === 0 || d.at >= (dots[i - 1]?.at ?? 0))).toBe(true);
    expect(dots.length).toBeGreaterThan(4000);
    expect(dots.length).toBeLessThan(12000);
  });
});
