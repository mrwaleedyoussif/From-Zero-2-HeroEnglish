"use server";

import { z } from "zod";
import { ActionError, type ActionResult, runAction } from "@/lib/action-result";
import { getActor } from "@/lib/auth/session";
import { markAnswer, setOf, SETS } from "./marking";
import { isSettled, saveProgress } from "./progress";
import { type Answered, loadUnit } from "./queries";
import { shownAnswer, triesAllowed } from "./schema";
import { aiWritingFeedback } from "./writing-ai";
import { ruleFeedback, type WritingFeedback } from "./writing-feedback";

type Bi = { en: string; ar: string };
export interface Feedback {
  /** null = a free-text answer the app does not mark. */
  correct: boolean | null;
  /** The next hint after a wrong try, while there is one. */
  hint?: Bi;
  /** Once the question is settled: the right answer and why. */
  answer?: string;
  explanation?: { en: string; ar?: string };
}

/**
 * Submit one exercise: every open question of the set must be answered. Each answer is checked
 * on the server (the browser never has the key). A wrong one gets its next hint and can be
 * tried again; a settled one shows the answer and why, and its score cannot be improved.
 */
export async function submitAnswers(
  unitId: string,
  set: string,
  choices: Record<string, string>,
): Promise<ActionResult<Record<string, Feedback>>> {
  return runAction(async () => {
    const name = z.enum(SETS).parse(set);
    const said = z.record(z.string().max(80), z.string().trim().max(400)).parse(choices);
    const actor = await getActor();
    if (!actor) throw new ActionError("signedOut");
    const loaded = await loadUnit(actor, unitId);
    if (!loaded) throw new ActionError("forbidden");
    // Staff previewing keep no progress, so only what they send can be checked.
    const kept = !!actor.effective.school_id && !actor.viewAs;
    const open = setOf(loaded.unit, name).filter(
      (q) => !isSettled(q, loaded.answers[q.id]) && (kept || said[q.id]),
    );
    if (open.length === 0 || open.some((q) => !said[q.id])) throw new ActionError("incomplete");

    const answers = { ...loaded.answers };
    const out: Record<string, Feedback> = {};
    for (const q of open) {
      const choice = said[q.id] ?? "";
      const correct = markAnswer(q, choice, name);
      const tries = (answers[q.id]?.tries ?? 0) + 1;
      answers[q.id] = { choice, correct, tries, first: tries === 1 && correct === true };
      out[q.id] =
        correct === false && tries < triesAllowed(q)
          ? { correct, hint: q.type === "mcq" ? q.hints[tries - 1] : undefined }
          : { correct, answer: shownAnswer(q), explanation: q.explanation };
    }
    if (kept)
      await saveProgress(actor.effective.id, actor.effective.school_id, loaded.unit, { answers });
    return out;
  });
}

/** AI feedback on one unit's writing is given this many times; later tries use the rules. */
const AI_TRIES = 3;

/**
 * Submit the writing task: it is kept, marked against the seven criteria (by the AI reader when
 * it is on, by the rules otherwise) and the model answer is shown.
 */
export async function submitWriting(
  unitId: string,
  text: string,
): Promise<ActionResult<{ model: string | null; feedback: WritingFeedback }>> {
  return runAction(async () => {
    const writing = z.string().trim().min(1).max(6000).parse(text);
    const actor = await getActor();
    if (!actor) throw new ActionError("signedOut");
    const loaded = await loadUnit(actor, unitId);
    const task = loaded?.unit.writing_task;
    if (!loaded || !task) throw new ActionError("forbidden");
    const { unit } = loaded;
    const ctx = {
      range: task.word_count,
      words: unit.vocabulary.map((w) => w.word),
      topic: `${task.prompt.en} ${unit.title} ${unit.topic ?? ""}`,
    };
    const before = loaded.answers["writing:feedback"];
    const tries = (before?.tries ?? 0) + 1;
    const feedback: WritingFeedback = (tries <= AI_TRIES &&
      (await aiWritingFeedback(writing, unit.level, task.prompt.en, ctx))) || {
      source: "rules",
      notes: ruleFeedback(writing, ctx),
    };
    const scores = feedback.notes.flatMap((n) => (n.score === null ? [] : [n.score]));
    const score = scores.length
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 25)
      : 0;
    const kept: Answered = {
      choice: "",
      correct: null,
      tries,
      first: false,
      score,
      detail: feedback,
    };
    if (!actor.viewAs)
      await saveProgress(actor.effective.id, actor.effective.school_id, unit, {
        writing,
        answers: { ...loaded.answers, "writing:feedback": kept },
      });
    return { model: task.model_answer_4 ?? null, feedback };
  });
}
