import { clean, type KeyEntry, readKey, readQuestions, type StepQuestion } from "./questions";

export interface MockGroup {
  title?: string;
  /** Reading: a passage (paragraphs numbered [1], [2] …). */
  text?: { title: string; paragraphs: string[] };
  /** Listening: the track code ("M01-L-03"), played once, as in the real test. */
  track?: string;
  script?: { speaker: string; text: string }[];
  questions: (StepQuestion & { key?: KeyEntry })[];
}
export interface MockSection {
  n: number;
  name: string;
  minutes: number;
  groups: MockGroup[];
}
export interface StepMock {
  id: string;
  number: number;
  set: string;
  title: string;
  band?: string;
  sections: MockSection[];
  guide: { min: number; max: number; text: string }[];
}

const SECTION = /^Section (\d) [—–-] (.+?) \(Questions (\d+)[–-](\d+)\)$/;
const TIMING = /^Section (\d)\t.+?\t(?:about\s+)?(\d+)\s+minutes/;
const PASSAGE = /^Passage \d+:\s*(.+)$/;
const RECORDING = /^Recording \d+\s+\(Questions? [\d–-]+\)\s+Track\s+(M\d{2}-L-\d+)$/;
const SCRIPT_HEAD = /^Recording \d+ \(Q[\d–-]+\):\s*(.+?)\s+\[(M\d{2}-L-\d+)\]$/;
const GUIDE = /^(\d+)[–-](\d+)\t(.+)$/;

/** One mock exam file (STEP_F_Mock_NN.docx, as text) → its four timed sections with keys. */
export function readMock(name: string, text: string): StepMock | null {
  const m = /STEP_F_Mock_(\d{2})\.docx$/.exec(name);
  if (!m) return null;
  const lines = text.split("\n").map((l) => clean(l));
  const find = (re: RegExp, from = 0) => lines.findIndex((l, i) => i >= from && re.test(l.trim()));
  const keyAt = find(/^Answer Key$/);
  const scriptsAt = find(/^Listening Scripts$/);
  if (keyAt < 0) return null;
  const head = lines.find((l) => /^Set [A-C] [—–-]/.test(l.trim())) ?? "";
  const mock: StepMock = {
    id: `M${m[1]}`,
    number: Number(m[1]),
    set: /^Set ([A-C])/.exec(head.trim())?.[1] ?? "",
    title: `Mock ${m[1]}`,
    band: lines
      .find((l) => /Difficulty band:/.test(l))
      ?.split("Difficulty band:")[1]
      ?.trim(),
    sections: [],
    guide: [],
  };
  const minutes = new Map<number, number>();
  for (const l of lines.slice(0, keyAt)) {
    const t = TIMING.exec(l);
    if (t) minutes.set(Number(t[1]), Number(t[2]));
  }
  // Sections of the test itself (before the answer key).
  const starts = lines
    .map((l, i) => ({ i, s: SECTION.exec(l.trim()) }))
    .filter((x) => x.s && x.i < keyAt);
  starts.forEach(({ i, s }, k) => {
    const end = starts[k + 1]?.i ?? keyAt;
    const n = Number(s?.[1]);
    mock.sections.push({
      n,
      name: s?.[2] ?? "",
      minutes: minutes.get(n) ?? 30,
      groups: groups(lines.slice(i + 1, end)),
    });
  });
  // The key (all sections), the score guide and the listening scripts.
  const key = readKey(lines.slice(keyAt + 1, scriptsAt > 0 ? scriptsAt : undefined));
  const scripts = new Map<string, { speaker: string; text: string }[]>();
  let current: { speaker: string; text: string }[] | null = null;
  for (const raw of scriptsAt > 0 ? lines.slice(scriptsAt + 1) : []) {
    const l = raw.trim();
    const h = SCRIPT_HEAD.exec(l);
    if (h) {
      current = [];
      scripts.set(h[2] ?? "", current);
      continue;
    }
    const said = /^([^:]{1,40}):\s+(.+)$/.exec(l);
    if (current && said && !/^Situation$/.test(said[1] ?? "") && !/[؀-ۿ]/.test(l))
      current.push({ speaker: said[1] ?? "", text: said[2] ?? "" });
  }
  for (const l of lines.slice(keyAt)) {
    const g = GUIDE.exec(l.trim());
    if (g) mock.guide.push({ min: Number(g[1]), max: Number(g[2]), text: g[3] ?? "" });
  }
  for (const s of mock.sections)
    for (const g of s.groups) {
      if (g.track) g.script = scripts.get(g.track);
      for (const q of g.questions) {
        const k = key.get(q.n);
        // "[detail · Recording 1] Three days …": the tag names the skill; the rest explains.
        if (k) q.key = { ...k, en: k.en.replace(/^\[[^\]]*\]\s*/, "") };
      }
    }
  return mock;
}

function groups(body: readonly string[]): MockGroup[] {
  const { questions, at } = readQuestions(body);
  const out: MockGroup[] = [];
  let group: MockGroup = { questions: [] };
  let qi = 0;
  body.forEach((raw, i) => {
    const l = raw.trim();
    if (at[qi] === i) {
      const q = questions.find((x) => x.n === Number(/^(\d+)/.exec(l)?.[1]));
      if (q) group.questions.push(q);
      qi++;
      return;
    }
    const p = PASSAGE.exec(l);
    const r = RECORDING.exec(l.replace(/\s+/g, " "));
    if (p || r) {
      if (group.questions.length || group.text || group.track) out.push(group);
      group = p
        ? { title: p[1], text: { title: p[1] ?? "", paragraphs: [] }, questions: [] }
        : {
            title: l.replace(/\s+Track\s+\S+$/, "").replace(/\s+/g, " "),
            track: r?.[1],
            questions: [],
          };
      return;
    }
    if (group.text && !group.questions.length && /^\[\d+\]/.test(l)) group.text.paragraphs.push(l);
  });
  if (group.questions.length) out.push(group);
  return out;
}
