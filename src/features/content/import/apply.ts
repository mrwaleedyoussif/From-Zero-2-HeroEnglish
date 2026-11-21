import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { ParsedBundle } from "./cross-check";
import { applyLessonsAndCutScores } from "./apply-lessons";
import { must } from "./must";
import { isUrl } from "./fields";

type Db = Awaited<ReturnType<typeof createClient>>;

/** What a preview stores for apply: only new/changed rows, plus which questions changed. */
export interface ImportPayload {
  rows: ParsedBundle;
  changedQuestions: string[];
}

const LETTERS = ["A", "B", "C", "D", "E"] as const;

/**
 * Upsert by stable codes in dependency order. Never deletes content rows (SPEC §6).
 * Runs as the signed-in Owner, so RLS (content:import) applies to every write.
 */
export async function applyPayload(db: Db, payload: ImportPayload, media: Map<string, string>) {
  const { rows } = payload;
  const mediaId = (name: string | undefined) =>
    name && !isUrl(name) ? (media.get(name) ?? null) : null;

  if (rows.Departments.length) {
    must(
      await db
        .from("departments")
        .upsert(
          rows.Departments.map(({ data: d }) => ({
            code: d.department_id,
            name_en: d.name_en,
            name_ar: d.name_ar,
            description: d.description ?? null,
            placement_max_items: d.placement_max_items,
            placement_min_items: d.placement_min_items,
            placement_target_se: d.placement_target_se,
            status: d.status,
          })),
          { onConflict: "code" },
        )
        .select("id"),
      "departments",
    );
  }
  const deptId = new Map(
    must(await db.from("departments").select("id, code"), "departments").map((d) => [d.code, d.id]),
  );

  if (rows.Skills.length) {
    must(
      await db
        .from("skills")
        .upsert(
          rows.Skills.map(({ data: s }) => ({
            department_id: deptId.get(s.department_id) ?? "",
            code: s.skill_id,
            name_en: s.name_en,
            name_ar: s.name_ar,
            blueprint_min_share: s.blueprint_min_share,
            sort_order: s.order,
          })),
          { onConflict: "department_id,code" },
        )
        .select("id"),
      "skills",
    );
  }
  const skillId = new Map(
    must(await db.from("skills").select("id, code, departments(code)"), "skills").map((s) => [
      `${s.departments?.code}/${s.code}`,
      s.id,
    ]),
  );

  if (rows.Passages.length) {
    must(
      await db
        .from("passages")
        .upsert(
          rows.Passages.map(({ data: p }) => ({
            code: p.passage_id,
            title: p.title,
            body: p.text,
            media_file: p.media_file ?? null,
            media_asset_id: mediaId(p.media_file),
            cefr: p.cefr ?? null,
            word_count: p.word_count ?? null,
            tags: p.tags,
            source_note: p.source_note ?? null,
          })),
          { onConflict: "code" },
        )
        .select("id"),
      "passages",
    );
  }
  const passageId = new Map(
    must(await db.from("passages").select("id, code"), "passages").map((p) => [p.code, p.id]),
  );

  if (rows.Questions.length) {
    const codes = rows.Questions.map((q) => q.key);
    const current = new Map(
      must(await db.from("items").select("code, version").in("code", codes), "items").map((i) => [
        i.code,
        i.version,
      ]),
    );
    const changed = new Set(payload.changedQuestions);
    const saved = must(
      await db
        .from("items")
        .upsert(
          rows.Questions.map(({ data: q }) => ({
            code: q.item_id,
            department_id: deptId.get(q.department_id) ?? "",
            skill_id: skillId.get(`${q.department_id}/${q.skill_id}`) ?? "",
            sub_skill: q.sub_skill ?? null,
            item_type: q.item_type,
            stem: q.stem,
            passage_id: q.passage_id ? (passageId.get(q.passage_id) ?? null) : null,
            media_file: q.media_file ?? null,
            media_asset_id: mediaId(q.media_file),
            correct: q.correct ?? null,
            difficulty: q.difficulty,
            cefr: q.cefr ?? null,
            grade_band: q.grade_band ?? null,
            tags: q.tags,
            explanation: q.explanation ?? null,
            time_limit_sec: q.time_limit_sec ?? null,
            status: q.status,
            author: q.author ?? null,
            // Responses store the version answered (SPEC §6), so a changed question gets a new one.
            version:
              (current.get(q.item_id) ?? 0) +
              (changed.has(q.item_id) || !current.has(q.item_id) ? 1 : 0),
          })),
          { onConflict: "code" },
        )
        .select("id, code"),
      "items",
    );
    const ids = saved.map((i) => i.id);
    must(await db.from("item_options").delete().in("item_id", ids).select("id"), "item_options");
    const byCode = new Map(saved.map((i) => [i.code, i.id]));
    const options = rows.Questions.flatMap(({ data: q }) =>
      [q.option_a, q.option_b, q.option_c, q.option_d, q.option_e].flatMap((body, i) =>
        body ? [{ item_id: byCode.get(q.item_id) ?? "", label: LETTERS[i] ?? "A", body }] : [],
      ),
    );
    if (options.length)
      must(await db.from("item_options").insert(options).select("id"), "item_options");
  }

  await applyLessonsAndCutScores(db, rows, { deptId, skillId, mediaId });
}
