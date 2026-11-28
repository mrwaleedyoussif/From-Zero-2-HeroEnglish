/**
 * Marking what a learner said, from the words their browser's speech recognition heard.
 * It checks words, not pronunciation quality: a guide for practice, never a grade.
 */
export const words = (v: string) =>
  v
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9' ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);

/** Shadowing a chunk: how much of the model was said, in order (0–100). */
export function scoreRepeat(model: string, heard: string): number {
  const a = words(model);
  const b = words(heard);
  if (a.length === 0) return 0;
  // Longest common subsequence: words said in the right order, extra or missing ones allowed.
  let row = new Array<number>(b.length + 1).fill(0);
  for (const wa of a) {
    const next = [0];
    for (let j = 1; j <= b.length; j++)
      next[j] = wa === b[j - 1] ? (row[j - 1] ?? 0) + 1 : Math.max(row[j] ?? 0, next[j - 1] ?? 0);
    row = next;
  }
  return Math.round(((row[b.length] ?? 0) / a.length) * 100);
}

export interface WordMark {
  text: string;
  ok: boolean;
}

/**
 * The model, word by word, with the words that were not heard (in order) marked wrong, plus the
 * words the learner said that are not in the model.
 */
export function markWords(model: string, heard: string): { marks: WordMark[]; extra: string[] } {
  const shown = model.split(/\s+/).filter((w) => words(w).length > 0);
  const a = shown.map((w) => words(w).join(""));
  const b = words(heard);
  const cell = (i: number, j: number) => lcs[i]?.[j] ?? 0;
  const lcs = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      (lcs[i] as number[])[j] =
        a[i] === b[j] ? cell(i + 1, j + 1) + 1 : Math.max(cell(i + 1, j), cell(i, j + 1));
  const marks: WordMark[] = [];
  const extra: string[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length) {
    if (j < b.length && a[i] === b[j]) {
      marks.push({ text: shown[i] ?? "", ok: true });
      i++;
      j++;
    } else if (j < b.length && cell(i, j + 1) >= cell(i + 1, j)) extra.push(b[j++] ?? "");
    else marks.push({ text: shown[i++] ?? "", ok: false });
  }
  extra.push(...b.slice(j));
  return { marks, extra: extra.slice(0, 12) };
}

export interface Targets {
  words: string[];
  structures: { label: string; patterns: string[] }[];
}

/** A speaking task: which target words and structures were used, and the share of them. */
export function scoreTargets(targets: Targets, heard: string) {
  const said = ` ${words(heard).join(" ")} `;
  const usedWords = targets.words.filter((w) => said.includes(` ${words(w).join(" ")} `));
  const usedStructures = targets.structures
    .filter((s) =>
      s.patterns.some((p) => {
        try {
          return new RegExp(p, "i").test(heard);
        } catch {
          return false; // a pattern the browser cannot read never counts against the learner
        }
      }),
    )
    .map((s) => s.label);
  const total = targets.words.length + targets.structures.length;
  return {
    score: total ? Math.round(((usedWords.length + usedStructures.length) / total) * 100) : 0,
    usedWords,
    usedStructures,
  };
}
