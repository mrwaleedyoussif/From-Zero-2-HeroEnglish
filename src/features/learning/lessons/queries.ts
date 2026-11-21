import "server-only";
import type { Actor } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isVisible } from "@/lib/visibility/server";

const LESSON_FIELDS =
  "id, code, title_en, title_ar, cefr, format, duration_min, tags, xp, objectives, content_url, media_asset_id, media_assets(mime_type), department_id, departments(code, name_en, name_ar), skills(code, name_en, name_ar)";

export type AssignmentStatus = "not_started" | "in_progress" | "done" | "overdue";

/** Shown status: an open assignment past its due date is "overdue" (SPEC §9). */
export function shownStatus(
  status: string,
  dueAt: string | null,
  now = new Date(),
): AssignmentStatus {
  if (status !== "done" && dueAt && new Date(dueAt) < now) return "overdue";
  return status as AssignmentStatus;
}

/** "From my teacher": the learner's assignments, open ones first, soonest due first. */
export async function fromMyTeacher(actor: Actor) {
  const db = await createClient();
  const { data } = await db
    .from("assignment_progress")
    .select(
      `status, score, completed_at, assignments(id, note, due_at, required, created_at, profiles!assignments_created_by_fkey(full_name), lessons(${LESSON_FIELDS}))`,
    )
    .eq("student_id", actor.effective.id)
    .order("updated_at", { ascending: false })
    .limit(100);
  const rows = (data ?? []).filter((r) => r.assignments?.lessons);
  const due = (r: (typeof rows)[number]) =>
    r.assignments?.due_at ? new Date(r.assignments.due_at).getTime() : Number.MAX_SAFE_INTEGER;
  return rows.sort(
    (a, b) => Number(a.status === "done") - Number(b.status === "done") || due(a) - due(b),
  );
}
export type FromTeacherRow = Awaited<ReturnType<typeof fromMyTeacher>>[number];

export async function lessonsByIds(ids: readonly string[]) {
  if (ids.length === 0) return [];
  const db = await createClient();
  const { data } = await db
    .from("lessons")
    .select(LESSON_FIELDS)
    .in("id", [...ids]);
  const byId = new Map((data ?? []).map((l) => [l.id, l]));
  return ids.map((id) => byId.get(id)).filter((l) => l !== undefined);
}
export type StudentLesson = Awaited<ReturnType<typeof lessonsByIds>>[number];

/** A lesson the actor may open: active, readable (RLS) and in a visible department. */
export async function openableLesson(actor: Actor, lessonId: string) {
  const db = await createClient();
  const { data } = await db
    .from("lessons")
    .select(`${LESSON_FIELDS}, skill_id, status`)
    .eq("id", lessonId)
    .maybeSingle();
  if (!data || data.status !== "active" || !data.departments) return null;
  if (!(await isVisible(actor, `department.${data.departments.code}`))) return null;
  return data;
}
export type OpenableLesson = NonNullable<Awaited<ReturnType<typeof openableLesson>>>;

export async function myLessonProgress(studentId: string, lessonId: string) {
  const db = await createClient();
  const { data } = await db
    .from("lesson_progress")
    .select("status, best_score, attempts")
    .eq("student_id", studentId)
    .eq("lesson_id", lessonId)
    .maybeSingle();
  return data;
}
