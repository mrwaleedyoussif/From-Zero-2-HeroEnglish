import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Coaching logs the viewer may read (RLS), newest first. */
export async function coachingLogs(limit = 100) {
  const db = await createClient();
  const { data } = await db
    .from("coaching_logs")
    .select(
      "id, kind, observed_on, scores, notes, agreed_actions, follow_up_on, status, coach_id, classes(code), teacher:profiles!coaching_logs_teacher_id_fkey(full_name), coach:profiles!coaching_logs_coach_id_fkey(full_name)",
    )
    .order("observed_on", { ascending: false })
    .limit(limit);
  return data ?? [];
}
export type CoachingLog = Awaited<ReturnType<typeof coachingLogs>>[number];

/** Teachers the viewer may log for (those they supervise) and those teachers' classes. */
export async function loggableTeachers(viewerId: string) {
  const db = await createClient();
  const { data: links } = await db
    .from("supervision_links")
    .select("supervisee_id, profiles!supervision_links_supervisee_id_fkey(full_name, kind)")
    .eq("supervisor_id", viewerId)
    .is("active_to", null);
  const teachers = (links ?? [])
    .filter((l) => l.profiles?.kind === "staff")
    .map((l) => ({ id: l.supervisee_id, name: l.profiles?.full_name ?? "" }));
  const { data: classes } = teachers.length
    ? await db
        .from("teaching_assignments")
        .select("teacher_id, class_id, classes(code)")
        .in(
          "teacher_id",
          teachers.map((t) => t.id),
        )
    : { data: [] };
  return {
    teachers: teachers.sort((a, b) => a.name.localeCompare(b.name)),
    classes: (classes ?? []).map((c) => ({
      teacherId: c.teacher_id,
      id: c.class_id,
      code: c.classes?.code ?? "",
    })),
  };
}

export async function observationRubric() {
  const db = await createClient();
  const { data } = await db
    .from("rubrics")
    .select("id, criteria")
    .eq("code", "OBSERVATION")
    .maybeSingle();
  return data
    ? {
        id: data.id,
        criteria: (data.criteria as { key: string; name_en: string; name_ar: string }[]) ?? [],
      }
    : null;
}
