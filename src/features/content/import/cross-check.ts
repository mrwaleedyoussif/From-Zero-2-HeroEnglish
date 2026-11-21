import { isUrl } from "./fields";
import type { ImportIssue, ParsedRow } from "./parse";
import type { SheetRows } from "./sheets";

/** Codes already in the database (sheets may be partial: e.g. only Questions changed). */
export interface ExistingCodes {
  departments: Set<string>;
  /** "DEPT/SKILL" */
  skills: Set<string>;
  passages: Set<string>;
  items: Set<string>;
  lessons: Set<string>;
}

export type ParsedBundle = { [K in keyof SheetRows]: ParsedRow<SheetRows[K][number]>[] };

export interface MissingMedia {
  name: string;
  sheet: string;
  line: number;
  key: string;
}

export interface CrossCheckResult {
  valid: ParsedBundle;
  issues: ImportIssue[];
  missingMedia: MissingMedia[];
}

/**
 * Check references between sheets, in dependency order, so a row that points at a broken
 * row is reported too. Missing media files don't block a row (the link resolves on the next
 * sync once the file is uploaded) — they go to the missing-file report.
 */
export function crossCheck(
  bundle: ParsedBundle,
  existing: ExistingCodes,
  mediaNames: ReadonlySet<string>,
): CrossCheckResult {
  const issues: ImportIssue[] = [];
  const missingMedia: MissingMedia[] = [];
  const flag = (
    sheet: string,
    row: { line: number; key: string },
    column: string,
    code: string,
    value: string,
  ) => {
    issues.push({ sheet, line: row.line, column, code, params: { value }, key: row.key });
  };
  const media = (sheet: string, row: { line: number; key: string }, name: string | undefined) => {
    if (name && !isUrl(name) && !mediaNames.has(name))
      missingMedia.push({ name, sheet, line: row.line, key: row.key });
  };

  const skillsInSheet = new Set(bundle.Skills.map((r) => r.key));
  // The "skills" column is a summary: an unknown entry is a warning, not a reason to reject.
  const departments = bundle.Departments;
  for (const r of departments) {
    for (const skill of r.data.skills) {
      if (!skillsInSheet.has(`${r.key}/${skill}`) && !existing.skills.has(`${r.key}/${skill}`)) {
        issues.push({
          sheet: "Departments",
          line: r.line,
          column: "skills",
          code: "unknownSkill",
          params: { value: skill },
          key: r.key,
          warning: true,
        });
      }
    }
  }
  const deptCodes = new Set([...existing.departments, ...departments.map((r) => r.key)]);

  const skills = bundle.Skills.filter((r) => {
    if (deptCodes.has(r.data.department_id)) return true;
    flag("Skills", r, "department_id", "unknownDepartment", r.data.department_id);
    return false;
  });
  const skillCodes = new Set([...existing.skills, ...skills.map((r) => r.key)]);

  const passages = bundle.Passages.filter((r) => {
    media("Passages", r, r.data.media_file);
    return true;
  });
  const passageCodes = new Set([...existing.passages, ...passages.map((r) => r.key)]);

  const deptAndSkill = (
    sheet: string,
    r: { line: number; key: string; data: { department_id: string; skill_id: string } },
  ) => {
    if (!deptCodes.has(r.data.department_id)) {
      flag(sheet, r, "department_id", "unknownDepartment", r.data.department_id);
      return false;
    }
    if (!skillCodes.has(`${r.data.department_id}/${r.data.skill_id}`)) {
      flag(sheet, r, "skill_id", "unknownSkill", r.data.skill_id);
      return false;
    }
    return true;
  };

  const questions = bundle.Questions.filter((r) => {
    if (!deptAndSkill("Questions", r)) return false;
    if (r.data.passage_id && !passageCodes.has(r.data.passage_id)) {
      flag("Questions", r, "passage_id", "unknownPassage", r.data.passage_id);
      return false;
    }
    media("Questions", r, r.data.media_file);
    return true;
  });
  const itemCodes = new Set([...existing.items, ...questions.map((r) => r.key)]);
  const lessonCodes = new Set([...existing.lessons, ...bundle.Lessons.map((r) => r.key)]);

  const lessons = bundle.Lessons.filter((r) => {
    if (!deptAndSkill("Lessons", r)) return false;
    const badItem = r.data.practice_item_ids.find((i) => !itemCodes.has(i));
    if (badItem) {
      flag("Lessons", r, "practice_item_ids", "unknownItem", badItem);
      return false;
    }
    const badPrereq = r.data.prerequisites.find((p) => !lessonCodes.has(p) || p === r.key);
    if (badPrereq) {
      flag("Lessons", r, "prerequisites", "unknownLesson", badPrereq);
      return false;
    }
    media("Lessons", r, r.data.content_link);
    return true;
  });

  const cutScores = bundle.CutScores.filter((r) => {
    if (deptCodes.has(r.data.department_id)) return true;
    flag("CutScores", r, "department_id", "unknownDepartment", r.data.department_id);
    return false;
  });

  return {
    valid: {
      Departments: departments,
      Skills: skills,
      Passages: passages,
      Questions: questions,
      Lessons: lessons,
      CutScores: cutScores,
    },
    issues,
    missingMedia,
  };
}
