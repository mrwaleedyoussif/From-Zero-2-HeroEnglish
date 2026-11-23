import { describe, expect, it } from "vitest";
import type { ReportData } from "../types";
import { renderDigest } from "./digest";

const data: ReportData = {
  period: "weekly",
  start: "2026-11-15",
  end: "2026-11-21",
  school: "Riyadh Demo School",
  classes: [
    {
      code: "4A",
      students: 10,
      active: 4,
      lessons: 7,
      accuracy: 80,
      atRisk: 2,
      overdue: 0,
      growth: 0.1,
    },
  ],
  improvers: [],
  atRisk: [],
  assignments: [],
  skillGaps: [],
  teachers: [],
  followUps: [],
  cefr: [],
  coaching: [],
  suggestions: [{ key: "practiceSkill", params: { cls: "4A", skill: "GRAM" } }],
};

describe("digest email", () => {
  it("renders key numbers, suggestions and the link in English", async () => {
    const m = await renderDigest({
      locale: "en",
      name: "Omar",
      data,
      url: "https://app.test/en/reports/1",
    });
    expect(m.subject).toBe("Weekly report — from 2026-11-15");
    expect(m.html).toContain("https://app.test/en/reports/1");
    expect(m.html).toContain("Give class 4A extra practice in GRAM.");
    expect(m.text).toContain("40%");
  });

  it("renders right-to-left in Arabic", async () => {
    const m = await renderDigest({
      locale: "ar",
      name: "عمر",
      data,
      url: "https://app.test/ar/reports/1",
    });
    expect(m.html).toContain('dir="rtl"');
    expect(m.subject).toContain("التقرير");
    expect(m.text).toContain("مرحبًا عمر");
  });
});
