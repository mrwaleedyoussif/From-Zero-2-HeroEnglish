import "server-only";
import { visibleDepartments } from "@/features/content/library/queries";
import { can } from "@/lib/auth/can";
import { classTarget } from "@/lib/auth/scope";
import type { Actor } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/** Current-year classes where the actor holds `perm` (e.g. lessons:assign, students:edit). */
export async function myClasses(actor: Actor, perm: string) {
  const db = await createClient();
  const { data } = await db
    .from("classes")
    .select("id, code, school_id, academic_years!inner(is_current)")
    .eq("academic_years.is_current", true)
    .order("code");
  const out: { id: string; code: string }[] = [];
  for (const c of data ?? [])
    if (await can(actor, perm, await classTarget(c.id))) out.push({ id: c.id, code: c.code });
  return out;
}

/** Active students of a class (RLS: staff who may see the class). */
export async function roster(classId: string) {
  const db = await createClient();
  const { data } = await db
    .from("enrolments")
    .select("student_id, profiles!enrolments_student_id_fkey(full_name, username)")
    .eq("class_id", classId)
    .eq("status", "active");
  return (data ?? [])
    .map((e) => ({
      id: e.student_id,
      name: e.profiles?.full_name ?? "",
      username: e.profiles?.username ?? "",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
export type RosterStudent = Awaited<ReturnType<typeof roster>>[number];

export async function groupsAndTeams(classId: string) {
  const db = await createClient();
  const [groups, teams] = await Promise.all([
    db
      .from("groups")
      .select("id, name, group_members(student_id)")
      .eq("class_id", classId)
      .order("name"),
    db
      .from("teams")
      .select("id, name, team_members(student_id)")
      .eq("class_id", classId)
      .order("name"),
  ]);
  return {
    groups: (groups.data ?? []).map((g) => ({
      id: g.id,
      name: g.name,
      members: g.group_members.map((m) => m.student_id),
    })),
    teams: (teams.data ?? []).map((g) => ({
      id: g.id,
      name: g.name,
      members: g.team_members.map((m) => m.student_id),
    })),
  };
}

/** Lessons the teacher may assign: active, in visible departments. */
export async function assignableLessons(actor: Actor) {
  const departments = await visibleDepartments(actor);
  if (departments.length === 0) return [];
  const db = await createClient();
  const { data } = await db
    .from("lessons")
    .select("id, code, title_en, title_ar, cefr, format, skill_id, tags, department_id")
    .eq("status", "active")
    .in(
      "department_id",
      departments.map((d) => d.id),
    )
    .order("code")
    .limit(500);
  return data ?? [];
}
export type AssignableLesson = Awaited<ReturnType<typeof assignableLessons>>[number];

/** Assignment tracker for a class: each assignment with every target student's progress. */
export async function tracker(classId: string) {
  const db = await createClient();
  const { data } = await db
    .from("assignments")
    .select(
      "id, note, due_at, required, created_at, lessons(code, title_en, title_ar), assignment_progress(student_id, status, score, time_spent_sec, completed_at)",
    )
    .eq("class_id", classId)
    .order("created_at", { ascending: false })
    .limit(50);
  return data ?? [];
}
export type TrackerRow = Awaited<ReturnType<typeof tracker>>[number];

/** Latest overall and per-skill ability for a class's students (for teacher suggestions). */
export async function classAbilities(studentIds: readonly string[]) {
  if (studentIds.length === 0) return [];
  const db = await createClient();
  const { data } = await db
    .from("ability_estimates")
    .select("student_id, department_id, skill_id, theta, cefr, measured_at")
    .in("student_id", [...studentIds])
    .order("measured_at", { ascending: false })
    .limit(2000);
  const latest = new Map<string, NonNullable<typeof data>[number]>();
  for (const r of data ?? []) {
    const key = `${r.student_id}/${r.department_id}/${r.skill_id ?? ""}`;
    if (!latest.has(key)) latest.set(key, r);
  }
  return [...latest.values()];
}

export async function skillNames() {
  const db = await createClient();
  const { data } = await db.from("skills").select("id, code, name_en, name_ar");
  return new Map((data ?? []).map((s) => [s.id, s]));
}
