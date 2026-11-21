import type { Comparable } from "./diff";
import type {
  CutScoreRow,
  DepartmentRow,
  LessonRow,
  PassageRow,
  QuestionRow,
  SkillRow,
} from "./sheets";

/**
 * The comparable shape of each sheet row — produced both from the sheet and from the DB,
 * so the preview can say exactly which columns changed.
 */
const n = (v: unknown): number | null =>
  v === null || v === undefined || v === "" ? null : Number(v);
const s = (v: unknown): string | null =>
  v === null || v === undefined || v === "" ? null : String(v);

export const departmentRecord = (r: DepartmentRow): Comparable => ({
  name_en: r.name_en,
  name_ar: r.name_ar,
  description: s(r.description),
  placement_max_items: r.placement_max_items,
  placement_min_items: r.placement_min_items,
  placement_target_se: r.placement_target_se,
  status: r.status,
});

export const skillRecord = (r: SkillRow): Comparable => ({
  name_en: r.name_en,
  name_ar: r.name_ar,
  blueprint_min_share: r.blueprint_min_share,
  order: r.order,
});

export const passageRecord = (r: PassageRow): Comparable => ({
  title: r.title,
  text: r.text,
  media_file: s(r.media_file),
  cefr: s(r.cefr),
  word_count: n(r.word_count),
  tags: r.tags,
  source_note: s(r.source_note),
});

export const questionRecord = (r: QuestionRow): Comparable => ({
  department_id: r.department_id,
  skill_id: r.skill_id,
  sub_skill: s(r.sub_skill),
  item_type: r.item_type,
  stem: r.stem,
  passage_id: s(r.passage_id),
  media_file: s(r.media_file),
  option_a: s(r.option_a),
  option_b: s(r.option_b),
  option_c: s(r.option_c),
  option_d: s(r.option_d),
  option_e: s(r.option_e),
  correct: s(r.correct),
  difficulty: r.difficulty,
  cefr: s(r.cefr),
  grade_band: s(r.grade_band),
  tags: r.tags,
  explanation: s(r.explanation),
  time_limit_sec: n(r.time_limit_sec),
  status: r.status,
  author: s(r.author),
});

export const lessonRecord = (r: LessonRow): Comparable => ({
  department_id: r.department_id,
  skill_id: r.skill_id,
  title_en: r.title_en,
  title_ar: r.title_ar,
  cefr: s(r.cefr),
  grade_band: s(r.grade_band),
  objectives: s(r.objectives),
  duration_min: n(r.duration_min),
  format: r.format,
  content_link: s(r.content_link),
  practice_item_ids: r.practice_item_ids,
  tags: r.tags,
  prerequisites: r.prerequisites,
  xp: r.xp,
  status: r.status,
});

export const cutScoreRecord = (r: CutScoreRow): Comparable => ({
  min_theta: r.min_theta,
  max_theta: r.max_theta,
});

/** DB row (with joined codes) → the same shape. Numbers from Postgres numeric are coerced. */
export const dbRecord = {
  department: (d: Record<string, unknown>): Comparable => ({
    name_en: s(d.name_en),
    name_ar: s(d.name_ar),
    description: s(d.description),
    placement_max_items: n(d.placement_max_items),
    placement_min_items: n(d.placement_min_items),
    placement_target_se: n(d.placement_target_se),
    status: s(d.status),
  }),
  skill: (d: Record<string, unknown>): Comparable => ({
    name_en: s(d.name_en),
    name_ar: s(d.name_ar),
    blueprint_min_share: n(d.blueprint_min_share),
    order: n(d.sort_order),
  }),
  passage: (d: Record<string, unknown>): Comparable => ({
    title: s(d.title),
    text: s(d.body),
    media_file: s(d.media_file),
    cefr: s(d.cefr),
    word_count: n(d.word_count),
    tags: (d.tags as string[] | null) ?? [],
    source_note: s(d.source_note),
  }),
  cutScore: (d: Record<string, unknown>): Comparable => ({
    min_theta: n(d.min_theta),
    max_theta: n(d.max_theta),
  }),
};
