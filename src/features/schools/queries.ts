import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Schools the signed-in user may see (RLS decides). */
export async function listSchools() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("schools")
    .select("id, code, name_en, name_ar, timezone, status, profiles(count)")
    .order("code");
  if (error) throw error;
  return data.map((s) => ({ ...s, people: s.profiles[0]?.count ?? 0 }));
}

export async function getSchool(id: string) {
  const supabase = await createClient();
  const [school, years, grades, classes] = await Promise.all([
    supabase.from("schools").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("academic_years")
      .select("*")
      .eq("school_id", id)
      .order("starts_on", { ascending: false }),
    supabase.from("grades").select("*").eq("school_id", id).order("sort_order"),
    supabase
      .from("classes")
      .select(
        "id, code, name, grade_id, year_id, status, enrolments(count), teaching_assignments(profiles(full_name))",
      )
      .eq("school_id", id)
      .order("code"),
  ]);
  if (!school.data) return null;
  return {
    school: school.data,
    years: years.data ?? [],
    grades: grades.data ?? [],
    classes: (classes.data ?? []).map((c) => ({
      ...c,
      students: c.enrolments[0]?.count ?? 0,
      teachers: c.teaching_assignments.flatMap((t) => (t.profiles ? [t.profiles.full_name] : [])),
    })),
  };
}

export type SchoolDetail = NonNullable<Awaited<ReturnType<typeof getSchool>>>;
