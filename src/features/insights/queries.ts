import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Dashboards read a materialized summary; refresh it when older than this (free-tier friendly). */
export const MAX_AGE_MS = 10 * 60 * 1000;

/** Refresh the activity summary at most every few minutes (once per request at most). */
export const ensureFresh = cache(async (): Promise<string | null> => {
  const db = await createClient();
  const { data } = await db.rpc("insights_refreshed_at");
  if (data && Date.now() - Date.parse(data) < MAX_AGE_MS) return data;
  const { data: fresh } = await createAdminClient().rpc("refresh_insights");
  return fresh ?? data ?? null;
});

/** Class-level figures for classes the viewer may see (the DB function checks scope). */
export const classStats = cache(async (schoolId: string | null) => {
  await ensureFresh();
  const db = await createClient();
  const { data } = await db.rpc("class_stats", { p_school: schoolId as string });
  return data ?? [];
});
export type ClassStat = Awaited<ReturnType<typeof classStats>>[number];

export const studentStats = cache(async (classId: string) => {
  await ensureFresh();
  const db = await createClient();
  const { data } = await db.rpc("student_stats", { p_class: classId });
  return data ?? [];
});
export type StudentStat = Awaited<ReturnType<typeof studentStats>>[number];

export const classCefr = cache(async (schoolId: string | null) => {
  await ensureFresh();
  const db = await createClient();
  const { data } = await db.rpc("class_cefr", { p_school: schoolId as string });
  return data ?? [];
});

export async function skillMatrix(classId: string) {
  const db = await createClient();
  const { data } = await db.rpc("class_skill_matrix", { p_class: classId });
  return data ?? [];
}

export const teacherUsage = cache(async (schoolId: string) => {
  const db = await createClient();
  const { data } = await db.rpc("teacher_usage", { p_school: schoolId });
  return data ?? [];
});

export async function schoolAverages(schoolId: string) {
  await ensureFresh();
  const db = await createClient();
  const { data } = await db.rpc("school_averages", { p_school: schoolId });
  return data?.[0] ?? null;
}

export async function budgetStats() {
  const db = await createClient();
  const { data } = await db.rpc("budget_stats");
  return data?.[0] ?? null;
}

/** Students' latest figures across every class the viewer may see individually. */
export async function visibleStudents(schoolId: string | null) {
  const classes = await classStats(schoolId);
  const lists = await Promise.all(
    classes.map(async (c) => (await studentStats(c.class_id)).map((s) => ({ ...s, class: c }))),
  );
  return lists.flat();
}
