import "server-only";
import { audienceFor } from "@/features/departments/catalog";
import { departmentsFor } from "@/features/departments/states";
import { canSomewhere } from "@/lib/auth/can";
import type { Actor } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Style } from "./fonts";
import type { Mode, Stage } from "./pad-draw";

export const STAGES: readonly Stage[] = ["letters", "joins", "words", "sentences", "paragraphs"];
export const homeOf = (style: Style) => `/student/handwriting/${style}`;

/** Open when the person's department list offers this handwriting department (staff preview). */
export async function mayOpenHandwriting(actor: Actor, style: Style): Promise<boolean> {
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
    !!audience && (await departmentsFor(audience)).some((d) => !d.soon && d.home === homeOf(style))
  );
}

export interface Step {
  id: string;
  stage: Stage;
  text: string;
  trace: number | null;
  write: number | null;
}

/** The steps of one style in order, with this learner's best tracing and writing marks. */
export async function stepsFor(actor: Actor, style: Style): Promise<Step[]> {
  const db = await createClient();
  const [steps, mine] = await Promise.all([
    db
      .from("handwriting_steps")
      .select("id, stage, text")
      .eq("status", "active")
      .contains("styles", [style])
      .order("sort_order")
      .limit(1000),
    db
      .from("handwriting_progress")
      .select("step_id, mode, best")
      .eq("student_id", actor.effective.id)
      .eq("style", style)
      .limit(2000),
  ]);
  const best = (id: string, mode: Mode) =>
    mine.data?.find((p) => p.step_id === id && p.mode === mode)?.best ?? null;
  return (steps.data ?? []).map((s) => ({
    id: s.id,
    stage: s.stage as Stage,
    text: s.text,
    trace: best(s.id, "trace"),
    write: best(s.id, "write"),
  }));
}
