import { describe, expect, it } from "vitest";
import { repairFilledCodes } from "./names";

const rows = (codes: string[], name?: string) =>
  codes.map((school_code) => ({ school_code, school_name: name }));

describe("school codes a spreadsheet counted upwards", () => {
  it("go back to the school of the row above", () => {
    const file = rows(["AISTB2592", "AISTB2593", "AISTB2594", "AISTB2595"]);
    const fixed = repairFilledCodes(file, (c) => c === "AISTB2592");
    expect(file.map((r) => r.school_code)).toEqual(Array(4).fill("AISTB2592"));
    expect([...fixed.values()]).toEqual(["AISTB2593", "AISTB2594", "AISTB2595"]);
  });

  it("also when the school is new and named on every row, and across a skipped row", () => {
    const file = rows(["NEW01", "NEW02", "NEW04"], "New School");
    repairFilledCodes(file, () => false);
    expect(file.map((r) => r.school_code)).toEqual(["NEW01", "NEW01", "NEW01"]);
  });

  it("leaves real schools, other names and unrelated codes alone", () => {
    const real = rows(["RIY01", "RIY02"]);
    repairFilledCodes(real, () => true);
    expect(real.map((r) => r.school_code)).toEqual(["RIY01", "RIY02"]);
    const named = [
      { school_code: "AB01", school_name: "First School" },
      { school_code: "AB02", school_name: "Second School" },
    ];
    repairFilledCodes(named, () => false);
    expect(named[1]!.school_code).toBe("AB02");
    const other = rows(["RIY01", "JED77", "RIY01"]);
    expect(repairFilledCodes(other, (c) => c === "RIY01").size).toBe(0);
  });
});
