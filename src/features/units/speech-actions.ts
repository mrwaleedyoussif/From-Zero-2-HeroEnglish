"use server";

import { z } from "zod";
import { ActionError, type ActionResult, runAction } from "@/lib/action-result";
import { getActor } from "@/lib/auth/session";
import { saveProgress } from "./progress";
import { loadUnit } from "./queries";
import { markWords, type WordMark } from "./speech";
import {
  chunkCriteria,
  type Criterion,
  overall,
  taskCriteria,
  wordCriteria,
} from "./speech-criteria";

export interface SpeechFeedback {
  score: number;
  best: number;
  criteria: Criterion[];
  /** The model word by word (shadowing and vocabulary), wrong words marked. */
  marks?: WordMark[];
  extra?: string[];
}

const voice = z
  .object({
    tune: z.enum(["rise", "fall", "flat"]).nullable(),
    beats: z.number().int().min(0).max(200),
    syllables: z.number().int().min(0).max(400),
    contrast: z.number().min(0).max(1),
    range: z.number().min(0).max(60),
    peak: z.number().int().min(0).max(400).nullable(),
  })
  .nullable();

/**
 * Mark what the learner said: the words their browser heard, plus what their recording shows
 * about stress and tune (measured in the browser; null when it could not listen). A shadowing
 * chunk is marked against its model, a word against its stress pattern, a speaking task against
 * its target words. Practice feedback, not a grade; the best score is kept.
 */
export async function checkSpeech(
  unitId: string,
  targetId: string,
  heard: string,
  measured: unknown = null,
  confidence?: number,
): Promise<ActionResult<SpeechFeedback>> {
  return runAction(async () => {
    const said = z.string().trim().max(4000).parse(heard);
    const p = voice.parse(measured);
    const sure = z.number().min(0).max(1).optional().parse(confidence);
    const actor = await getActor();
    if (!actor) throw new ActionError("signedOut");
    const loaded = await loadUnit(actor, unitId);
    if (!loaded) throw new ActionError("forbidden");
    const { unit } = loaded;
    const chunk = unit.model_text?.chunks.find((c) => c.id === targetId);
    const word = unit.vocabulary.find((w) => w.id === targetId);
    const task =
      targetId === "speaking"
        ? unit.speaking_task?.targets
        : targetId === "shadow"
          ? unit.shadow_targets
          : null;
    const criteria = chunk
      ? chunkCriteria(chunk, said, p)
      : word
        ? wordCriteria(word, said, p)
        : task
          ? taskCriteria(task, said, p, sure)
          : null;
    if (!criteria) throw new ActionError("forbidden");
    const score = overall(criteria);
    const key = `speech:${targetId}`;
    const before = loaded.answers[key];
    const best = Math.max(score, before?.score ?? 0);
    if (!actor.viewAs)
      await saveProgress(actor.effective.id, actor.effective.school_id, unit, {
        answers: {
          ...loaded.answers,
          [key]: {
            choice: said.slice(0, 300),
            correct: best >= 60,
            tries: (before?.tries ?? 0) + 1,
            first: false,
            score: best,
          },
        },
      });
    const model = chunk?.text ?? word?.word;
    return { score, best, criteria, ...(model ? markWords(model, said) : {}) };
  });
}
