import "server-only";
import { audienceFor, CATALOG } from "@/features/departments/catalog";
import { canSomewhere } from "@/lib/auth/can";
import type { Actor } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { WritingFeedback } from "./writing-feedback";
import { type Level, LEVELS, type Unit, unitSchema } from "./schema";

/**
 * Who may open a strand's units: staff who may see content (to preview), and learners whose
 * department list offers that strand as open. Units hold answer keys, so learners never read
 * the table themselves: after this check the server reads for them.
 */
export async function mayOpenStrand(actor: Actor, strand: string): Promise<boolean> {
  if (await canSomewhere(actor, "content:view")) return true;
  const schoolId = actor.effective.school_id;
  if (!schoolId) return false;
  const db = await createClient();
  const { data: school } = await db
    .from("schools")
    .select("code, name_en")
    .eq("id", schoolId)
    .maybeSingle();
  const audience = school && audienceFor(school);
  return !!audience && CATALOG[audience].some((d) => d.strand === strand && !d.soon);
}

export interface UnitCard {
  id: string;
  level: Level;
  unit: number;
  title: string;
  title_ar: string | null;
  correct: number;
  total: number;
  done: boolean;
}

/** A strand's units in course order, with the learner's progress on each. */
export async function strandUnits(actor: Actor, strand: string): Promise<UnitCard[]> {
  const admin = createAdminClient();
  const [{ data: units }, { data: progress }] = await Promise.all([
    admin
      .from("course_units")
      .select("id, level, unit, title, title_ar")
      .eq("strand", strand)
      .eq("status", "active")
      .limit(1000),
    admin
      .from("course_unit_progress")
      .select("unit_id, correct, total, completed_at")
      .eq("student_id", actor.effective.id)
      .limit(1000),
  ]);
  const mine = new Map((progress ?? []).map((p) => [p.unit_id, p]));
  const order = (l: string) => LEVELS.indexOf(l as Level);
  return (units ?? [])
    .map((u) => ({
      id: u.id,
      level: u.level as Level,
      unit: u.unit,
      title: u.title,
      title_ar: u.title_ar,
      correct: mine.get(u.id)?.correct ?? 0,
      total: mine.get(u.id)?.total ?? 0,
      done: !!mine.get(u.id)?.completed_at,
    }))
    .sort((a, b) => order(a.level) - order(b.level) || a.unit - b.unit);
}

/** What the learner has done on one question so far. */
export interface Answered {
  choice: string;
  correct: boolean | null;
  tries: number;
  /** Whether the first try was right (what the score counts). */
  first: boolean;
  /** Speech checks only: the best score so far (0–100). */
  score?: number;
  /** The writing task only: the feedback last given. */
  detail?: WritingFeedback;
}

export async function loadUnit(
  actor: Actor,
  unitId: string,
): Promise<{
  unit: Unit;
  answers: Record<string, Answered>;
  writing: string;
  /** Recorded audio by item id, where the Owner has put "<id>.mp3" in Drive 02_Media. */
  audio: Record<string, string>;
  /** Pictures by item id, from "<id>.jpg" (or png, webp) in the same Drive folder. */
  images: Record<string, string>;
} | null> {
  if (!/^[A-Z0-9-]{3,40}$/.test(unitId)) return null;
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("course_units")
    .select("content, strand, status")
    .eq("id", unitId)
    .maybeSingle();
  if (!row || row.status !== "active" || !(await mayOpenStrand(actor, row.strand))) return null;
  const unit = unitSchema.safeParse(row.content);
  if (!unit.success) return null;
  const { data: progress } = await admin
    .from("course_unit_progress")
    .select("answers, writing")
    .eq("student_id", actor.effective.id)
    .eq("unit_id", unitId)
    .maybeSingle();
  const { data: media } = await admin
    .from("media_assets")
    .select("id, file_name, mime_type")
    .like("file_name", `${unitId}-%`)
    .eq("status", "active")
    .limit(400);
  const named = (picture: boolean) =>
    Object.fromEntries(
      (media ?? [])
        .filter((m) => (m.mime_type ?? "").startsWith("image/") === picture)
        .map((m) => [m.file_name.replace(/\.[a-z0-9]+$/i, ""), `/api/media/${m.id}`]),
    );
  return {
    unit: unit.data,
    audio: named(false),
    images: named(true),
    answers: (progress?.answers ?? {}) as unknown as Record<string, Answered>,
    writing: progress?.writing ?? "",
  };
}
