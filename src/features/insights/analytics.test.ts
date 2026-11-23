import { describe, expect, it } from "vitest";
import { cefrDistribution, growthVsAverage, riskFlags, toCsv } from "./analytics";

const now = new Date("2026-11-22T12:00:00Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();

describe("insights analytics", () => {
  it("flags inactive, falling accuracy and overdue learners", () => {
    const ok = { last_active_at: daysAgo(1), overdue: 0, accuracy_7d: 80, accuracy_prev: 85 };
    expect(riskFlags(ok, now)).toEqual([]);
    expect(riskFlags({ ...ok, last_active_at: null }, now)).toEqual(["inactive"]);
    expect(riskFlags({ ...ok, last_active_at: daysAgo(8) }, now)).toEqual(["inactive"]);
    expect(riskFlags({ ...ok, accuracy_7d: 60 }, now)).toEqual(["falling"]);
    expect(riskFlags({ ...ok, accuracy_7d: null }, now)).toEqual([]);
    expect(riskFlags({ ...ok, accuracy_prev: null }, now)).toEqual([]);
    expect(riskFlags({ ...ok, overdue: 2 }, now)).toEqual(["overdue"]);
  });

  it("orders the CEFR distribution, merges classes and puts unplaced last", () => {
    expect(
      cefrDistribution([
        { cefr: "B1", n: 2 },
        { cefr: "none", n: 3 },
        { cefr: "A1", n: 1 },
        { cefr: "B1", n: 1 },
      ]),
    ).toEqual([
      { cefr: "A1", n: 1 },
      { cefr: "B1", n: 3 },
      { cefr: "none", n: 3 },
    ]);
  });

  it("compares a group's growth with the school average", () => {
    expect(growthVsAverage([0.5, 0.3, null], [0.2, 0.2, 0.5])).toEqual({
      group: 0.4,
      school: 0.3,
      diff: 0.1,
    });
    expect(growthVsAverage([], [0.2])).toEqual({ group: null, school: 0.2, diff: null });
    expect(growthVsAverage([0.2], [])).toEqual({ group: 0.2, school: null, diff: null });
  });

  it("writes Excel-friendly, injection-safe CSV", () => {
    const csv = toCsv(
      ["name", "score"],
      [
        ["Omar, S", 80],
        ['Say "hi"', null],
        ["=1+1", "-2"],
        ["لمى", 5],
        ["growth", -0.4], // a negative number is data, not a formula
      ],
    );
    expect(csv).toBe(
      '﻿name,score\r\n"Omar, S",80\r\n"Say ""hi""",\r\n\'=1+1,\'-2\r\nلمى,5\r\ngrowth,-0.4\r\n',
    );
  });
});
