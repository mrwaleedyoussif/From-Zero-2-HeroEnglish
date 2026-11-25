import { describe, expect, it } from "vitest";
import { markAnswer, sameMeaning } from "./marking";
import type { Question } from "./schema";

const note = (answer: string, type: "note" | "short" = "note"): Question => ({
  id: "Q",
  skill: "detail",
  stem: "?",
  type,
  answer,
});

describe("answers in the learner's own words", () => {
  it("takes the same meaning in other words", () => {
    expect(sameMeaning("He was late for work.", "because he is late to his work")).toBe(true);
    expect(sameMeaning("two phone cases", "2 phone case")).toBe(true);
    expect(sameMeaning("a black case", "the case is black")).toBe(true);
  });
  it("refuses another meaning", () => {
    expect(sameMeaning("a black case", "a blue case")).toBe(false);
    expect(sameMeaning("The shop is open.", "the shop is not open")).toBe(false);
    expect(sameMeaning("forty riyals", "")).toBe(false);
  });
  it("is used for listening only; grammar answers stay exact", () => {
    expect(markAnswer(note("a black case"), "black case, the strong one", "listening")).toBe(true);
    expect(markAnswer(note("a black case"), "black case please", "practice")).toBe(false);
    expect(markAnswer(note("goes"), "go", "practice")).toBe(false);
  });
  it("marks a short listening answer only when it clearly matches", () => {
    expect(markAnswer(note("He likes it.", "short"), "he like it", "listening")).toBe(true);
    expect(markAnswer(note("He likes it.", "short"), "it is cheap", "listening")).toBeNull();
  });
});
