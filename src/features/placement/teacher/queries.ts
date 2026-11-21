import "server-only";
import { can } from "@/lib/auth/can";
import { classTarget } from "@/lib/auth/scope";
import type { Actor } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/** Latest result per student and department the teacher may see (RLS: placement:view_results). */
export async function classResults() {
  const db = await createClient();
  const { data } = await db
    .from("test_sessions")
    .select(
      "id, student_id, kind, status, cefr, scaled_score, tab_switches, items_count, started_at, completed_at, department_id, departments(code, name_en, name_ar), profiles(full_name, username)",
    )
    .order("started_at", { ascending: false })
    .limit(500);
  const latest = new Map<string, NonNullable<typeof data>[number]>();
  for (const s of data ?? []) {
    const key = `${s.student_id}/${s.department_id}/${s.kind}`;
    if (!latest.has(key)) latest.set(key, s);
  }
  return [...latest.values()].sort((a, b) =>
    (a.profiles?.full_name ?? "").localeCompare(b.profiles?.full_name ?? ""),
  );
}

export async function pendingScoring() {
  const db = await createClient();
  const { data } = await db
    .from("productive_submissions")
    .select("id, kind, session_id, created_at, profiles(full_name)")
    .eq("status", "submitted")
    .order("created_at")
    .limit(100);
  return data ?? [];
}

/** Classes where the teacher may open a progress check, and the departments to choose from. */
export async function windowOptions(actor: Actor) {
  const db = await createClient();
  const [{ data: classes }, { data: departments }, { data: windows }] = await Promise.all([
    db
      .from("classes")
      .select("id, code, academic_years!inner(is_current)")
      .eq("academic_years.is_current", true)
      .order("code"),
    db
      .from("departments")
      .select("id, code, name_en, name_ar")
      .eq("status", "active")
      .order("code"),
    db
      .from("placement_windows")
      .select("id, closes_at, classes(code), departments(code)")
      .gt("closes_at", new Date().toISOString())
      .order("closes_at"),
  ]);
  const allowed = [];
  for (const c of classes ?? [])
    if (await can(actor, "placement:retake", await classTarget(c.id))) allowed.push(c);
  return { classes: allowed, departments: departments ?? [], open: windows ?? [] };
}

export async function productiveRubric() {
  const db = await createClient();
  const { data } = await db
    .from("rubrics")
    .select("id, criteria")
    .eq("code", "CEFR-PRODUCTIVE")
    .maybeSingle();
  return data
    ? {
        id: data.id,
        criteria: (data.criteria as { key: string; name_en: string; name_ar: string }[]) ?? [],
      }
    : null;
}
