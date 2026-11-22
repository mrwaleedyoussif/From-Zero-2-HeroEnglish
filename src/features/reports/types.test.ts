import { describe, expect, it } from "vitest";
import { headline, type ReportData, suggest } from "./types";

const base: ReportData = {
  period: "weekly",
  start: "2026-11-15",
  end: "2026-11-21",
  school: "Riyadh Demo School",
  classes: [
    {
      code: "4A",
      students: 10,
      active: 6,
      lessons: 12,
      accuracy: 70,
      atRisk: 4,
      overdue: 1,
      growth: 0.2,
    },
    {
      code: "4B",
      students: 10,
      active: 2,
      lessons: 3,
      accuracy: null,
      atRisk: 8,
      overdue: 0,
      growth: null,
    },
  ],
  improvers: [],
  atRisk: [{ name: "Omar", class: "4A", flags: ["inactive"] }],
  assignments: [
    { class: "4A", assigned: 10, done: 4 },
    { class: "4B", assigned: 0, done: 0 },
  ],
  skillGaps: [
    { class: "4A", skill: "LIST", theta: -0.5 },
    { class: "4A", skill: "GRAM", theta: -1.2 },
  ],
  teachers: [{ name: "T", assignments: 0, kudos: 0, lastSignIn: null }],
  followUps: [{ teacher: "T", date: "2026-11-25" }],
  cefr: [],
  coaching: [],
  suggestions: [],
};

describe("report content", () => {
  it("sums the key numbers", () => {
    expect(headline(base)).toEqual({
      classes: 2,
      students: 20,
      activePct: 40,
      lessons: 15,
      atRisk: 12,
      followUps: 1,
    });
    expect(headline({ ...base, classes: [] }).activePct).toBe(0);
  });

  it("suggests next-week actions from the data", () => {
    expect(suggest(base).map((s) => s.key)).toEqual([
      "contactAtRisk",
      "remindAssignments",
      "practiceSkill",
      "followUps",
      "checkInTeachers",
    ]);
    expect(suggest(base).find((s) => s.key === "practiceSkill")?.params).toEqual({
      cls: "4A",
      skill: "GRAM",
    });
    expect(
      suggest({ ...base, atRisk: [], assignments: [], skillGaps: [], followUps: [], teachers: [] }),
    ).toEqual([]);
  });
});
