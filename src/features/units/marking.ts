import { isCorrect, type Question, type Unit } from "./schema";

/** The question sets of a unit, by the name the page gives them. */
export const SETS = ["listening", "comprehension", "controlled", "practice", "quiz"] as const;
export type SetName = (typeof SETS)[number];
export function setOf(unit: Unit, set: SetName): Question[] {
  if (set === "controlled") return unit.grammar_lesson?.controlled ?? [];
  if (set === "quiz") return unit.quiz.flatMap((g) => g.questions);
  return unit[set];
}

const NUMBERS: Record<string, string> = Object.fromEntries(
  "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty"
    .split(" ")
    .map((w, i) => [w, String(i)]),
);
Object.assign(NUMBERS, { thirty: "30", forty: "40", fifty: "50", sixty: "60", seventy: "70" });
Object.assign(NUMBERS, { eighty: "80", ninety: "90", hundred: "100", first: "1", second: "2" });

/** Small words that carry no meaning of their own in a short answer. */
const SMALL = new Set(
  "a an the is are was were am be been to of in on at it its he she they we you i his her their our my your and because that this there for with do does did has have had will would s so very".split(
    " ",
  ),
);
const NEGATIVE = new Set(["not", "no", "never", "nobody", "nothing"]);

/** A word reduced to its base: plurals, -ing, -ed and number words all meet ("two" = "2"). */
function base(word: string): string {
  const w = NUMBERS[word] ?? word;
  if (w.length <= 3) return w;
  return w
    .replace(/'s$/, "")
    .replace(/ies$/, "y")
    .replace(/(ing|ed|es|s)$/, (end) => (w.length - end.length >= 3 ? "" : end))
    .replace(/e$/, "");
}

function meaning(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/n't\b/g, " not")
    .replace(/[^a-z0-9' ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(base);
}

/**
 * Whether an answer in the learner's own words says the same as an accepted answer: the words
 * that carry the meaning are there (most of them, for a long answer), in any order, with small
 * words, endings and number spellings forgiven. "Not" must agree: "is not open" is not "is open".
 */
export function sameMeaning(accepted: string, said: string): boolean {
  const key = meaning(accepted);
  const got = new Set(meaning(said));
  if (got.size === 0) return false;
  if (key.some((w) => NEGATIVE.has(w)) !== [...got].some((w) => NEGATIVE.has(w))) return false;
  const words = key.filter((w) => !SMALL.has(w) && !NEGATIVE.has(w));
  const needed = words.length > 0 ? words : key;
  const found = needed.filter((w) => got.has(w)).length;
  return found / needed.length >= (needed.length >= 3 ? 0.6 : 1);
}

/**
 * Mark one answer. Listening answers are taken by meaning (what was heard, in any words);
 * a short answer is marked only when it clearly matches, and left to the model answer otherwise.
 */
export function markAnswer(q: Question, choice: string, set: SetName): boolean | null {
  const exact = isCorrect(q, choice);
  if (set !== "listening" || q.type === "mcq" || q.type === "tfng" || q.type === "sequence")
    return exact;
  if (exact) return true;
  const close = q.answer.split(" / ").some((accepted) => sameMeaning(accepted, choice));
  return close ? true : q.type === "short" ? null : false;
}
