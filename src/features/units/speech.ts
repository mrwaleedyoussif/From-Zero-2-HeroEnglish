/**
 * Marking what a learner said, from the words their browser's speech recognition heard.
 * It checks words, not pronunciation quality: a guide for practice, never a grade.
 */
const words = (v: string) =>
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
