import { badgeRecord, badgeRow } from "./badges-sheet";
import {
  type CrossCheckResult,
  crossCheck,
  type ExistingCodes,
  type ParsedBundle,
} from "./cross-check";
import { type Comparable, diffRecords, type SheetDiff } from "./diff";
import { type ImportIssue, parseSheet } from "./parse";
import {
  cutScoreRecord,
  departmentRecord,
  lessonRecord,
  passageRecord,
  questionRecord,
  skillRecord,
} from "./records";
import {
  cutScoreRow,
  departmentRow,
  lessonRow,
  passageRow,
  questionRow,
  SHEETS,
  type SheetName,
  skillRow,
} from "./sheets";

/** Raw cells per sheet (null = the spreadsheet was not found in 01_Content). */
export type RawSheets = Record<SheetName, string[][] | null>;

/** DB state in comparable form, keyed like the sheet keys. */
export type ExistingRecords = Record<SheetName, Map<string, Comparable>>;

export interface SheetSummary extends SheetDiff {
  name: SheetName;
  found: boolean;
  errors: number;
}

export interface Preview {
  sheets: SheetSummary[];
  issues: ImportIssue[];
  missingMedia: CrossCheckResult["missingMedia"];
  valid: ParsedBundle;
}

export function existingCodes(existing: ExistingRecords): ExistingCodes {
  return {
    departments: new Set(existing.Departments.keys()),
    skills: new Set(existing.Skills.keys()),
    passages: new Set(existing.Passages.keys()),
    items: new Set(existing.Questions.keys()),
    lessons: new Set(existing.Lessons.keys()),
  };
}

/** Parse → validate → cross-check → diff. Pure: the caller reads Drive and the DB. */
export function buildPreview(
  raw: RawSheets,
  existing: ExistingRecords,
  mediaNames: ReadonlySet<string>,
): Preview {
  const issues: ImportIssue[] = [];
  const run = <T>(
    name: SheetName,
    sheet: (cells: string[][]) => { rows: T[]; issues: ImportIssue[] },
  ): T[] => {
    const cells = raw[name];
    if (!cells) return [];
    const result = sheet(cells);
    issues.push(...result.issues);
    return result.rows;
  };
  const parsed: ParsedBundle = {
    Departments: run("Departments", (c) =>
      parseSheet("Departments", departmentRow, (r) => r.department_id, c),
    ),
    Skills: run("Skills", (c) =>
      parseSheet("Skills", skillRow, (r) => `${r.department_id}/${r.skill_id}`, c),
    ),
    Passages: run("Passages", (c) => parseSheet("Passages", passageRow, (r) => r.passage_id, c)),
    Questions: run("Questions", (c) => parseSheet("Questions", questionRow, (r) => r.item_id, c)),
    Lessons: run("Lessons", (c) => parseSheet("Lessons", lessonRow, (r) => r.lesson_id, c)),
    CutScores: run("CutScores", (c) =>
      parseSheet("CutScores", cutScoreRow, (r) => `${r.department_id}/${r.cefr}`, c),
    ),
    Badges: run("Badges", (c) => parseSheet("Badges", badgeRow, (r) => r.badge_id, c)),
  };

  const checked = crossCheck(parsed, existingCodes(existing), mediaNames);
  issues.push(...checked.issues);
  const v = checked.valid;
  const incoming: Record<SheetName, { key: string; record: Comparable }[]> = {
    Departments: v.Departments.map((r) => ({ key: r.key, record: departmentRecord(r.data) })),
    Skills: v.Skills.map((r) => ({ key: r.key, record: skillRecord(r.data) })),
    Passages: v.Passages.map((r) => ({ key: r.key, record: passageRecord(r.data) })),
    Questions: v.Questions.map((r) => ({ key: r.key, record: questionRecord(r.data) })),
    Lessons: v.Lessons.map((r) => ({ key: r.key, record: lessonRecord(r.data) })),
    CutScores: v.CutScores.map((r) => ({ key: r.key, record: cutScoreRecord(r.data) })),
    Badges: v.Badges.map((r) => ({ key: r.key, record: badgeRecord(r.data) })),
  };

  const sheets = SHEETS.map(({ name }): SheetSummary => ({
    name,
    found: raw[name] !== null,
    errors: issues.filter((i) => i.sheet === name && !i.warning).length,
    ...diffRecords(existing[name], incoming[name]),
  }));
  issues.sort(
    (a, b) =>
      SHEETS.findIndex((s) => s.name === a.sheet) - SHEETS.findIndex((s) => s.name === b.sheet) ||
      a.line - b.line,
  );
  return { sheets, issues, missingMedia: checked.missingMedia, valid: v };
}

export function emptyExisting(): ExistingRecords {
  return {
    Departments: new Map(),
    Skills: new Map(),
    Passages: new Map(),
    Questions: new Map(),
    Lessons: new Map(),
    CutScores: new Map(),
    Badges: new Map(),
  };
}
