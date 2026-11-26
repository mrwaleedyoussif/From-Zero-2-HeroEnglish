/**
 * Reading the questions and answer keys of the STEP Foundation booklets and mock exams
 * (STEP_F_*.docx, as text: one paragraph per line). Pure functions, no I/O.
 */

export interface StepQuestion {
  n: number;
  stem: string;
  options: Record<"a" | "b" | "c" | "d", string>;
}
export interface KeyEntry {
  answer: "a" | "b" | "c" | "d";
  en: string;
  ar?: string;
}

// A question number is followed by a tab ("1.<tab>stem"); "1. Abdullah …" inside a text is not one.
const QUESTION = /^(\d{1,3})\.\t\s*(.+)$/;
const OPTION = /(?:^|\t)\s*([A-D])\.\s+([^\t]+)/g;
const isOptionLine = (line: string) => /^\s*A\.\s/.test(line) || /^\s*[B-D]\.\s/.test(line);

/** Markdown escapes some exports add ("1\\.", "\\_\\_") and odd spaces, removed. */
export const clean = (line: string) =>
  line
    .replace(/\\([._*[\]()#-])/g, "$1")
    .replace(/ /g, " ")
    .trimEnd();

/**
 * Questions in a block of lines: "N.<tab>stem" followed by option lines ("A. …<tab>B. …").
 * A stem can run over several lines until the options start. Lines that are not part of a
 * question (instructions, part headings, text titles) are returned as `other`, by position.
 */
export function readQuestions(lines: readonly string[]): {
  questions: StepQuestion[];
  /** Index (in `lines`) of the first line of each question. */
  at: number[];
} {
  const questions: StepQuestion[] = [];
  const at: number[] = [];
  let current: StepQuestion | null = null;
  let inOptions = false;
  lines.forEach((raw, i) => {
    const line = clean(raw);
    const q = QUESTION.exec(line);
    if (q && !isOptionLine(line)) {
      current = {
        n: Number(q[1]),
        stem: (q[2] ?? "").trim(),
        options: {} as StepQuestion["options"],
      };
      questions.push(current);
      at.push(i);
      inOptions = false;
      return;
    }
    if (!current) return;
    if (isOptionLine(line)) {
      inOptions = true;
      for (const m of line.matchAll(OPTION)) {
        const letter = (m[1] ?? "A").toLowerCase() as keyof StepQuestion["options"];
        current.options[letter] = (m[2] ?? "").trim();
      }
      if (Object.keys(current.options).length === 4) current = null;
      return;
    }
    if (!inOptions && line.trim()) current.stem += `\n${line.trim()}`;
  });
  return { questions: questions.filter((q) => Object.keys(q.options).length === 4), at };
}

const KEY = /^(\d{1,3})\.\s+([A-D])\s+[—–-]\s*(.*)$/;
const HINT = /^تلميح\s*:\s*/;

/**
 * An answer key: "N. B — explanation", then optional "Corrected: …" and "تلميح: …" lines.
 * Returns the entries by question number.
 */
export function readKey(lines: readonly string[]): Map<number, KeyEntry> {
  const out = new Map<number, KeyEntry>();
  let last: KeyEntry | null = null;
  for (const raw of lines) {
    const line = clean(raw).trim();
    const k = KEY.exec(line);
    if (k) {
      last = {
        answer: (k[2] ?? "A").toLowerCase() as KeyEntry["answer"],
        en: (k[3] ?? "").trim(),
      };
      out.set(Number(k[1]), last);
      continue;
    }
    if (!last || !line) continue;
    if (HINT.test(line)) last.ar = line.replace(HINT, "").trim();
    else if (/^Corrected:/i.test(line)) last.en += ` ${line}`;
  }
  return out;
}
