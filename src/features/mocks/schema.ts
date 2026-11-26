import { z } from "zod";

const text = z.string().trim().min(1);
const question = z.object({
  id: text,
  n: z.number().int().min(1).max(200),
  stem: text,
  options: z.record(z.string().regex(/^[a-d]$/), text),
  answer: z.string().regex(/^[a-d]$/),
  explanation: z.object({ en: z.string(), ar: z.string().optional() }).optional(),
});
const group = z.object({
  id: text,
  title: z.string().optional(),
  text: z.object({ title: text, paragraphs: z.array(text).min(1) }).optional(),
  /** A recording ("<track>.mp3" in Drive), played once. */
  track: z.string().optional(),
  script: z.array(z.object({ speaker: text, text })).optional(),
  questions: z.array(question).min(1),
});

/** A STEP mock exam as the importer saves it: four timed sections of questions with keys. */
export const mockSchema = z.object({
  id: z.string().regex(/^M\d{2}$/),
  number: z.number().int(),
  set: z.string().regex(/^[A-Z]$/),
  title: text,
  band: z.string().optional(),
  sections: z
    .array(
      z.object({
        n: z.number().int().min(1).max(9),
        name: text,
        minutes: z.number().int().min(1).max(240),
        groups: z.array(group).min(1),
      }),
    )
    .min(1),
  guide: z.array(z.object({ min: z.number(), max: z.number(), text })).default([]),
});
export type Mock = z.infer<typeof mockSchema>;
export type MockQuestion = z.infer<typeof question>;

export const questionsIn = (section: Mock["sections"][number]) =>
  section.groups.flatMap((g) => g.questions);

/** Scores by section and in total: one mark per right answer. */
export function scoreMock(mock: Mock, answers: Record<string, string>) {
  const sections = mock.sections.map((s) => {
    const qs = questionsIn(s);
    return { n: s.n, right: qs.filter((q) => answers[q.id] === q.answer).length, total: qs.length };
  });
  return {
    sections,
    score: sections.reduce((a, s) => a + s.right, 0),
    total: sections.reduce((a, s) => a + s.total, 0),
  };
}

/** A section as a learner gets it during the exam: no answers, explanations or scripts. */
export function publicSection(section: Mock["sections"][number]) {
  return {
    n: section.n,
    name: section.name,
    minutes: section.minutes,
    groups: section.groups.map((g) => ({
      id: g.id,
      title: g.title,
      text: g.text,
      track: g.track,
      questions: g.questions.map((q) => ({ id: q.id, n: q.n, stem: q.stem, options: q.options })),
    })),
  };
}
export type PublicSection = ReturnType<typeof publicSection>;
