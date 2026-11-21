import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { platformTarget, type Target } from "./engine";

export { platformTarget };

export function schoolTarget(schoolId: string): Target {
  return { school: schoolId, grade: null, class: null, user: null };
}

/**
 * Class target with its grade looked up (grade-scoped grants need it).
 * Unknown or invisible class → a target only platform scope can contain (fails closed for everyone else).
 */
export const classTarget = cache(async (classId: string): Promise<Target> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("classes")
    .select("school_id, grade_id")
    .eq("id", classId)
    .maybeSingle();
  if (!data) return { school: "unknown", grade: "unknown", class: "unknown", user: null };
  return { school: data.school_id, grade: data.grade_id, class: classId, user: null };
});

/** Contexts a user lives in (same as SQL `user_contexts`): their school + each class they study or teach in. */
export const userContexts = cache(async (userId: string): Promise<Target[]> => {
  const supabase = await createClient();
  const [profile, enrolments, teaching] = await Promise.all([
    supabase.from("profiles").select("school_id").eq("id", userId).maybeSingle(),
    supabase
      .from("enrolments")
      .select("class_id, classes(school_id, grade_id)")
      .eq("student_id", userId)
      .eq("status", "active"),
    supabase
      .from("teaching_assignments")
      .select("class_id, classes(school_id, grade_id)")
      .eq("teacher_id", userId),
  ]);
  if (!profile.data) return [];
  const contexts: Target[] = [{ ...platformTarget, school: profile.data.school_id, user: userId }];
  for (const row of [...(enrolments.data ?? []), ...(teaching.data ?? [])]) {
    if (row.classes) {
      contexts.push({
        school: row.classes.school_id,
        grade: row.classes.grade_id,
        class: row.class_id,
        user: userId,
      });
    }
  }
  return contexts;
});
