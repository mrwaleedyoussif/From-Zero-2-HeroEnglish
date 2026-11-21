import "server-only";
import { createClient } from "@/lib/supabase/server";

export type OptionKind = "interest" | "goal" | "format" | "accommodation" | "mindset";

export interface ProfileOption {
  kind: OptionKind;
  key: string;
  name_en: string;
  name_ar: string;
  emoji: string | null;
  reverse_scored: boolean;
}

/** Wizard choices, in the Owner's order. */
export async function profileOptions(): Promise<ProfileOption[]> {
  const db = await createClient();
  const { data } = await db
    .from("profile_options")
    .select("kind, key, name_en, name_ar, emoji, reverse_scored")
    .eq("status", "active")
    .order("sort_order");
  return (data ?? []) as ProfileOption[];
}

/** A learner's profile (RLS: the learner, or staff with students:view over them). */
export async function learnerProfile(studentId: string) {
  const db = await createClient();
  const { data } = await db
    .from("learner_profiles")
    .select(
      "interests, goals, preferred_formats, accommodations, mindset_answers, mindset_score, language_background, onboarded_at",
    )
    .eq("student_id", studentId)
    .maybeSingle();
  return data;
}
export type LearnerProfile = NonNullable<Awaited<ReturnType<typeof learnerProfile>>>;

/** Latest CEFR level per department (overall) and per skill, from the ability history. */
export async function learnerLevels(studentId: string) {
  const db = await createClient();
  const { data } = await db
    .from("ability_estimates")
    .select(
      "department_id, skill_id, theta, cefr, measured_at, departments(code, name_en, name_ar), skills(code, name_en, name_ar)",
    )
    .eq("student_id", studentId)
    .order("measured_at", { ascending: false })
    .limit(300);
  const latest = new Map<string, NonNullable<typeof data>[number]>();
  for (const row of data ?? []) {
    const key = `${row.department_id}/${row.skill_id ?? ""}`;
    if (!latest.has(key)) latest.set(key, row);
  }
  const rows = [...latest.values()];
  return {
    overall: rows.filter((r) => r.skill_id === null),
    skills: rows.filter((r) => r.skill_id !== null),
  };
}
export type LearnerLevels = Awaited<ReturnType<typeof learnerLevels>>;
