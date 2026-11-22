import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { Comparable } from "./diff";
import { emptyExisting, type ExistingRecords } from "./pipeline";
import { dbBadgeRecord } from "./badges-sheet";
import { dbRecord } from "./records";

type Db = Awaited<ReturnType<typeof createClient>>;
const s = (v: unknown): string | null =>
  v === null || v === undefined || v === "" ? null : String(v);
const n = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
type Code = { code: string } | null;

/** The database's content in the same comparable shape as the sheets (for the diff). */
export async function loadExisting(db: Db): Promise<ExistingRecords> {
  const [deps, skills, passages, items, lessons, cuts, badges] = await Promise.all([
    db.from("departments").select("*"),
    db.from("skills").select("*, departments(code)"),
    db.from("passages").select("*"),
    db
      .from("items")
      .select("*, departments(code), skills(code), passages(code), item_options(label, body)"),
    db
      .from("lessons")
      .select("*, departments(code), skills(code), lesson_items(sort_order, items(code))"),
    db.from("cut_scores").select("*, departments(code)"),
    db.from("badges").select("*"),
  ]);
  const out = emptyExisting();
  for (const d of deps.data ?? []) out.Departments.set(d.code, dbRecord.department(d));
  for (const k of skills.data ?? [])
    out.Skills.set(`${k.departments?.code}/${k.code}`, dbRecord.skill(k));
  for (const p of passages.data ?? []) out.Passages.set(p.code, dbRecord.passage(p));
  for (const c of cuts.data ?? [])
    out.CutScores.set(`${c.departments?.code}/${c.cefr}`, dbRecord.cutScore(c));

  for (const i of items.data ?? []) {
    const opt = (label: string) => s(i.item_options.find((o) => o.label === label)?.body);
    const record: Comparable = {
      department_id: s((i.departments as Code)?.code),
      skill_id: s((i.skills as Code)?.code),
      sub_skill: s(i.sub_skill),
      item_type: i.item_type,
      stem: i.stem,
      passage_id: s((i.passages as Code)?.code),
      media_file: s(i.media_file),
      option_a: opt("A"),
      option_b: opt("B"),
      option_c: opt("C"),
      option_d: opt("D"),
      option_e: opt("E"),
      correct: s(i.correct),
      difficulty: n(i.difficulty),
      cefr: s(i.cefr),
      grade_band: s(i.grade_band),
      tags: i.tags,
      explanation: s(i.explanation),
      time_limit_sec: n(i.time_limit_sec),
      status: i.status,
      author: s(i.author),
    };
    out.Questions.set(i.code, record);
  }

  for (const l of lessons.data ?? []) {
    const practice = [...l.lesson_items]
      .sort((a, b) => a.sort_order - b.sort_order)
      .flatMap((li) => (li.items ? [li.items.code] : []));
    out.Lessons.set(l.code, {
      department_id: s((l.departments as Code)?.code),
      skill_id: s((l.skills as Code)?.code),
      title_en: l.title_en,
      title_ar: l.title_ar,
      cefr: s(l.cefr),
      grade_band: s(l.grade_band),
      objectives: s(l.objectives),
      duration_min: n(l.duration_min),
      format: l.format,
      content_link: s(l.content_link),
      practice_item_ids: practice,
      tags: l.tags,
      prerequisites: l.prerequisites,
      xp: l.xp,
      status: l.status,
    });
  }
  for (const b of badges.data ?? []) out.Badges.set(b.code, dbBadgeRecord(b));
  return out;
}
