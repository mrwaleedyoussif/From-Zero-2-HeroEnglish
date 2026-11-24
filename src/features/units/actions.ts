"use server";

import { z } from "zod";
import { ActionError, type ActionResult, runAction } from "@/lib/action-result";
import { getActor } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/db";
import { type Answered, loadUnit } from "./queries";
import { isCorrect, questionsOf, shownAnswer, triesAllowed, type Unit } from "./schema";

type Bi = { en: string; ar: string };
export interface Feedback {
  /** null = a free-text answer the app does not mark. */
  correct: boolean | null;
  /** The next hint after a wrong try, while there is one. */
  hint?: Bi;
  /** Once the question is settled: the right answer and why. */
  answer?: string;
  explanation?: Bi;
}

async function save(
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
    const settled = all.every((q) => {
      const a = patch.answers?.[q.id];
      return a && (a.correct !== false || a.tries >= triesAllowed(q));
    });
    row.answers = patch.answers as unknown as Json;
    row.correct = marked.filter((q) => patch.answers?.[q.id]?.first).length;
    row.total = marked.length;
    if (settled) row.completed_at = new Date().toISOString();
  }
  const { error } = await admin
    .from("course_unit_progress")
    .upsert(row as never, { onConflict: "student_id,unit_id" });
  if (error) throw new ActionError("failed");
}

/** Check one answer on the server (the browser never has the key) and keep the progress. */
export async function answerQuestion(
  unitId: string,
  questionId: string,
  choice: string,
): Promise<ActionResult<Feedback>> {
  return runAction(async () => {
    const said = z.string().trim().min(1).max(400).parse(choice);
    const actor = await getActor();
    if (!actor) throw new ActionError("signedOut");
    const loaded = await loadUnit(actor, unitId);
    const q = loaded && questionsOf(loaded.unit).find((x) => x.id === questionId);
    if (!loaded || !q) throw new ActionError("forbidden");
    const before = loaded.answers[q.id];
    // A settled question stays settled: its score cannot be improved by answering again.
    if (before && (before.correct !== false || before.tries >= triesAllowed(q)))
      return { correct: before.correct, answer: shownAnswer(q), explanation: q.explanation };

    const correct = isCorrect(q, said);
    const tries = (before?.tries ?? 0) + 1;
    const now: Answered = { choice: said, correct, tries, first: tries === 1 && correct === true };
    if (!actor.viewAs)
      await save(actor.effective.id, actor.effective.school_id, loaded.unit, {
        answers: { ...loaded.answers, [q.id]: now },
      });
    if (correct === false && tries < triesAllowed(q))
      return { correct, hint: q.type === "mcq" ? q.hints[tries - 1] : undefined };
    return { correct, answer: shownAnswer(q), explanation: q.explanation };
  });
}

/** Keep the learner's writing; the model answer is shown only after they have written. */
export async function saveWriting(
  unitId: string,
  text: string,
): Promise<ActionResult<{ model: string | null }>> {
  return runAction(async () => {
    const writing = z.string().trim().min(1).max(6000).parse(text);
    const actor = await getActor();
    if (!actor) throw new ActionError("signedOut");
    const loaded = await loadUnit(actor, unitId);
    if (!loaded) throw new ActionError("forbidden");
    if (!actor.viewAs)
      await save(actor.effective.id, actor.effective.school_id, loaded.unit, { writing });
    return { model: loaded.unit.writing_task?.model_answer_4 ?? null };
  });
}
