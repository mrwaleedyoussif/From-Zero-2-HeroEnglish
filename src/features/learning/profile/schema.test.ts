import { describe, expect, it } from "vitest";
import { mindsetScore, onlyKnown, profileInput } from "./schema";

const statements = [
  { key: "m1", reverse_scored: false },
  { key: "m3", reverse_scored: true },
];

describe("learner profile", () => {
  it("scores growth mindset 0–100 with reversed fixed-mindset statements", () => {
    expect(mindsetScore({ m1: 4, m3: 1 }, statements)).toBe(100);
    expect(mindsetScore({ m1: 1, m3: 4 }, statements)).toBe(0);
    expect(mindsetScore({ m1: 3 }, statements)).toBe(67);
    expect(mindsetScore({}, statements)).toBeNull();
  });

  it("drops unknown and repeated option keys", () => {
    expect(onlyKnown(["sports", "hacking", "sports"], new Set(["sports", "art"]))).toEqual([
      "sports",
    ]);
  });

  it("rejects out-of-range answers", () => {
    const base = { interests: [], goals: [], preferred_formats: [], accommodations: [] };
    expect(profileInput.safeParse({ ...base, mindset_answers: { m1: 5 } }).success).toBe(false);
    expect(profileInput.safeParse({ ...base, mindset_answers: { m1: 2 } }).success).toBe(true);
  });
});
