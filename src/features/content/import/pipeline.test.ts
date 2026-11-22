import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Papa from "papaparse";
import { describe, expect, it } from "vitest";
import { buildPreview, emptyExisting, type ExistingRecords, type RawSheets } from "./pipeline";
import { decodeMessage } from "./parse";
import { questionRecord } from "./records";
import { SHEETS } from "./sheets";

const DIR = resolve(__dirname, "../../../../supabase/fixtures/drive/LinguaPath/01_Content");
const MEDIA = new Set(["listen_0001.mp3", "past_simple_slides.pdf"]);

function sampleSheets(): RawSheets {
  const raw = {} as RawSheets;
  for (const { name } of SHEETS)
    raw[name] = Papa.parse<string[]>(readFileSync(`${DIR}/${name}.csv`, "utf8")).data;
  return raw;
}

/** Replace one cell in a CSV-derived sheet (row = spreadsheet line number). */
function setCell(
  raw: RawSheets,
  sheet: keyof RawSheets,
  line: number,
  column: string,
  value: string,
) {
  const cells = raw[sheet];
  if (!cells) throw new Error("no sheet");
  const col = cells[0]?.indexOf(column) ?? -1;
  const row = cells[line - 1];
  if (!row || col < 0) throw new Error(`bad cell ${line}/${column}`);
  row[col] = value;
}

describe("content import preview on the DATA_TEMPLATES samples", () => {
  it("is clean: everything new, no errors, no missing media", () => {
    const p = buildPreview(sampleSheets(), emptyExisting(), MEDIA);
    expect(p.issues).toEqual([]);
    expect(p.missingMedia).toEqual([]);
    expect(Object.fromEntries(p.sheets.map((s) => [s.name, s.created.length]))).toEqual({
      Departments: 2,
      Skills: 8,
      Passages: 1,
      Questions: 6,
      Lessons: 4,
      CutScores: 7,
      Badges: 4,
    });
  });

  it("rejects a badge whose rule is not valid JSON rule data", () => {
    const raw = sampleSheets();
    setCell(raw, "Badges", 2, "rule_json", '{"event":"flying"}');
    expect(buildPreview(raw, emptyExisting(), MEDIA).issues).toMatchObject([
      { sheet: "Badges", column: "rule_json", code: "badRule" },
    ]);
  });

  it("reports unchanged rows on a second sync and exactly which columns changed", () => {
    const first = buildPreview(sampleSheets(), emptyExisting(), MEDIA);
    const existing: ExistingRecords = emptyExisting();
    for (const r of first.valid.Questions) existing.Questions.set(r.key, questionRecord(r.data));
    const raw = sampleSheets();
    setCell(raw, "Questions", 2, "difficulty", "4");
    const second = buildPreview(raw, existing, MEDIA);
    const q = second.sheets.find((s) => s.name === "Questions");
    expect(q).toMatchObject({
      created: [],
      unchanged: 5,
      changed: [{ key: "GEN-GRAM-0001", fields: ["difficulty"] }],
    });
  });

  it("explains broken rows with sheet, row number, column and reason", () => {
    const raw = sampleSheets();
    setCell(raw, "Questions", 2, "difficulty", "11"); // out of range
    setCell(raw, "Questions", 3, "item_type", "essay"); // not a type
    setCell(raw, "Questions", 6, "skill_id", "MATH"); // unknown skill
    setCell(raw, "Questions", 7, "correct", "E"); // letter without an option
    setCell(raw, "Skills", 3, "department_id", "SCI"); // unknown department
    const p = buildPreview(raw, emptyExisting(), MEDIA);
    const brief = p.issues.map((i) => `${i.sheet}:${i.line}:${i.column}:${i.code}`);
    expect(brief).toEqual([
      "Departments:2:skills:unknownSkill", // warning: GEN lists LIST, whose Skills row is broken
      "Skills:3:department_id:unknownDepartment",
      "Questions:2:difficulty:range",
      "Questions:3:item_type:oneOf",
      "Questions:4:skill_id:unknownSkill", // GEN-LIST-0001: its skill row (LIST) was rejected
      "Questions:6:skill_id:unknownSkill",
      "Questions:7:correct:letterNotAnOption",
      "Lessons:2:practice_item_ids:unknownItem", // depends on broken GEN-GRAM-0002
      "Lessons:3:practice_item_ids:unknownItem",
      "Lessons:4:skill_id:unknownSkill",
      "Lessons:5:practice_item_ids:unknownItem",
    ]);
    expect(p.issues[0]?.warning).toBe(true);
    expect(p.sheets.find((s) => s.name === "Departments")).toMatchObject({
      errors: 0,
      created: ["GEN", "MAP"],
    });
    expect(p.issues.find((i) => i.column === "difficulty")?.params).toEqual({
      min: "1",
      max: "10",
    });
    expect(p.sheets.find((s) => s.name === "Questions")?.created).toEqual(["GEN-READ-0001"]);
  });

  it("reports missing media without blocking the row", () => {
    const p = buildPreview(sampleSheets(), emptyExisting(), new Set(["past_simple_slides.pdf"]));
    expect(p.missingMedia.map((m) => `${m.sheet}:${m.line}:${m.name}`)).toEqual([
      "Questions:4:listen_0001.mp3",
      "Lessons:4:listen_0001.mp3",
    ]);
    expect(p.issues).toEqual([]);
  });

  it("flags missing columns and duplicate ids; skips sheets not found", () => {
    const raw = sampleSheets();
    raw.CutScores = [
      ["department_id", "cefr", "min_theta"],
      ["GEN", "A1", "-3"],
    ];
    raw.Passages = null;
    const passages = buildPreview(raw, emptyExisting(), MEDIA);
    expect(passages.issues.filter((i) => i.sheet === "CutScores").map((i) => i.code)).toEqual([
      "missingColumn",
    ]);
    expect(passages.sheets.find((s) => s.name === "Passages")?.found).toBe(false);
    // GEN-READ-0001 refers to passage P-0001, which is now in neither the sheet nor the DB.
    expect(passages.issues.some((i) => i.code === "unknownPassage")).toBe(true);

    const dup = sampleSheets();
    dup.Departments?.push([...(dup.Departments?.[1] ?? [])]);
    expect(buildPreview(dup, emptyExisting(), MEDIA).issues[0]).toMatchObject({
      code: "duplicateId",
      params: { line: "2" },
    });
  });
});

describe("decodeMessage", () => {
  it("turns schema messages into codes with parameters", () => {
    expect(decodeMessage("range:1:10")).toEqual({ code: "range", params: { min: "1", max: "10" } });
    expect(decodeMessage("oneOf:a|b")).toEqual({ code: "oneOf", params: { values: "a, b" } });
    expect(decodeMessage("required")).toEqual({ code: "required" });
    expect(decodeMessage("Invalid input: expected string")).toEqual({ code: "invalid" });
  });
});
