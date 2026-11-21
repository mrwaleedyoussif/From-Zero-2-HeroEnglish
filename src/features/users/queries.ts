import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface UserFilters {
  school?: string;
  kind?: "staff" | "student";
  q?: string;
}

/** Users the signed-in user may see (RLS decides), max 300 rows. */
export async function listUsers(filters: UserFilters) {
  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select(
      "id, full_name, username, email, kind, status, school_id, schools(code), user_roles(roles(key, name_en, name_ar))",
    )
    .order("kind")
    .order("full_name")
    .limit(300);
  if (filters.school) query = query.eq("school_id", filters.school);
  if (filters.kind) query = query.eq("kind", filters.kind);
  if (filters.q) {
    const q = filters.q.replace(/[%,()]/g, " ").trim();
    query = query.or(`full_name.ilike.%${q}%,username.ilike.%${q}%,email.ilike.%${q}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function listRoles() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("roles")
    .select("id, key, name_en, name_ar, default_scope_type, status, is_system")
    .order("is_system", { ascending: false })
    .order("key");
  if (error) throw error;
  return data;
}

/** Grades and classes of a school, for scope pickers. */
export async function schoolStructure(schoolId: string) {
  const supabase = await createClient();
  const [school, grades, classes] = await Promise.all([
    supabase.from("schools").select("id, code, name_en, name_ar").eq("id", schoolId).maybeSingle(),
    supabase
      .from("grades")
      .select("id, code, name_en, name_ar")
      .eq("school_id", schoolId)
      .order("sort_order"),
    supabase
      .from("classes")
      .select("id, code, grade_id, year_id, academic_years(is_current)")
      .eq("school_id", schoolId)
      .eq("status", "active")
      .order("code"),
  ]);
  return {
    school: school.data,
    grades: grades.data ?? [],
    classes: (classes.data ?? []).filter((c) => c.academic_years?.is_current !== false),
  };
}

export type SchoolStructure = Awaited<ReturnType<typeof schoolStructure>>;

export async function getUserDetail(id: string) {
  const supabase = await createClient();
  const [profile, roles, overrides, enrolments, teaching] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, full_name, username, email, kind, status, locale, consent, school_id, created_at, schools(code, name_en, name_ar)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("user_roles")
      .select("id, role_id, scope_type, scope_id, created_at, roles(key, name_en, name_ar, status)")
      .eq("user_id", id),
    supabase
      .from("user_permission_overrides")
      .select("id, permission_key, effect, scope_type, scope_id, expires_at, reason, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("enrolments").select("id, class_id, status, classes(code)").eq("student_id", id),
    supabase
      .from("teaching_assignments")
      .select("id, class_id, classes(code)")
      .eq("teacher_id", id),
  ]);
  if (!profile.data) return null;
  return {
    profile: profile.data,
    roles: roles.data ?? [],
    overrides: (overrides.data ?? []).map((o) => ({
      ...o,
      expired: o.expires_at !== null && new Date(o.expires_at).getTime() <= Date.now(),
    })),
    enrolments: enrolments.data ?? [],
    teaching: teaching.data ?? [],
  };
}

export type UserDetail = NonNullable<Awaited<ReturnType<typeof getUserDetail>>>;

/** Human labels for scope ids (schools, grades, classes) the viewer can see. */
export async function scopeLabels(ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids)];
  const labels = new Map<string, string>();
  if (unique.length === 0) return labels;
  const supabase = await createClient();
  const [schools, grades, classes] = await Promise.all([
    supabase.from("schools").select("id, code").in("id", unique),
    supabase.from("grades").select("id, name_en, schools(code)").in("id", unique),
    supabase.from("classes").select("id, code, schools(code)").in("id", unique),
  ]);
  for (const s of schools.data ?? []) labels.set(s.id, s.code);
  for (const g of grades.data ?? []) labels.set(g.id, `${g.schools?.code ?? ""} · ${g.name_en}`);
  for (const c of classes.data ?? []) labels.set(c.id, `${c.schools?.code ?? ""} · ${c.code}`);
  return labels;
}

export async function listPermissions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("permissions")
    .select("key, module, description_en, description_ar")
    .order("module")
    .order("key");
  if (error) throw error;
  return data;
}
