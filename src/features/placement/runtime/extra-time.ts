import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

/** Learners with the "extra time" accommodation get half as much time again (SPEC §8). */
export const EXTRA_TIME_FACTOR = 1.5;

export async function timeFactor(admin: Admin, studentId: string): Promise<number> {
  const { data } = await admin
    .from("learner_profiles")
    .select("accommodations")
    .eq("student_id", studentId)
    .maybeSingle();
  return data?.accommodations.includes("extra_time") ? EXTRA_TIME_FACTOR : 1;
}

export const scaleTime = (seconds: number | null, factor: number): number | null =>
  seconds === null ? null : Math.round(seconds * factor);
