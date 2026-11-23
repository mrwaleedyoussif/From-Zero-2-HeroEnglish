import "server-only";
import { itemB } from "@/features/placement/engine/rasch";
import { type ItemType, isCorrect, PRODUCTIVE_TYPES } from "@/features/placement/engine/scoring";
import { type PublicItem, publicItem } from "@/features/placement/runtime/public-item";
import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

export const PRACTICE_ITEMS = 5;

interface PoolItem {
  id: string;
  item_type: string;
  correct: string | null;
  difficulty: number;
  b_calibrated: number | null;
  inLesson: boolean;
}

/** The lesson's own items, then same skill + level items, closest to the learner's ability first. */
async function pool(admin: Admin, lessonId: string, skillId: string, cefr: string | null) {
  const select = "id, item_type, correct, difficulty, b_calibrated, status";
  const [own, more] = await Promise.all([
    admin
      .from("lesson_items")
      .select(`items(${select})`)
      .eq("lesson_id", lessonId)
      .order("sort_order"),
    cefr
      ? admin
          .from("items")
          .select(select)
          .eq("skill_id", skillId)
          .eq("cefr", cefr)
          .eq("status", "active")
          .limit(40)
      : Promise.resolve({ data: [] as never[] }),
  ]);
  const items: PoolItem[] = [];
  for (const r of own.data ?? []) if (r.items) items.push({ ...r.items, inLesson: true });
  for (const r of more.data ?? [])
    if (!items.some((i) => i.id === r.id)) items.push({ ...r, inLesson: false });
  return items.filter((i) => !PRODUCTIVE_TYPES.has(i.item_type as ItemType));
}

/** Latest θ for the skill (or the department overall) — the practice check adapts to it. */
async function thetaFor(admin: Admin, studentId: string, skillId: string, departmentId: string) {
  const { data } = await admin
    .from("ability_estimates")
    .select("theta, skill_id")
    .eq("student_id", studentId)
    .eq("department_id", departmentId)
    .order("measured_at", { ascending: false })
    .limit(50);
  const row = data?.find((r) => r.skill_id === skillId) ?? data?.find((r) => r.skill_id === null);
  return row ? Number(row.theta) : 0;
}

export async function choosePractice(
  admin: Admin,
  lesson: { id: string; skill_id: string; cefr: string | null; department_id: string },
  studentId: string,
): Promise<PublicItem[]> {
  const [items, theta] = await Promise.all([
    pool(admin, lesson.id, lesson.skill_id, lesson.cefr),
    thetaFor(admin, studentId, lesson.skill_id, lesson.department_id),
  ]);
  const distance = (i: PoolItem) => Math.abs(itemB(i) - theta);
  const chosen = [...items]
    .sort((a, b) => Number(b.inLesson) - Number(a.inLesson) || distance(a) - distance(b))
    .slice(0, PRACTICE_ITEMS);
  const out = await Promise.all(chosen.map((i) => publicItem(admin, i.id)));
  return out.filter((i) => i !== null);
}

/**
 * Score submitted answers; only items from this lesson's practice pool count, each once. The
 * score is out of the number of items the check serves, so sending one easy answer (or none)
 * can't produce 100%.
 */
export async function scorePractice(
  admin: Admin,
  lesson: { id: string; skill_id: string; cefr: string | null },
  answers: readonly { itemId: string; answer: string | string[] }[],
) {
  const items = new Map(
    (await pool(admin, lesson.id, lesson.skill_id, lesson.cefr)).map((i) => [i.id, i]),
  );
  const seen = new Set<string>();
  const results = answers
    .filter((a) => items.has(a.itemId) && !seen.has(a.itemId) && seen.add(a.itemId))
    .slice(0, PRACTICE_ITEMS)
    .map((a) => {
      const item = items.get(a.itemId) as PoolItem;
      return {
        itemId: a.itemId,
        correct: isCorrect(item.item_type as ItemType, item.correct, a.answer) === true,
      };
    });
  const served = Math.max(results.length, Math.min(PRACTICE_ITEMS, items.size));
  const score = served
    ? Math.round((results.filter((r) => r.correct).length / served) * 100)
    : null;
  return { score, results };
}
