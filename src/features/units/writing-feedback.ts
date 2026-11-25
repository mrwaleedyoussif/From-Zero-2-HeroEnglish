/**
 * Feedback on a learner's writing against seven criteria. The rules here need no outside
 * service: they count, look for linking words, topic words and punctuation slips. Spelling and
 * grammar need a reader, so they are marked only when AI feedback is on (see writing-ai.ts).
 */
export const WRITING_CRITERIA = [
  "onTopic",
  "wordCount",
  "spelling",
  "vocabulary",
  "grammar",
  "punctuation",
  "cohesion",
] as const;
export type WritingKey = (typeof WRITING_CRITERIA)[number];

export interface WritingNote {
  key: WritingKey;
  /** 1 (start again) to 4 (very good); null = not marked. */
  score: number | null;
  /** A message by code (rules) … */
  code?: string;
  n?: number;
  min?: number;
  max?: number;
  list?: string[];
  /** … or the reader's own words (AI). */
  en?: string;
  ar?: string;
  fixes?: { wrong: string; right: string }[];
}
export interface WritingFeedback {
  source: "ai" | "rules";
  notes: WritingNote[];
  summary?: { en: string; ar: string };
}
export interface WritingContext {
  range?: [number, number];
  /** The unit's words to know. */
  words: string[];
  /** The task, title and topic: what the writing should be about. */
  topic: string;
}

const tokens = (v: string) => v.toLowerCase().match(/[a-z']+/g) ?? [];
const LINKERS = [
  "and", "but", "because", "so", "also", "then", "first", "second", "next", "finally", "however",
  "although", "for example", "after that", "in addition", "moreover", "therefore", "when", "while",
  "on the other hand", "in conclusion",
]; // prettier-ignore
const SMALL = new Set(
  "a an the is are was were am be to of in on at it he she they we you i my your his her and or but about write with for do does have has that this what how why your".split(
    " ",
  ),
);
const band = (issues: number) => Math.max(1, 4 - issues);

export function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function wordCountNote(text: string, range?: [number, number]): WritingNote {
  const n = countWords(text);
  if (!range) return { key: "wordCount", score: null, code: "count", n };
  const [min, max] = range;
  const off = n < min ? (min - n) / min : n > max ? (n - max) / max : 0;
  const code = n < min ? "short" : n > max ? "long" : "inRange";
  return {
    key: "wordCount",
    score: off === 0 ? 4 : off <= 0.2 ? 3 : off <= 0.5 ? 2 : 1,
    code,
    n,
    min,
    max,
  };
}

/** What the rules can say about a text; spelling and grammar are left unmarked. */
export function ruleFeedback(text: string, ctx: WritingContext): WritingNote[] {
  const flat = ` ${tokens(text).join(" ")} `;
  const mine = new Set(tokens(text));

  const topicWords = [...new Set(tokens(ctx.topic).filter((w) => w.length > 2 && !SMALL.has(w)))];
  const shared = topicWords.filter((w) => mine.has(w) || mine.has(`${w}s`));
  const onTopic: WritingNote = {
    key: "onTopic",
    score: topicWords.length ? Math.min(4, 1 + shared.length) : null,
    code: shared.length >= 3 ? "onTopic" : shared.length ? "partly" : "offTopic",
    list: shared.slice(0, 6),
  };

  const used = ctx.words.filter((w) => flat.includes(` ${tokens(w).join(" ")} `));
  const vocabulary: WritingNote = {
    key: "vocabulary",
    score: ctx.words.length ? Math.min(4, 1 + used.length) : null,
    code: used.length ? "used" : "useSome",
    list: used.length ? used : ctx.words.slice(0, 5),
  };

  const slips: string[] = [];
  const sentences = text.trim().split(/(?<=[.!?])\s+/);
  if (sentences.some((s) => /^[a-z]/.test(s))) slips.push("capital");
  if (!/[.!?]["')]?$/.test(text.trim())) slips.push("end");
  if (/\s[,.!?;:]/.test(text)) slips.push("spaceBefore");
  if (/[,;:][A-Za-z]/.test(text)) slips.push("spaceAfter");
  if (/(^|\s)i(\s|')/.test(text)) slips.push("smallI");
  const punctuation: WritingNote = {
    key: "punctuation",
    score: band(slips.length),
    code: slips.length ? "slips" : "clean",
    list: slips,
  };

  const links = LINKERS.filter((l) => flat.includes(` ${l} `));
  const cohesion: WritingNote = {
    key: "cohesion",
    score: Math.min(4, 1 + links.length),
    code: links.length >= 3 ? "linked" : links.length ? "linkMore" : "noLinks",
    list: links,
  };

  return [
    onTopic,
    wordCountNote(text, ctx.range),
    { key: "spelling", score: null, code: "needsReader" },
    vocabulary,
    { key: "grammar", score: null, code: "needsReader" },
    punctuation,
    cohesion,
  ];
}
