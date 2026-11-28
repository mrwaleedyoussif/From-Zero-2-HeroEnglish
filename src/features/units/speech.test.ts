import { describe, expect, it } from "vitest";
import { markWords, scoreRepeat, scoreTargets } from "./speech";

describe("marking speech from the heard words", () => {
  it("scores a repeated chunk by the model words said in order", () => {
    expect(scoreRepeat("Hello! My name is Fahad.", "hello my name is fahad")).toBe(100);
    expect(scoreRepeat("Hello! My name is Fahad.", "hello my name")).toBe(60);
    expect(scoreRepeat("I am new in this class.", "class this in new am I")).toBe(17);
    expect(scoreRepeat("Hello.", "")).toBe(0);
    expect(scoreRepeat("", "hello")).toBe(0);
  });

  it("finds target words and structures in a speaking task", () => {
    const targets = {
      words: ["need", "phone case", "cheap"],
      structures: [
        { label: "How much is / are ...?", patterns: ["how much (is|are)"] },
        { label: "broken pattern", patterns: ["(unclosed"] },
      ],
    };
    const out = scoreTargets(targets, "Hello, I need a phone case. How much is it?");
    expect(out.usedWords).toEqual(["need", "phone case"]);
    expect(out.usedStructures).toEqual(["How much is / are ...?"]);
    expect(out.score).toBe(60);
    expect(scoreTargets({ words: [], structures: [] }, "hi").score).toBe(0);
  });

  it("marks each model word right or wrong, and lists added words", () => {
    const r = markWords("The cat sat on the mat.", "the cat is on a mat");
    expect(r.marks.map((m) => `${m.ok ? "+" : "-"}${m.text}`)).toEqual([
      "+The",
      "+cat",
      "-sat",
      "+on",
      "-the",
      "+mat.",
    ]);
    expect(r.extra).toEqual(["is", "a"]);
    expect(markWords("Hello", "").marks).toEqual([{ text: "Hello", ok: false }]);
  });
});
