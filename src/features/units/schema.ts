import { z } from "zod";

/**
 * A course unit as its author wrote it (one JSON file per unit): objectives, words, a reading
 * text, questions with hints, a writing lesson and a writing task. Parsing is strict about what
 * the app shows or checks, and keeps everything else untouched.
 */
const text = z.string().trim().min(1);
const bi = z.object({ en: text, ar: text });

export const LEVELS = ["A1", "A1+", "A2", "A2+", "B1", "B1+", "B2", "B2+", "C1", "C2"] as const;
export type Level = (typeof LEVELS)[number];
/** Files write the plus levels as "A1P"; the app shows "A1+". */
const level = z
  .string()
  .transform((v) => v.trim().toUpperCase().replace(/P$/, "+"))
  .pipe(z.enum(LEVELS));

const base = {
  id: text,
  skill: text,
  stem: text,
  difficulty: z.number().int().min(1).max(5).optional(),
  explanation: bi,
};
const question = z.discriminatedUnion("type", [
  z.object({
    ...base,
    type: z.literal("mcq"),
    options: z.record(z.string().regex(/^[a-e]$/), text),
    answer: z.string().regex(/^[a-e]$/),
    hints: z.array(bi).max(5).default([]),
  }),
  z.object({ ...base, type: z.literal("tfng"), answer: z.enum(["True", "False", "Not Given"]) }),
  z.object({ ...base, type: z.literal("short"), answer: text }),
  z.object({
    ...base,
    type: z.literal("sequence"),
    events: z.array(text).min(2).max(8),
    /** The right order as letters of the listed events, e.g. "c, d, a, b". */
    answer: z.string().regex(/^[a-h](\s*,\s*[a-h])+$/),
  }),
]);
export type Question = z.infer<typeof question>;

export const unitSchema = z
  .object({
    id: z.string().regex(/^[A-Z0-9-]{3,40}$/),
    strand: z.string().regex(/^[A-Z]{1,8}$/),
    level,
    unit: z.number().int().min(1).max(99),
    title: text,
    title_ar: text.optional(),
    topic: text.optional(),
    objectives: z.array(bi).default([]),
    grammar_notes: z.array(bi).default([]),
    vocabulary: z
      .array(
        z.looseObject({
          id: text,
          word: text,
          pos: z.string().optional(),
          ipa: z.string().optional(),
          definition: text,
          arabic: z.string().optional(),
          example: z.string().optional(),
        }),
      )
      .default([]),
    hook: z.object({ question: bi, prediction: bi }).optional(),
    passage: z.looseObject({ id: text, title: text, paragraphs: z.array(text).min(1) }),
    comprehension: z.array(question).min(1),
    writing_skill: z
      .looseObject({
        name: bi,
        lesson: z.array(text).default([]),
        lesson_ar: z.string().optional(),
        examples: z.array(z.object({ wrong: text, right: text, note: z.string() })).default([]),
        model: z.string().optional(),
        practice: z
          .array(z.object({ id: text, instruction: bi, stem: text, answer: text }))
          .default([]),
      })
      .optional(),
    writing_task: z
      .looseObject({
        prompt: bi,
        word_count: z.tuple([z.number().int(), z.number().int()]).optional(),
        planning_frame: z.array(text).default([]),
        starters: z.array(text).default([]),
        checklist: z.array(bi).default([]),
        model_answer_4: z.string().optional(),
      })
      .optional(),
  })
  .loose()
  .superRefine((unit, ctx) => {
    const ids = new Set<string>();
    for (const q of unit.comprehension) {
      if (ids.has(q.id)) ctx.addIssue({ code: "custom", message: `duplicate question ${q.id}` });
      ids.add(q.id);
      if (q.type === "mcq" && !(q.answer in q.options))
        ctx.addIssue({ code: "custom", message: `${q.id}: answer is not one of the options` });
    }
  });
export type Unit = z.infer<typeof unitSchema>;

/** Whether a learner's choice is right. Short answers are not marked by the app. */
export function isCorrect(q: Question, choice: string): boolean | null {
  const said = choice.trim().toLowerCase();
  if (q.type === "short") return null;
  if (q.type === "sequence")
    return said.replace(/[\s,]/g, "") === q.answer.toLowerCase().replace(/[\s,]/g, "");
  return said === q.answer.toLowerCase();
}

/** Tries before the answer is shown: every hint first for multiple choice, two tries otherwise. */
export const triesAllowed = (q: Question) => (q.type === "mcq" ? q.hints.length + 1 : 2);

/** The right answer as it is shown once a question is settled. */
export const shownAnswer = (q: Question) =>
  q.type === "mcq" ? `${q.answer.toUpperCase()}. ${q.options[q.answer] ?? ""}` : q.answer;

/** A question as the learner's browser gets it: no answer, hints or explanation. */
export function publicQuestion(q: Question) {
  return {
    id: q.id,
    type: q.type,
    skill: q.skill,
    stem: q.stem,
    options: q.type === "mcq" ? q.options : undefined,
    events: q.type === "sequence" ? q.events : undefined,
  };
}
export type PublicQuestion = ReturnType<typeof publicQuestion>;
