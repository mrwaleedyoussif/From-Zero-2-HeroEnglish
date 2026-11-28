import { clean } from "./questions";

/** A part of a lesson's teaching: a heading and its lines, as the author wrote them. */
export interface NoteSection {
  heading: string;
  lines: string[];
  /** For the teacher only (classroom activities), not shown to learners. */
  staff?: boolean;
}

const HEADINGS = [
  /^Objectives$/,
  /^Warm-up\b/,
  /^Form$/,
  /^Use$/,
  /^Signal Words and Notes$/,
  /^Arabic Explanation$/,
  /^Arab Learner Alert$/,
  /^Compare and Contrast$/,
  /^STEP Strategy$/,
  /^Strategy$/,
  /^The Skill$/,
  /^Traps and (Common Mistakes|Distractor Types)$/,
  /^Worked (STEP )?Examples?\b/,
  /^Classroom Corner\b/,
  /^Examiner's commentary$/,
  /^Unit \d Review Game\b/,
];
const STAFF = /^(Classroom Corner|Unit \d Review Game)\b/;
/** Sections the Owner took out of the lessons; also hidden in lessons imported before that. */
export const DROPPED = /^(STEP )?Strateg(y|ies)$/;

/** Split a lesson's teaching lines into sections at the booklets' fixed headings. */
export function readNotes(lines: readonly string[]): NoteSection[] {
  const out: NoteSection[] = [];
  let current: NoteSection | null = null;
  for (const raw of lines) {
    const line = clean(raw).trim();
    if (!line) continue;
    if (HEADINGS.some((h) => h.test(line))) {
      current = { heading: line, lines: [], ...(STAFF.test(line) ? { staff: true } : {}) };
      out.push(current);
      continue;
    }
    if (!current) {
      current = { heading: "", lines: [] };
      out.push(current);
    }
    current.lines.push(line);
  }
  return out.filter((s) => (s.heading || s.lines.length) && !DROPPED.test(s.heading));
}

export interface WritingTask {
  code: string;
  title: string;
  prompt: { en: string; ar: string };
  word_count?: [number, number];
  planning_frame: string[];
  model_answer_4?: string;
  checklist: { en: string; ar?: string }[];
  commentary: string[];
}

/**
 * A composition writing task: "Writing Task W-A1-01 — title", "Task: …" (+ Arabic), a planning
 * frame, the model answer, the examiner's commentary and a self-check list (☐ lines).
 */
export function readWritingTask(lines: readonly string[]): WritingTask | null {
  const all = lines.map((l) => clean(l).trim()).filter(Boolean);
  const head = /^Writing Task (W-[A-Z0-9+]+-\d+)\s+[—–-]\s+(.+)$/.exec(all[0] ?? "");
  if (!head) return null;
  const task: WritingTask = {
    code: head[1] ?? "",
    title: head[2] ?? "",
    prompt: { en: "", ar: "" },
    planning_frame: [],
    checklist: [],
    commentary: [],
  };
  let part: "task" | "plan" | "model" | "comment" | "check" = "task";
  const model: string[] = [];
  for (const line of all.slice(1)) {
    if (/^Planning frame$/i.test(line)) part = "plan";
    else if (/^Model answer\b/i.test(line)) part = "model";
    else if (/^Examiner's commentary$/i.test(line)) part = "comment";
    else if (/^Self-check\b/i.test(line)) part = "check";
    else if (part === "task") {
      if (/[؀-ۿ]/.test(line)) task.prompt.ar ||= line;
      else task.prompt.en += `${task.prompt.en ? " " : ""}${line.replace(/^Task:\s*/, "")}`;
    } else if (part === "plan") task.planning_frame.push(line.replace(/^\d+\.\s*/, ""));
    else if (part === "model") model.push(line);
    else if (part === "comment") task.commentary.push(line.replace(/^▸\s*/, ""));
    else if (line.startsWith("☐")) task.checklist.push({ en: line.replace(/^☐\s*/, "") });
    else if (/[؀-ۿ]/.test(line) && task.checklist.length)
      task.checklist[task.checklist.length - 1]!.ar ??= line;
  }
  const range = /(\d{2,3})\s*[–-]\s*(\d{2,3})\s*words/.exec(lines.join(" "));
  if (range) task.word_count = [Number(range[1]), Number(range[2])];
  if (model.length) task.model_answer_4 = model.join("\n");
  if (!task.prompt.ar) task.prompt.ar = task.prompt.en;
  return task;
}
