import { type NoteSection, readNotes, readWritingTask, type WritingTask } from "./lesson";
import { clean, type KeyEntry, readKey, readQuestions, type StepQuestion } from "./questions";

/** A group of quiz questions that share a reading text or a recording. */
export interface QuizGroup {
  title?: string;
  /** Reading: the text the questions are about. */
  text?: { title: string; paragraphs: string[] };
  /** Listening: the track code ("L-A1-01-01"); its MP3 is "<code>.mp3" (B2+ written B2plus). */
  track?: string;
  questions: (StepQuestion & { key?: KeyEntry; part?: string })[];
}
export interface StepLesson {
  /** "1.1", or "UR" for a unit review. */
  lesson: string;
  title: string;
  notes: NoteSection[];
  writing?: WritingTask;
  quiz: QuizGroup[];
  /** Word lists after a quiz ("word<tab>Arabic"). */
  words: { word: string; arabic: string }[];
}
export interface StepBooklet {
  booklet: "B1" | "B2" | "B3" | "B4";
  unit: number;
  level: string;
  lessons: StepLesson[];
  /** Listening scripts by track code (teacher section of the file). */
  scripts: Map<string, { title: string; lines: { speaker: string; text: string }[] }>;
}

const LESSON = /^Lesson (\d)\.(\d) [—–-] (.+)$/;
const QUIZ = /^Lesson (\d\.\d) Quiz [—–-] \d+ Questions$/;
const REVIEW = /^Unit (\d) Review [—–-] (\d+) Questions$/;
const KEYS = /^Answer Keys [—–-]/;
const KEY_OF = /^(?:Lesson (\d\.\d) Quiz|Unit \d Review) [—–-] Answer Key$/;
const WORDS = /^(Passage Vocabulary|Listening Vocabulary|Useful Language) [—–-] /;
const SCRIPTS = /^Teacher Section [—–-] Audio Scripts/;
const TEXT = /^Text \d+ \(Questions? [\d–-]+\):\s*(.+)$/;
const TRACK = /Track\s+(L-[A-Z0-9+]+-[A-Z0-9]+-\d+|M\d{2}-L-\d+)/;
const PART = /^Part [A-D] [—–-] /;
const SCRIPT_HEAD = /\[(L-[A-Z0-9+]+-[A-Z0-9]+-(?:\d+|EX))\]\s*$/;

