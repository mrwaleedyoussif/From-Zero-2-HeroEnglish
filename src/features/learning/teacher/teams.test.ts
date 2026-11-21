import { describe, expect, it } from "vitest";
import { makeTeams, teamCount } from "./teams";

const students = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `s${String(i).padStart(2, "0")}`, theta: n - i }));

describe("Kagan teams", () => {
  it("aims for four, keeps every team between three and five", () => {
    expect(teamCount(0)).toBe(0);
    expect(teamCount(2)).toBe(1);
    expect(teamCount(6)).toBe(2);
    for (let n = 3; n <= 40; n++) {
      const sizes = makeTeams(students(n)).map((t) => t.length);
      expect(Math.min(...sizes)).toBeGreaterThanOrEqual(3);
      expect(Math.max(...sizes)).toBeLessThanOrEqual(5);
      expect(sizes.reduce((a, b) => a + b, 0)).toBe(n);
    }
  });

  it("mixes ability with a snake draft", () => {
    // 8 students ranked s00 (best) … s07 → teams [s00, s03, s04, s07] and [s01, s02, s05, s06]
    expect(makeTeams(students(8))).toEqual([
      ["s00", "s03", "s04", "s07"],
      ["s01", "s02", "s05", "s06"],
    ]);
  });

  it("puts unplaced students in the middle and breaks ties by id", () => {
    const teams = makeTeams([
      { id: "b", theta: null },
      { id: "a", theta: null },
      { id: "c", theta: 1 },
      { id: "d", theta: -1 },
    ]);
    expect(teams).toEqual([["c", "a", "b", "d"]]);
  });
});
