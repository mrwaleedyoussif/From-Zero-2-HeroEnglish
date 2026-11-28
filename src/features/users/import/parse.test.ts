import { describe, expect, it } from "vitest";
import { gradeOfClass, schoolYear, usernameFor } from "./names";
import { parseImportCsv } from "./parse";

const header = "school_code,role,username,full_name,email,grade,class,language,consent";

describe("parseImportCsv", () => {
  it("accepts the DATA_TEMPLATES example row", () => {
    const { rows, fileErrors } = parseImportCsv(
      `${header}\nRIY01,student,sara.k,Sara K.,,4,4B,ar,yes`,
    );
    expect(fileErrors).toEqual([]);
    expect(rows).toEqual([
      {
        line: 2,
        ok: true,
        data: {
          school_name: undefined,
          school_code: "RIY01",
          role: "student",
          username: "sara.k",
          full_name: "Sara K.",
          email: undefined,
          grade: "4",
          class: "4B",
          language: "ar",
          consent: true,
        },
      },
    ]);
  });

  it("normalises case, BOM, header spacing and blank lines", () => {
    const csv = `﻿${header.replace("role", " Role ")}\n\nriy01,TEACHER,,Mona A,Mona@School.SA,4,4b,,no\n`;
    const [row] = parseImportCsv(csv).rows;
    expect(row).toMatchObject({
      ok: true,
      data: {
        school_code: "RIY01",
        role: "teacher",
        email: "mona@school.sa",
        class: "4B",
        consent: false,
      },
    });
  });

  it("reports missing columns", () => {
    expect(parseImportCsv("school_code,role\nRIY01,student").fileErrors).toContain(
      "missingColumn:full_name",
    );
  });

  it("reports row errors with spreadsheet line numbers", () => {
    const csv = [
      header,
      "RIY01,student,sara.k,Sara K.,,4,4B,ar,yes",
      "RIY01,student,,No Login,,4,4B,ar,yes",
      "RIY01,student,sara.k,Duplicate,,4,4B,ar,yes",
      "R,student,x.y,Bad School,,4,4B,ar,yes",
      "RIY01,student,ok.name,Class No Grade,,,4B,ar,yes",
      "RIY01,student,ok.two,Bad Email,not-an-email,4,4B,ar,yes",
    ].join("\n");
    const rows = parseImportCsv(csv).rows;
    expect(rows.map((r) => [r.line, r.ok ? "ok" : r.errors.join("+")])).toEqual([
      [2, "ok"],
      [3, "ok"],
      [4, "duplicateInFile"],
      [5, "school_code"],
      [6, "ok"],
      [7, "email"],
    ]);
  });

  it("needs only five columns: the app makes usernames, and reads roles as people write them", () => {
    const csv = [
      "school_name,school_code,full_name,role,class",
      "Riyadh Demo School,RIY01,Sara Khalid,Student,4B",
      "Riyadh Demo School,RIY01,Sara Khalid,Student,4B",
      "Riyadh Demo School,RIY01,Mona Ali,Vice Principal,",
      "Riyadh Demo School,RIY01,أحمد سالم,طالب,4B",
    ].join("\n");
    const { rows, fileErrors } = parseImportCsv(csv);
    expect(fileErrors).toEqual([]);
    expect(rows.map((r) => (r.ok ? r.data.role : r.errors.join("+")))).toEqual([
      "student",
      "duplicateInFile",
      "vp",
      "student",
    ]);
    expect(usernameFor("Sara Khalid", () => false)).toBe("sara.k");
    expect(usernameFor("Sara Khalid", (u) => u === "sara.k")).toBe("sara.k2");
    expect(usernameFor("أحمد سالم", () => false)).toBe("ahmd.s");
    expect(usernameFor("؟", () => false)).toBe("user");
    expect([
      gradeOfClass("4B"),
      gradeOfClass("10-A"),
      gradeOfClass("KG1A"),
      gradeOfClass("B"),
    ]).toEqual(["4", "10", "KG1", undefined]);
    expect(schoolYear(new Date("2026-11-28")).name).toBe("2026-2027");
    expect(schoolYear(new Date("2027-03-01")).starts_on).toBe("2026-09-01");
  });

  it("refuses files over the row limit", () => {
    const body = Array.from(
      { length: 301 },
      (_, i) => `RIY01,student,s${i},Student ${i},,4,4A,ar,yes`,
    );
    expect(parseImportCsv([header, ...body].join("\n")).fileErrors).toEqual(["tooManyRows:300"]);
  });
});
