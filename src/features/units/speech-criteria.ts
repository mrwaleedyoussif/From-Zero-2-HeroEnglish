import type { Prosody } from "./prosody";
import { scoreRepeat, scoreTargets, type Targets, words } from "./speech";

export const SPEECH_CRITERIA = [
  "vocabulary",
  "pronunciation",
  "wordStress",
  "sentenceStress",
  "intonation",
] as const;
/** One line of feedback: a score (null = not measured here) and a message by its code. */
export interface Criterion {
  key: (typeof SPEECH_CRITERIA)[number];
  score: number | null;
  code: string;
  list?: string[];
  n?: number;
  got?: number;
}

const unheard = (key: Criterion["key"]): Criterion => ({ key, score: null, code: "noAudio" });
const missed = (model: string, heard: string) => {
  const got = new Set(words(heard));
  return [...new Set(words(model).filter((w) => !got.has(w)))];
};

function pronunciation(model: string, heard: string): Criterion {
  const list = missed(model, heard);
  const score = scoreRepeat(model, heard);
  return { key: "pronunciation", score, code: list.length ? "missed" : "clear", list };
}

/** A shadowing chunk: every word, the strong beats (CAPITALS) and the tune of the model. */
export function chunkCriteria(
  chunk: {
    text: string;
    display?: string;
    intonation?: string;
    word_stress?: { word: string; pattern: string }[];
  },
  heard: string,
  p: Prosody | null,
): Criterion[] {
  const out = [pronunciation(chunk.text, heard)];
  if (chunk.word_stress?.length)
    out.push({
      key: "wordStress",
      score: null,
      code: "inSentence",
      list: chunk.word_stress.map((w) => `${w.word} (${w.pattern})`),
    });
  const n = (chunk.display ?? "").split(/\s+/).filter((w) => /^[A-Z]{2,}[.,!?]*$/.test(w)).length;
  if (n > 0) {
    if (!p) out.push(unheard("sentenceStress"));
    else if (p.contrast < 0.25) out.push({ key: "sentenceStress", score: 40, code: "flat", n });
    else {
      const diff = Math.abs(p.beats - n);
      const code = diff <= 1 ? "beatsGood" : p.beats < n ? "beatsFew" : "beatsMany";
      out.push({
        key: "sentenceStress",
        score: diff === 0 ? 100 : diff === 1 ? 80 : 60,
        code,
        n,
        got: p.beats,
      });
    }
  }
  const arrow = (chunk.intonation ?? "").match(/[↗↑↘↓]/g)?.at(-1);
  if (arrow) {
    const want = arrow === "↗" || arrow === "↑" ? "rise" : "fall";
    if (!p?.tune) out.push({ key: "intonation", score: null, code: p ? "noPitch" : "noAudio" });
    else if (p.tune === want) out.push({ key: "intonation", score: 100, code: `${want}Right` });
    else out.push({ key: "intonation", score: p.tune === "flat" ? 50 : 30, code: `${want}Wanted` });
  }
  return out;
}

/** One word said after the speaker: was it heard, and was the right syllable the strong one. */
export function wordCriteria(
  word: { word: string; stress?: string; syllables?: string },
  heard: string,
  p: Prosody | null,
): Criterion[] {
  const said = missed(word.word, heard).length === 0;
  const out: Criterion[] = [
    {
      key: "pronunciation",
      score: said ? 100 : 0,
      code: said ? "clear" : "wordMissed",
      list: [word.word],
    },
  ];
  const pattern = word.stress ?? "";
  const want = pattern.indexOf("O");
  if (pattern.length < 2 || want < 0) return out;
  const list = [word.syllables ?? word.word, pattern];
  if (!p) out.push({ ...unheard("wordStress"), list });
  else if (p.syllables < 2 || p.peak === null)
    out.push({ key: "wordStress", score: 50, code: "stressUnclear", list, n: want + 1 });
  else {
    const got = Math.round((p.peak / (p.syllables - 1)) * (pattern.length - 1));
    out.push({
      key: "wordStress",
      score: got === want ? 100 : 40,
      code: got === want ? "stressRight" : "stressWrong",
      list,
      n: want + 1,
      got: got + 1,
    });
  }
  return out;
}

/** A speaking task: the target words and structures used, clear speech, strong beats, a lively voice. */
export function taskCriteria(
  targets: Targets,
  heard: string,
  p: Prosody | null,
  confidence?: number,
): Criterion[] {
  const used = scoreTargets(targets, heard);
  const left = targets.words.filter((w) => !used.usedWords.includes(w)).slice(0, 6);
  const out: Criterion[] = [
    {
      key: "vocabulary",
      score: used.score,
      code: left.length ? "useMore" : "usedAll",
      list: [...used.usedWords, ...used.usedStructures],
      n: left.length,
    },
  ];
  if (left.length) out[0] = { ...out[0]!, got: used.usedWords.length + used.usedStructures.length };
  if (confidence !== undefined)
    out.push({
      key: "pronunciation",
      score: Math.round(confidence * 100),
      code: confidence >= 0.8 ? "clear" : "unclear",
    });
  if (!p) return [...out, unheard("sentenceStress"), unheard("intonation")];
  out.push({
    key: "sentenceStress",
    score: p.contrast >= 0.3 ? 100 : 50,
    code: p.contrast >= 0.3 ? "beatsClear" : "flat",
  });
  out.push(
    p.tune === null
      ? { key: "intonation", score: null, code: "noPitch" }
      : {
          key: "intonation",
          score: p.range >= 5 ? 100 : p.range >= 2.5 ? 70 : 40,
          code: p.range >= 5 ? "lively" : p.range >= 2.5 ? "someTune" : "monotone",
        },
  );
  return out;
}

/** Words of the task still to use (shown with the vocabulary line). */
export const unusedWords = (targets: Targets, heard: string) =>
  targets.words.filter((w) => !scoreTargets(targets, heard).usedWords.includes(w)).slice(0, 6);

/** One number for the try: the average of what could be measured. */
export function overall(criteria: Criterion[]): number {
  const scores = criteria.flatMap((c) => (c.score === null ? [] : [c.score]));
  return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
}
