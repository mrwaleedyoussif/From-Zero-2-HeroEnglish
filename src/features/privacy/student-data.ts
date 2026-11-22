import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

/** Every table holding a learner's personal data, with the column that points at them. */
export const STUDENT_TABLES = [
  ["enrolments", "student_id"],
  ["learner_profiles", "student_id"],
  ["test_sessions", "student_id"],
  ["responses", "student_id"],
  ["ability_estimates", "student_id"],
  ["productive_submissions", "student_id"],
  ["placement_retakes", "student_id"],
  ["lesson_progress", "student_id"],
  ["assignment_progress", "student_id"],
  ["group_members", "student_id"],
  ["team_members", "student_id"],
  ["xp_events", "student_id"],
  ["user_badges", "student_id"],
  ["streaks", "student_id"],
  ["coin_ledger", "student_id"],
  ["redemptions", "student_id"],
  ["certificates", "student_id"],
  ["recommendations", "student_id"],
  ["response_aggregates", "student_id"],
  ["learner_notes", "student_id"],
  ["notifications", "user_id"],
] as const;

/** All of a learner's data as one JSON document (SPEC §15 data export, PDPL access right). */
export async function exportStudent(admin: Admin, studentId: string) {
  const { data: profile } = await admin
    .from("profiles")
    .select(
      "id, kind, username, full_name, email, locale, status, consent, consent_at, created_at, schools(code, name_en)",
    )
    .eq("id", studentId)
    .maybeSingle();
  if (!profile || profile.kind !== "student") return null;
  const tables: Record<string, unknown[]> = {};
  for (const [table, column] of STUDENT_TABLES) {
    const { data, error } = await admin
      // Table names come from the fixed list above; the cast only satisfies the typed client.
      .from(table as "notifications")
      .select("*")
      .eq(column as "user_id", studentId)
      .limit(20000);
    if (error) throw new Error(`${table}: ${error.message}`);
    tables[table] = data ?? [];
  }
  return { exported_at: new Date().toISOString(), profile, ...tables };
}
