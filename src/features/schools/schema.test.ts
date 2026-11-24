import { describe, expect, it } from "vitest";
import { GRADE_CODE, gradeRangeSchema, gradeRows } from "./schema";

const school_id = "11111111-1111-4111-8111-111111111111";

describe("grades", () => {
  it("builds a run of grades with names in both languages", () => {
    const rows = gradeRows(gradeRangeSchema.parse({ school_id, from: "3", to: "5" }));
    expect(rows.map((r) => [r.code, r.name_en, r.name_ar, r.sort_order])).toEqual([
      ["3", "Grade 3", "الصف الثالث", 3],
      ["4", "Grade 4", "الصف الرابع", 4],
      ["5", "Grade 5", "الصف الخامس", 5],
    ]);
    expect(gradeRows(gradeRangeSchema.parse({ school_id, from: 12, to: 12 }))[0]?.name_ar).toBe(
      "الصف الثاني عشر",
    );
  });

  it("refuses a backwards or out-of-range run", () => {
    expect(gradeRangeSchema.safeParse({ school_id, from: 5, to: 3 }).success).toBe(false);
    expect(gradeRangeSchema.safeParse({ school_id, from: 0, to: 3 }).success).toBe(false);
    expect(gradeRangeSchema.safeParse({ school_id, from: 1, to: 13 }).success).toBe(false);
  });

  it("knows a short code from a full name", () => {
    expect(GRADE_CODE.test("KG1")).toBe(true);
    expect(GRADE_CODE.test("Grade 4")).toBe(false);
  });
});
