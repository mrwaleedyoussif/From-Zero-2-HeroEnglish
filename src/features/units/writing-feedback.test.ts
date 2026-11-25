import { describe, expect, it } from "vitest";
import { ruleFeedback, wordCountNote } from "./writing-feedback";

const ctx = {
  range: [20, 40] as [number, number],
  words: ["screen", "camera"],
  topic: "Write about your phone. My phone",
};

describe("writing feedback by rules", () => {
  it("counts words against the target", () => {
    expect(wordCountNote("one two three", [3, 5])).toMatchObject({
      score: 4,
      code: "inRange",
      n: 3,
    });
    expect(wordCountNote("one two", [20, 40])).toMatchObject({ score: 1, code: "short" });
    expect(wordCountNote("a ".repeat(44), [20, 40])).toMatchObject({ score: 3, code: "long" });
  });
  it("finds topic words, unit words, linking words and punctuation slips", () => {
    const good =
      "I have a new phone. It has a big screen and a good camera, so I take photos. First I call my friend, then I play because it is fun.";
    const notes = Object.fromEntries(ruleFeedback(good, ctx).map((n) => [n.key, n]));
    expect(notes.onTopic).toMatchObject({ list: ["phone"] });
    expect(notes.vocabulary).toMatchObject({ score: 3, list: ["screen", "camera"] });
    expect(notes.punctuation).toMatchObject({ score: 4, code: "clean" });
    expect(notes.cohesion).toMatchObject({ score: 4, code: "linked" });
    expect(notes.spelling?.score).toBeNull();
    expect(notes.grammar?.code).toBe("needsReader");
  });
  it("names each slip", () => {
    const notes = ruleFeedback("i like my phone ,it is good. it is black", ctx);
    expect(notes.find((n) => n.key === "punctuation")?.list).toEqual([
      "capital",
      "end",
      "spaceBefore",
      "spaceAfter",
      "smallI",
    ]);
    expect(notes.find((n) => n.key === "cohesion")?.code).toBe("noLinks");
  });
});
