import { z } from "zod";
import {
  CEFR,
  code,
  GRADE_BANDS,
  id,
  int,
  intDefault,
  intOpt,
  list,
  num,
  numDefault,
  oneOf,
  oneOfDefault,
  oneOfOpt,
  opt,
  req,
  STATUSES,
} from "./fields";
import { type BadgeRow, badgeRow } from "./badges-sheet";

/** Content sheets in Drive /LinguaPath/01_Content, in import order (docs/DATA_TEMPLATES.md). */
const ITEM_TYPES = [
  "mcq_single",
  "mcq_multi",
  "true_false",
  "gap_fill",
  "matching",
  "ordering",
  "short_answer",
  "writing_prompt",
  "speaking_prompt",
] as const;
const FORMATS = [
  "video",
  "audio",
  "reading",
  "interactive",
  "worksheet",
  "game",
  "slides",
] as const;

export const departmentRow = z.object({
  department_id: code(),
  name_en: req(),
  name_ar: req(),
  description: opt(),
  skills: list(),
  placement_max_items: intDefault(5, 100, 30),
  placement_min_items: intDefault(1, 100, 12),
  placement_target_se: numDefault(0.05, 2, 0.35),
  status: oneOfDefault(STATUSES, "active"),
});

export const skillRow = z.object({
  skill_id: code(),
  department_id: code(),
  name_en: req(),
  name_ar: req(),
  blueprint_min_share: numDefault(0, 1, 0),
  order: intDefault(0, 100, 0),
});

export const passageRow = z.object({
  passage_id: id(),
  title: req(),
  text: req(),
  media_file: opt(),
  cefr: oneOfOpt(CEFR),
  word_count: intOpt(0, 100000),
  tags: list(),
  source_note: opt(),
});

const OPTION_KEYS = ["option_a", "option_b", "option_c", "option_d", "option_e"] as const;
const LETTERS = ["A", "B", "C", "D", "E"] as const;

export const questionRow = z
  .object({
    item_id: id(),
    department_id: code(),
    skill_id: code(),
    sub_skill: opt(),
    item_type: oneOf(ITEM_TYPES),
    stem: req(),
    passage_id: opt(),
    media_file: opt(),
    option_a: opt(),
    option_b: opt(),
    option_c: opt(),
    option_d: opt(),
    option_e: opt(),
    correct: opt(),
    difficulty: int(1, 10),
    cefr: oneOfOpt(CEFR),
    grade_band: oneOfOpt(GRADE_BANDS),
    tags: list(),
    explanation: opt(),
    time_limit_sec: intOpt(5, 7200),
    status: oneOfDefault(STATUSES, "active"),
    author: opt(),
  })
  .superRefine((q, ctx) => {
    const filled = LETTERS.filter((_, i) => q[OPTION_KEYS[i] as (typeof OPTION_KEYS)[number]]);
    const answer = (q.correct ?? "").toUpperCase();
    const letters = answer
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });
    if (
      q.item_type === "mcq_single" ||
      q.item_type === "mcq_multi" ||
      q.item_type === "true_false"
    ) {
      if (filled.length < 2) issue("option_a", "needOptions");
      if (letters.length === 0) issue("correct", "required");
      else if (q.item_type !== "mcq_multi" && letters.length > 1) issue("correct", "oneLetter");
      else if (letters.some((l) => !filled.includes(l as (typeof LETTERS)[number])))
        issue("correct", "letterNotAnOption");
    } else if (
      q.item_type !== "writing_prompt" &&
      q.item_type !== "speaking_prompt" &&
      !q.correct
    ) {
      issue("correct", "required");
    }
  });

export const lessonRow = z.object({
  lesson_id: id(),
  department_id: code(),
  skill_id: code(),
  title_en: req(),
  title_ar: req(),
  cefr: oneOfOpt(CEFR),
  grade_band: oneOfOpt(GRADE_BANDS),
  objectives: opt(),
  duration_min: intOpt(1, 600),
  format: oneOf(FORMATS),
  content_link: opt(),
  practice_item_ids: list(),
  tags: list(),
  prerequisites: list(),
  xp: intDefault(0, 10000, 0),
  status: oneOfDefault(STATUSES, "active"),
});

export const cutScoreRow = z
  .object({
    department_id: code(),
    cefr: oneOf(CEFR),
    min_theta: num(-6, 6),
    max_theta: num(-6, 6),
  })
  .refine((c) => c.max_theta > c.min_theta, { path: ["max_theta"], message: "maxAboveMin" });

export const SHEETS = [
  {
    name: "Departments",
    schema: departmentRow,
    key: (r: z.infer<typeof departmentRow>) => r.department_id,
  },
  {
    name: "Skills",
    schema: skillRow,
    key: (r: z.infer<typeof skillRow>) => `${r.department_id}/${r.skill_id}`,
  },
  { name: "Passages", schema: passageRow, key: (r: z.infer<typeof passageRow>) => r.passage_id },
  { name: "Questions", schema: questionRow, key: (r: z.infer<typeof questionRow>) => r.item_id },
  { name: "Lessons", schema: lessonRow, key: (r: z.infer<typeof lessonRow>) => r.lesson_id },
  {
    name: "CutScores",
    schema: cutScoreRow,
    key: (r: z.infer<typeof cutScoreRow>) => `${r.department_id}/${r.cefr}`,
  },
  { name: "Badges", schema: badgeRow, key: (r: BadgeRow) => r.badge_id },
] as const;

export type SheetName = (typeof SHEETS)[number]["name"];
export type DepartmentRow = z.infer<typeof departmentRow>;
export type SkillRow = z.infer<typeof skillRow>;
export type PassageRow = z.infer<typeof passageRow>;
export type QuestionRow = z.infer<typeof questionRow>;
export type LessonRow = z.infer<typeof lessonRow>;
export type CutScoreRow = z.infer<typeof cutScoreRow>;

export interface SheetRows {
  Departments: DepartmentRow[];
  Skills: SkillRow[];
  Passages: PassageRow[];
  Questions: QuestionRow[];
  Lessons: LessonRow[];
  CutScores: CutScoreRow[];
  Badges: BadgeRow[];
}
