import "server-only";
import { z } from "zod";
import { CEFR, GRADE_BANDS } from "@/features/content/import/fields";
import type { Actor } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { visibleOnly } from "@/lib/visibility/server";

export const FORMATS = [
  "video",
  "audio",
  "reading",
  "interactive",
  "worksheet",
  "game",
  "slides",
] as const;

const blank = (v: unknown) => (v === "" ? undefined : v);
export const libraryFilters = z.object({
  department: z
    .preprocess(
      blank,
      z
        .string()
        .regex(/^[A-Z0-9_]{2,20}$/)
        .optional(),
    )
    .catch(undefined),
  skill: z.preprocess(blank, z.guid().optional()).catch(undefined),
  cefr: z.preprocess(blank, z.enum(CEFR).optional()).catch(undefined),
  grade: z.preprocess(blank, z.enum(GRADE_BANDS).optional()).catch(undefined),
  format: z.preprocess(blank, z.enum(FORMATS).optional()).catch(undefined),
  tag: z.preprocess(blank, z.string().trim().max(60).optional()).catch(undefined),
  q: z.preprocess(blank, z.string().trim().max(80).optional()).catch(undefined),
});
export type LibraryFilters = z.infer<typeof libraryFilters>;

/** Departments the user may see (visibility key `department.<CODE>`), with their skills. */
export async function visibleDepartments(actor: Actor) {
  const db = await createClient();
  const { data } = await db
    .from("departments")
    .select("id, code, name_en, name_ar, skills(id, code, name_en, name_ar, sort_order)")
    .eq("status", "active")
    .order("code");
  return visibleOnly(actor, data ?? [], (d) => `department.${d.code}`);
}

/** Active lessons matching the filters, only in visible departments (max 200). */
export async function searchLessons(actor: Actor, f: LibraryFilters) {
  const departments = await visibleDepartments(actor);
  const allowed = departments
    .filter((d) => !f.department || d.code === f.department)
    .map((d) => d.id);
  if (allowed.length === 0) return { lessons: [], departments };
  const db = await createClient();
  let query = db
    .from("lessons")
    .select(
      "id, code, title_en, title_ar, cefr, grade_band, format, duration_min, tags, xp, objectives, content_url, media_asset_id, departments(code, name_en, name_ar), skills(code, name_en, name_ar), lesson_items(count)",
    )
    .eq("status", "active")
    .in("department_id", allowed)
    .order("code")
    .limit(200);
  if (f.skill) query = query.eq("skill_id", f.skill);
  if (f.cefr) query = query.eq("cefr", f.cefr);
  if (f.grade) query = query.eq("grade_band", f.grade);
  if (f.format) query = query.eq("format", f.format);
  if (f.tag) query = query.contains("tags", [f.tag]);
  if (f.q) {
    const q = f.q.replace(/[%,()]/g, " ");
    query = query.or(`title_en.ilike.%${q}%,title_ar.ilike.%${q}%,objectives.ilike.%${q}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return { lessons: data, departments };
}

export type LibraryLesson = Awaited<ReturnType<typeof searchLessons>>["lessons"][number];
