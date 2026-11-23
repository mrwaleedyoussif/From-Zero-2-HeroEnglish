import "server-only";
import { visibleDepartments } from "@/features/content/library/queries";
import { allowedBands, gradeBand } from "@/features/placement/runtime/rules";
import type { Actor } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { localDay } from "@/lib/time";
import { learnerLevels, learnerProfile } from "../profile/queries";
import {
  cefrIndex,
  type LessonHistory,
  mixFormats,
  type Reason,
  scoreLesson,
} from "../recommend/engine";

export interface CachedPick {
  id: string;
  score: number;
  reasons: Reason[];
}

const today = () => localDay();

/** Learner's grade band (from their class) → lesson bands within ±1. */
async function bandsFor(studentId: string) {
  const db = await createClient();
  const { data } = await db
    .from("enrolments")
    .select("classes(grades(code))")
    .eq("student_id", studentId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  return allowedBands(gradeBand(data?.classes?.grades?.code));
}

async function compute(actor: Actor): Promise<CachedPick[]> {
  const studentId = actor.effective.id;
  const departments = await visibleDepartments(actor);
  if (departments.length === 0) return [];
  const db = await createClient();
  const [levels, profile, bands, lessons, history, assigned] = await Promise.all([
    learnerLevels(studentId),
    learnerProfile(studentId),
    bandsFor(studentId),
    db
      .from("lessons")
      .select("id, department_id, skill_id, cefr, tags, format, grade_band")
      .eq("status", "active")
      .in(
        "department_id",
        departments.map((d) => d.id),
      )
      .limit(500),
    db
      .from("lesson_progress")
      .select("lesson_id, status, last_opened_at")
      .eq("student_id", studentId),
    db
      .from("assignment_progress")
      .select("assignments(lesson_id)")
      .eq("student_id", studentId)
      .neq("status", "done"),
  ]);

  const overall = new Map(levels.overall.map((r) => [r.department_id, r]));
  const gaps = new Map<string, number>();
  for (const s of levels.skills) {
    const o = overall.get(s.department_id);
    if (o && s.skill_id) gaps.set(s.skill_id, Number(o.theta) - Number(s.theta));
  }
  const seen = new Map<string, LessonHistory>(
    (history.data ?? []).map((h) => [
      h.lesson_id,
      { status: h.status as LessonHistory["status"], lastOpenedAt: new Date(h.last_opened_at) },
    ]),
  );
  const assignedIds = new Set((assigned.data ?? []).map((a) => a.assignments?.lesson_id));
  const now = new Date();
  const scored = (lessons.data ?? [])
    .filter((l) => !assignedIds.has(l.id))
    .filter((l) => !bands || !l.grade_band || bands.has(l.grade_band))
    .map((l) => {
      const learner = {
        level: cefrIndex(overall.get(l.department_id)?.cefr ?? null),
        skillGaps: gaps,
        interests: profile?.interests ?? [],
        formats: profile?.preferred_formats ?? [],
      };
      return {
        ...scoreLesson({ ...l, skillId: l.skill_id }, learner, seen.get(l.id), now),
        format: l.format,
      };
    });
  return mixFormats(scored, 6).map(({ id, score, reasons }) => ({ id, score, reasons }));
}

/**
 * Today's suggestions for the learner. Computed at most once a day and cached (free-tier DB
 * budget); finishing a lesson or editing the profile clears the cache.
 */
export async function recommendedFor(actor: Actor): Promise<CachedPick[]> {
  const admin = createAdminClient();
  const { data: cached } = await admin
    .from("recommendations")
    .select("computed_on, items")
    .eq("student_id", actor.effective.id)
    .maybeSingle();
  if (cached?.computed_on === today()) return cached.items as unknown as CachedPick[];
  const picks = await compute(actor);
  if (!actor.viewAs) {
    const { data: me } = await admin
      .from("profiles")
      .select("school_id")
      .eq("id", actor.real.id)
      .single();
    if (me?.school_id)
      await admin.from("recommendations").upsert({
        student_id: actor.real.id,
        school_id: me.school_id,
        computed_on: today(),
        items: picks as unknown as never,
      });
  }
  return picks;
}

export async function clearRecommendations(studentId: string) {
  await createAdminClient().from("recommendations").delete().eq("student_id", studentId);
}
