import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { must } from "./must";
import type { ParsedBundle } from "./cross-check";
import { isUrl } from "./fields";

type Db = Awaited<ReturnType<typeof createClient>>;

interface Lookups {
  deptId: Map<string, string>;
  skillId: Map<string, string>;
  mediaId: (name: string | undefined) => string | null;
}

/** Lessons (+ their practice items) and CEFR cut scores — the last import steps. */
export async function applyLessonsAndCutScores(
  db: Db,
  rows: ParsedBundle,
  { deptId, skillId, mediaId }: Lookups,
) {
  if (rows.Lessons.length) {
    const saved = must(
      await db
        .from("lessons")
        .upsert(
          rows.Lessons.map(({ data: l }) => ({
            code: l.lesson_id,
            department_id: deptId.get(l.department_id) ?? "",
            skill_id: skillId.get(`${l.department_id}/${l.skill_id}`) ?? "",
            title_en: l.title_en,
            title_ar: l.title_ar,
            cefr: l.cefr ?? null,
            grade_band: l.grade_band ?? null,
            objectives: l.objectives ?? null,
            duration_min: l.duration_min ?? null,
            format: l.format,
            content_link: l.content_link ?? null,
            content_url: l.content_link && isUrl(l.content_link) ? l.content_link : null,
            media_asset_id: mediaId(l.content_link),
            tags: l.tags,
            prerequisites: l.prerequisites,
            xp: l.xp,
            status: l.status,
          })),
          { onConflict: "code" },
        )
        .select("id, code"),
      "lessons",
    );
    const lessonIds = saved.map((l) => l.id);
    must(
      await db.from("lesson_items").delete().in("lesson_id", lessonIds).select("id"),
      "lesson_items",
    );
    const practiceCodes = [...new Set(rows.Lessons.flatMap((l) => l.data.practice_item_ids))];
    const itemId = new Map(
      practiceCodes.length
        ? must(await db.from("items").select("id, code").in("code", practiceCodes), "items").map(
            (i) => [i.code, i.id],
          )
        : [],
    );
    const byCode = new Map(saved.map((l) => [l.code, l.id]));
    const links = rows.Lessons.flatMap(({ data: l }) =>
      l.practice_item_ids.flatMap((code, i) => {
        const item = itemId.get(code);
        return item
          ? [{ lesson_id: byCode.get(l.lesson_id) ?? "", item_id: item, sort_order: i }]
          : [];
      }),
    );
    if (links.length)
      must(await db.from("lesson_items").insert(links).select("id"), "lesson_items");
  }

  if (rows.CutScores.length) {
    must(
      await db
        .from("cut_scores")
        .upsert(
          rows.CutScores.map(({ data: c }) => ({
            department_id: deptId.get(c.department_id) ?? "",
            cefr: c.cefr,
            min_theta: c.min_theta,
            max_theta: c.max_theta,
          })),
          { onConflict: "department_id,cefr" },
        )
        .select("id"),
      "cut_scores",
    );
  }
}
