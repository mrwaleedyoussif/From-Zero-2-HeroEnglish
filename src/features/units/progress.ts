import "server-only";
import { award } from "@/features/rewards/award";
import { ActionError } from "@/lib/action-result";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/db";
import type { Answered } from "./queries";
import { type Question, questionsOf, triesAllowed, type Unit } from "./schema";

/** A question is settled once it is right (or unmarked) or its tries are used up. */
export const isSettled = (q: Question, a: Answered | undefined) =>
  !!a && (a.correct !== false || a.tries >= triesAllowed(q));

/** Keep a learner's progress on a unit; finishing every question earns the unit's points once. */
export async function saveProgress(
  studentId: string,
  schoolId: string | null,
  unit: Unit,
  patch: { answers?: Record<string, Answered>; writing?: string },
) {
  if (!schoolId) return; // staff previewing a unit leave no progress behind
  const admin = createAdminClient();
  const row: Record<string, unknown> = {
    student_id: studentId,
    unit_id: unit.id,
    school_id: schoolId,
  };
  if (patch.writing !== undefined) row.writing = patch.writing;
  if (patch.answers) {
    const all = questionsOf(unit);
    const marked = all.filter((q) => q.type !== "short");
    row.answers = patch.answers as unknown as Json;
    row.correct = marked.filter((q) => patch.answers?.[q.id]?.first).length;
    row.total = marked.length;
    if (all.every((q) => isSettled(q, patch.answers?.[q.id]))) {
      row.completed_at = new Date().toISOString();
      // Points for finishing a unit, once per unit (the rewards rules decide how many).
      await award(admin, {
        studentId,
        type: "lesson_completed",
        sourceKey: `unit:${unit.id}`,
        seconds: 900,
        accuracy: marked.length ? Math.round((Number(row.correct) / marked.length) * 100) : null,
        meta: { unit: unit.id, cefr: unit.level.replace("+", "") },
      }).catch(() => undefined); // a rewards hiccup must not lose the learner's answers
    }
  }
  const { error } = await admin
    .from("course_unit_progress")
    .upsert(row as never, { onConflict: "student_id,unit_id" });
  if (error) throw new ActionError("failed");
}
