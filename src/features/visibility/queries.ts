import "server-only";
import type { VisibilityRule } from "@/lib/visibility/engine";
import { createClient } from "@/lib/supabase/server";

/** Everything the Studio needs (caller has visibility:manage, so RLS returns all rules). */
export async function studioData(key: string | null) {
  const db = await createClient();
  const [rules, roles, plans, schools, grades, classes, flags] = await Promise.all([
    key
      ? db.from("visibility_rules").select("*").eq("target_key", key).order("created_at")
      : Promise.resolve({ data: [] as VisibilityRule[] }),
    db.from("roles").select("id, key, name_en, name_ar").order("key"),
    db.from("plans").select("id, key, name_en, name_ar").order("sort_order"),
    db.from("schools").select("id, code, name_en, name_ar").order("code"),
    db
      .from("grades")
      .select("id, code, name_en, name_ar, school_id, sort_order")
      .order("sort_order"),
    db
      .from("classes")
      .select("id, code, grade_id, school_id, academic_years!inner(is_current)")
      .eq("academic_years.is_current", true)
      .order("code"),
    db.from("feature_flags").select("*").order("key"),
  ]);
  return {
    rules: (rules.data ?? []) as VisibilityRule[],
    roles: roles.data ?? [],
    plans: plans.data ?? [],
    schools: schools.data ?? [],
    grades: grades.data ?? [],
    classes: classes.data ?? [],
    flags: flags.data ?? [],
  };
}

export type StudioData = Awaited<ReturnType<typeof studioData>>;

/** Find a user by email or username (for "check a user" and user-level rules). */
export async function findUser(query: string) {
  const db = await createClient();
  const q = query.trim().toLowerCase();
  // Only plain emails/usernames reach the PostgREST filter (no commas or parentheses).
  if (!/^[a-z0-9@._+-]{2,120}$/.test(q)) return null;
  const { data } = await db
    .from("profiles")
    .select("id, full_name, username, email, school_id")
    .or(`email.eq.${q},username.eq.${q}`)
    .limit(1)
    .maybeSingle();
  return data;
}

export async function rulesForUser(userId: string): Promise<VisibilityRule[]> {
  const db = await createClient();
  const { data } = await db.rpc("visibility_rules_for", { p_user: userId });
  return data ?? [];
}