/** One booklet part file (STEP_F_B<n>_<Skill>_Unit<u>_<Level>_Part<p>) → its lessons. */
export function readBooklet(name: string, text: string): StepBooklet | null {
  const m = /STEP_F_(B[1-4])_[A-Za-z]+_Unit(\d)_(A1|A2|B1|B2|B2plus)_Part[12]/.exec(name);
  if (!m) return null;
  const lines = text.split("\n").map(clean);
  const book: StepBooklet = {
    booklet: m[1] as StepBooklet["booklet"],
    unit: Number(m[2]),
    level: m[3] === "B2plus" ? "B2+" : (m[3] ?? ""),
    lessons: [],
    scripts: new Map(),
  };
  // 1. Cut the file into blocks at the fixed headings.
  type Block = { kind: string; id: string; title: string; from: number; to: number };
  const blocks: Block[] = [];
  lines.forEach((raw, i) => {
    const l = raw.trim();
    let b: Omit<Block, "from" | "to"> | null = null;
    let x: RegExpExecArray | null;
    // A script heading ("Lesson 1.1 — Recording 1 (Q1–2): … [L-A1-01-01]") is not a lesson.
    if (SCRIPT_HEAD.test(l)) return;
    if ((x = QUIZ.exec(l))) b = { kind: "quiz", id: x[1] ?? "", title: l };
    else if ((x = REVIEW.exec(l))) b = { kind: "quiz", id: "UR", title: l };
    else if ((x = LESSON.exec(l))) b = { kind: "lesson", id: `${x[1]}.${x[2]}`, title: x[3] ?? "" };
    else if (/^Unit \d Review Game\b/.test(l)) b = { kind: "lesson", id: "UR", title: l };
    else if (KEYS.test(l)) b = { kind: "keys", id: "", title: l };
    else if ((x = KEY_OF.exec(l))) b = { kind: "key", id: x[1] ?? "UR", title: l };
    else if (WORDS.test(l)) b = { kind: "words", id: "", title: l };
    else if (SCRIPTS.test(l)) b = { kind: "scripts", id: "", title: l };
    if (!b) return;
    const last = blocks.at(-1);
    if (last) last.to = i;
    blocks.push({ ...b, from: i + 1, to: lines.length });
  });
  // 2. Read each block.
  const byId = new Map<string, StepLesson>();
  const lessonFor = (id: string, title = "") => {
    let lesson = byId.get(id);
    if (!lesson) {
      lesson = { lesson: id, title, notes: [], quiz: [], words: [] };
      byId.set(id, lesson);
      book.lessons.push(lesson);
    }
    if (title && !lesson.title) lesson.title = title;
    return lesson;
  };
  let lastLesson: StepLesson | null = null;
  for (const b of blocks) {
    const body = lines.slice(b.from, b.to);
    if (b.kind === "lesson") {
      lastLesson = lessonFor(b.id, b.id === "UR" ? "" : b.title);
      const writingAt = body.findIndex((l) => /^Writing Task W-/.test(l.trim()));
      const teach = writingAt < 0 ? body : body.slice(0, writingAt);
      lastLesson.notes.push(...readNotes(b.id === "UR" ? [b.title, ...teach] : teach));
      if (writingAt >= 0) lastLesson.writing = readWritingTask(body.slice(writingAt)) ?? undefined;
    } else if (b.kind === "quiz") {
      lastLesson = lessonFor(
        b.id,
        b.id === "UR" ? b.title.replace(/ [—–-] \d+ Questions$/, "") : "",
      );
      lastLesson.quiz = readGroups(body);
    } else if (b.kind === "words" && lastLesson) {
      for (const l of body) {
        const [word, arabic] = l.split("\t").map((v) => v.trim());
        if (word && arabic && /[؀-ۿ]/.test(arabic)) lastLesson.words.push({ word, arabic });
      }
    } else if (b.kind === "key") {
      const key = readKey(body);
      for (const g of byId.get(b.id)?.quiz ?? []) for (const q of g.questions) q.key = key.get(q.n);
    } else if (b.kind === "scripts") readScripts(body, book.scripts);
  }
  return book;
}

/** A quiz block → groups: one per reading text or recording, else one for the whole quiz. */
function readGroups(body: readonly string[]): QuizGroup[] {
  const { questions, at } = readQuestions(body);
  const groups: QuizGroup[] = [];
  let group: QuizGroup = { questions: [] };
  let part: string | undefined;
  let qi = 0;
  for (let i = 0; i < body.length; i++) {
    const l = (body[i] ?? "").trim();
    if (at[qi] === i) {
      const q = questions.find((x) => x.n === Number(/^(\d+)/.exec(l)?.[1]));
      if (q) group.questions.push({ ...q, part });
      qi++;
      continue;
    }
    const text = TEXT.exec(l);
    const track = TRACK.exec(l);
    if (text || (track && /^Recording \d/.test(l))) {
      if (group.questions.length || group.text || group.track) groups.push(group);
      group = text
        ? { title: text[1], text: { title: text[1] ?? "", paragraphs: [] }, questions: [] }
        : {
            title: l.replace(TRACK, "").replace(/\s+/g, " ").trim(),
            track: track?.[1],
            questions: [],
          };
      continue;
    }
    if (PART.test(l)) part = l;
    else if (group.text && !group.questions.length && l && !/^\(\d+ words\)$/.test(l))
      group.text.paragraphs.push(l);
  }
  if (group.questions.length) groups.push(group);
  return groups;
}

function readScripts(body: readonly string[], out: StepBooklet["scripts"]) {
  let current: { title: string; lines: { speaker: string; text: string }[] } | null = null;
  for (const raw of body) {
    const l = raw.trim();
    const head = SCRIPT_HEAD.exec(l);
    if (head) {
      current = { title: l.replace(SCRIPT_HEAD, "").trim(), lines: [] };
      out.set(head[1] ?? "", current);
      continue;
    }
    if (!current || !l || /^Situation:/.test(l) || /[؀-ۿ]/.test(l)) continue;
    const said = /^([^:]{1,40}):\s+(.+)$/.exec(l);
    if (said) current.lines.push({ speaker: said[1] ?? "", text: said[2] ?? "" });
  }
}
