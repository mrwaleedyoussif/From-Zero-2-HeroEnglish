import { describe, expect, it } from "vitest";
import { analyse, type Frame, pitchOf } from "./prosody";
import { chunkCriteria, overall, taskCriteria, wordCriteria } from "./speech-criteria";

const tone = (hz: number, rate = 48000, n = 2048) =>
  Float32Array.from({ length: n }, (_, i) => 0.3 * Math.sin((2 * Math.PI * hz * i) / rate));
/** Syllables as loudness humps of ten frames; `hz` gives each hump's pitch. */
const say = (louds: number[], hz: number[]): Frame[] =>
  louds.flatMap((l, k) =>
    Array.from({ length: 10 }, (_, i) => ({
      e: 0.02 + l * Math.sin((Math.PI * (i + 0.5)) / 10),
      f: hz[k] ?? null,
    })),
  );

describe("voice measurements", () => {
  it("finds the pitch of a voice and none in silence", () => {
    expect(pitchOf(tone(200), 48000)).toBeGreaterThan(190);
    expect(pitchOf(tone(200), 48000)).toBeLessThan(210);
    expect(pitchOf(new Float32Array(2048), 48000)).toBeNull();
  });
  it("counts strong beats, finds the strongest and hears the voice fall or rise", () => {
    const fall = analyse(say([0.3, 0.8, 0.3, 0.6], [220, 220, 210, 160]));
    expect(fall).toMatchObject({ syllables: 4, beats: 2, peak: 1, tune: "fall" });
    expect(analyse(say([0.5, 0.5, 0.5, 0.5], [180, 180, 185, 240]))?.tune).toBe("rise");
    expect(analyse([])).toBeNull();
  });
});

describe("speaking feedback", () => {
  const chunk = {
    text: "I am NEW in this class.",
    display: "I am NEW in this CLASS. |",
    intonation: "↘",
  };
  it("marks a chunk on words, strong beats and tune", () => {
    const p = { tune: "fall" as const, beats: 2, syllables: 6, contrast: 0.5, range: 6, peak: 0 };
    const c = chunkCriteria(chunk, "i am new in this class", p);
    expect(c.map((x) => [x.key, x.score, x.code])).toEqual([
      ["pronunciation", 100, "clear"],
      ["sentenceStress", 100, "beatsGood"],
      ["intonation", 100, "fallRight"],
    ]);
    expect(overall(c)).toBe(100);
    const weak = chunkCriteria(chunk, "i am in this glass", { ...p, tune: "rise", contrast: 0.1 });
    expect(weak[0]).toMatchObject({ code: "missed", list: ["new", "class"] });
    expect(weak.map((x) => x.code)).toEqual(["missed", "flat", "fallWanted"]);
  });
  it("says so when the voice could not be measured", () => {
    expect(chunkCriteria(chunk, "i am new", null).map((x) => x.score)).toEqual([50, null, null]);
  });
  it("checks which syllable of a word was the strong one", () => {
    const word = { word: "refute", stress: "oO", syllables: "re·fute" };
    const p = { tune: "fall" as const, beats: 1, syllables: 2, contrast: 0.5, range: 3, peak: 1 };
    expect(wordCriteria(word, "refute", p)[1]).toMatchObject({ score: 100, code: "stressRight" });
    expect(wordCriteria(word, "refute", { ...p, peak: 0 })[1]).toMatchObject({
      code: "stressWrong",
      n: 2,
      got: 1,
    });
    expect(wordCriteria({ word: "need", stress: "O" }, "neat", p)).toEqual([
      { key: "pronunciation", score: 0, code: "wordMissed", list: ["need"] },
    ]);
  });
  it("marks a speaking task on its words, clear speech and a lively voice", () => {
    const c = taskCriteria(
      { words: ["case", "riyals"], structures: [] },
      "how much is the case",
      { tune: "flat", beats: 3, syllables: 5, contrast: 0.4, range: 1, peak: 0 },
      0.9,
    );
    expect(c.map((x) => [x.key, x.score, x.code])).toEqual([
      ["vocabulary", 50, "useMore"],
      ["pronunciation", 90, "clear"],
      ["sentenceStress", 100, "beatsClear"],
      ["intonation", 40, "monotone"],
    ]);
  });
});
