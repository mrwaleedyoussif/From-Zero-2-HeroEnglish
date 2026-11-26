import type { StepBooklet, StepLesson } from "./booklet";

/** The course strand for each STEP booklet (Grammar, Reading, Listening, Composition). */
export const STEP_STRANDS = { B1: "SG", B2: "SR", B3: "SL", B4: "SC" } as const;
export type StepStrand = (typeof STEP_STRANDS)[keyof typeof STEP_STRANDS];

const plain = (level: string) => level.replace("+", "P");
/** "B2+" is written "B2plus" in the MP3 file names. */
const audioName = (track: string) => track.replace("B2+", "B2plus");

/**
 * One lesson (or unit review) of a booklet as a course unit document: the same shape the unit
 * importer checks (features/units/schema.ts), so it is saved, shown and marked like any unit.
 * Lessons are numbered in the author's order; the unit review comes last.
 */
export function lessonToUnit(book: StepBooklet, lesson: StepLesson, order: number) {
  const strand = STEP_STRANDS[book.booklet];
  const review = lesson.lesson === "UR";
  const id = `${strand}-${plain(book.level)}-${review ? `UR${book.unit}` : `L${lesson.lesson.replace(".", "-")}`}`;
  return {
    id,
    strand,
    level: plain(book.level),
    unit: order,
    title: review ? lesson.title || `Unit ${book.unit} Review` : `${lesson.lesson} ${lesson.title}`,
    topic: `STEP Foundation · Unit ${book.unit}`,
    step: { booklet: book.booklet, unit: book.unit, lesson: lesson.lesson },
    notes: lesson.notes,
    vocabulary: lesson.words.map((w, i) => ({
      id: `${id}-W${String(i + 1).padStart(2, "0")}`,
      word: w.word,
      arabic: w.arabic,
    })),
    quiz: lesson.quiz.map((g, gi) => {
      const script = g.track ? book.scripts.get(g.track) : undefined;
      return {
        id: `${id}-G${gi + 1}`,
        title: g.title,
        text: g.text?.paragraphs.length ? { id: `${id}-T${gi + 1}`, ...g.text } : undefined,
        track: g.track ? audioName(g.track) : undefined,
        script: script?.lines.length ? script.lines : undefined,
        // A question without an answer in the key is left out rather than marked wrongly.
        questions: g.questions
          .filter((q) => q.key)
          .map((q) => ({
            id: `${id}-Q${String(q.n).padStart(2, "0")}`,
            type: "mcq" as const,
            skill: g.text
              ? "reading"
              : g.track
                ? "listening"
                : strand === "SC"
                  ? "composition"
                  : "grammar",
            stem: q.stem,
            options: q.options,
            answer: q.key?.answer ?? "a",
            hints: [],
            ...(q.part ? { part: q.part } : {}),
            ...(q.key ? { explanation: { en: q.key.en, ar: q.key.ar } } : {}),
          })),
      };
    }),
    writing_task: lesson.writing
      ? {
          prompt: lesson.writing.prompt,
          word_count: lesson.writing.word_count,
          planning_frame: lesson.writing.planning_frame,
          starters: [],
          checklist: lesson.writing.checklist,
          model_answer_4: lesson.writing.model_answer_4,
          commentary: lesson.writing.commentary,
        }
      : undefined,
  };
}

/** Every lesson of a booklet part file, in order (unit review last, numbered after lesson 9). */
export function bookletToUnits(book: StepBooklet) {
  return book.lessons.map((lesson) => {
    const n = lesson.lesson === "UR" ? 20 : Number(lesson.lesson.split(".")[1]);
    return lessonToUnit(book, lesson, n);
  });
}
