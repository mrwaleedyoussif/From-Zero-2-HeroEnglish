import "server-only";
import { audienceFor } from "@/features/departments/catalog";
import { departmentsFor } from "@/features/departments/states";
import { canSomewhere } from "@/lib/auth/can";
import type { Actor } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { WritingFeedback } from "./writing-feedback";
import { isVisible } from "@/lib/visibility/server";
import { courseLevel, openUnits } from "./order";
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
  return (
    !!audience &&
    (await departmentsFor(audience)).some(
      (d) => !d.soon && (d.strand === strand || d.strands?.includes(strand)),
    )
  );
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
  /** Not open yet: the learner finishes the unit before it first (see order.ts). */
  locked: boolean;
  /** Recommended to this learner by a teacher. */
  recommended: boolean;
}

/** A strand's units in course order, with the learner's progress on each. */
export async function strandUnits(actor: Actor, strand: string): Promise<UnitCard[]> {
  const admin = createAdminClient();
  const [{ data: units }, { data: progress }, { data: recs }] = await Promise.all([
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
    admin
      .from("unit_recommendations")
      .select("unit_id")
      .eq("student_id", actor.effective.id)
      .limit(1000),
  ]);
  // A unit the teacher recommended is open to the learner wherever it sits in the course.
  const recommended = new Set((recs ?? []).map((r) => r.unit_id));
  const mine = new Map((progress ?? []).map((p) => [p.unit_id, p]));
  const order = (l: string) => LEVELS.indexOf(l as Level);
  const cards = (units ?? [])
    .map((u) => ({
      id: u.id,
      level: u.level as Level,
      unit: u.unit,
      title: u.title,
      title_ar: u.title_ar,
      correct: mine.get(u.id)?.correct ?? 0,
      total: mine.get(u.id)?.total ?? 0,
      done: !!mine.get(u.id)?.completed_at,
      locked: false,
      recommended: recommended.has(u.id),
    }))
    .sort((a, b) => order(a.level) - order(b.level) || a.unit - b.unit);
  if (!(await stepByStep(actor))) return cards;
  const open = openUnits(cards, await placedLevel(actor.effective.id));
  return cards.map((c) => ({ ...c, locked: !open.has(c.id) && !c.recommended }));
}

/** Learners go unit by unit (the Owner can switch this off: feature.unitOrder); staff never. */
async function stepByStep(actor: Actor): Promise<boolean> {
  if (await canSomewhere(actor, "content:view")) return false;
  return isVisible(actor, "feature.unitOrder");
}

/** The learner's level from their latest placement result, or null before any test. */
async function placedLevel(studentId: string): Promise<Level | null> {
  const { data } = await createAdminClient()
    .from("ability_estimates")
    .select("cefr")
    .eq("student_id", studentId)
    .is("skill_id", null)
    .order("measured_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return courseLevel(data?.cefr);
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
  // A unit the learner has not reached yet cannot be opened, nor answered (actions load it too).
  if ((await strandUnits(actor, row.strand)).find((u) => u.id === unitId)?.locked) return null;
  const unit = unitSchema.safeParse(row.content);
  if (!unit.success) return null;
  const { data: progress } = await admin
    .from("course_unit_progress")
    .select("answers, writing")
    .eq("student_id", actor.effective.id)
    .eq("unit_id", unitId)
    .maybeSingle();
  // Items named after the unit ("<unit id>-…"), and recordings a quiz names by track code.
  const tracks = unit.data.quiz.flatMap((g) => (g.track ? [`${g.track}.mp3`] : []));
  const [{ data: own }, { data: named_ }] = await Promise.all([
    admin
      .from("media_assets")
      .select("id, file_name, mime_type")
      .like("file_name", `${unitId}-%`)
      .eq("status", "active")
      .limit(400),
    tracks.length
      ? admin
          .from("media_assets")
          .select("id, file_name, mime_type")
          .in("file_name", tracks)
          .eq("status", "active")
      : Promise.resolve({ data: [] }),
  ]);
  const media = [...(own ?? []), ...(named_ ?? [])];
  const named = (picture: boolean) =>
    Object.fromEntries(
      (media ?? [])
        .filter((m) => !m.file_name.endsWith(".none.txt"))
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
