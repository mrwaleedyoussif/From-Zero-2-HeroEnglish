import { describe, expect, it } from "vitest";
import { calibrateItem, type CalibrationResponse, estimateB, fit } from "./calibration.ts";
import { probability } from "./rasch.ts";
import { mulberry32, normal } from "./rng.ts";

/** Responses from learners θ ~ N(0,1) to an item that truly behaves like Rasch with difficulty b. */
function responses(trueB: number, n: number, seed: number): CalibrationResponse[] {
  const rng = mulberry32(seed);
  return Array.from({ length: n }, () => {
    const theta = normal(rng);
    return { theta, correct: rng() < probability(theta, trueB) };
  });
}

describe("item calibration", () => {
  it("recovers the true difficulty and reports good fit", () => {
    const r = calibrateItem(responses(1, 800, 1), 0);
    expect(r?.b).toBeCloseTo(1, 0);
    expect(Math.abs((r?.b ?? 0) - 1)).toBeLessThan(0.2);
    expect(r?.flags).toEqual([]);
    expect(r?.infit).toBeGreaterThan(0.85);
    expect(r?.outfit).toBeLessThan(1.15);
  });

  it("waits for enough responses", () => {
    expect(calibrateItem(responses(0, 50, 2), 0)).toBeNull();
    expect(calibrateItem(responses(0, 50, 2), 0, 10)).not.toBeNull();
  });

  it("flags an item that strong learners get wrong (misfit)", () => {
    const rng = mulberry32(3);
    const upsideDown = Array.from({ length: 400 }, () => {
      const theta = normal(rng);
      return { theta, correct: rng() < probability(-theta, 0) };
    });
    expect(calibrateItem(upsideDown, 0)?.flags).toContain("misfit");
  });

  it("flags items that are almost always wrong or right, with no finite b at the extremes", () => {
    const hard = calibrateItem(responses(4, 400, 4), 0);
    expect(hard?.flags).toContain("tooHard");
    const allRight = Array.from({ length: 300 }, (_, i) => ({ theta: (i % 5) - 2, correct: true }));
    expect(calibrateItem(allRight, 0)).toMatchObject({
      b: null,
      infit: null,
      outfit: null,
      flags: ["tooEasy"],
    });
    expect(
      estimateB(
        allRight.map((r) => ({ ...r, correct: false })),
        0,
      ),
    ).toBeNull();
  });

  it("stops iterating at the cap when far from the answer, and computes fit", () => {
    const easy = responses(-1, 300, 5);
    expect(estimateB(easy, 6)).toBeCloseTo(-1, 0);
    expect(estimateB(easy, 6, 1)).toBe(5); // one capped step from 6
    const { infit, outfit } = fit(easy, -1);
    expect(infit).toBeGreaterThan(0);
    expect(outfit).toBeGreaterThan(0);
  });
});
