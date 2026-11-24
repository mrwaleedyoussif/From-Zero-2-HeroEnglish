import { describe, expect, it } from "vitest";
import { isCorrect, publicQuestion, unitSchema } from "./schema";

const bi = (en: string) => ({ en, ar: "نص" });
export const sampleUnit = () => ({
  id: "RW-A1P-U01",
  strand: "RW",
  level: "A1P",
  unit: 1,
  title: "A new phone",
  title_ar: "هاتف جديد",
  objectives: [bi("Read a short text.")],
  vocabulary: [
    { id: "RW-A1P-U01-VOC01", word: "camera", definition: "it takes photos", ipa: "/k/" },
  ],
  hook: { question: bi("Do you have a phone?"), prediction: bi("Guess.") },
  passage: { id: "RW-A1P-U01-TXT01", title: "Reem's phone", paragraphs: ["Reem has a phone."] },
  comprehension: [
    {
      id: "Q1",
      type: "mcq",
      skill: "detail",
      stem: "What does Reem have?",
      options: { a: "a phone", b: "a car", c: "a cat", d: "a pen" },
      answer: "a",
      hints: [bi("Look at line 1."), bi("It rings."), bi("It is a phone.")],
      explanation: bi("Line 1 says so."),
    },
    {
      id: "Q2",
      type: "tfng",
      skill: "detail",
      stem: "Reem is ten.",
      answer: "Not Given",
      explanation: bi("Not said."),
    },
    {
      id: "Q3",
      type: "short",
      skill: "gist",
      stem: "Who has a phone?",
      answer: "Reem",
      explanation: bi("Reem."),
    },
    {
      id: "Q4",
      type: "sequence",
      skill: "sequence",
      stem: "Put in order.",
      events: ["two", "one"],
      answer: "b, a",
      explanation: bi("One, then two."),
    },
  ],
  writing_task: { prompt: bi("Write about your phone."), word_count: [25, 40] },
  teacher: { tips: ["kept as written"] },
});

describe("course unit files", () => {
  it("reads a unit, shows A1P as A1+, and keeps parts it does not use", () => {
    const unit = unitSchema.parse(sampleUnit());
    expect(unit.level).toBe("A1+");
    expect((unit as { teacher?: unknown }).teacher).toEqual({ tips: ["kept as written"] });
  });

  it("explains what is wrong with a broken file", () => {
    const bad = sampleUnit();
    (bad.comprehension[0] as { answer: string }).answer = "e";
    const out = unitSchema.safeParse(bad);
    expect(out.success).toBe(false);
    expect(unitSchema.safeParse({ ...sampleUnit(), level: "D1" }).success).toBe(false);
    expect(unitSchema.safeParse({ ...sampleUnit(), comprehension: [] }).success).toBe(false);
  });

  it("marks answers, and never marks free-text ones", () => {
    const [mcq, tfng, short, seq] = unitSchema.parse(sampleUnit()).comprehension;
    if (!mcq || !tfng || !short || !seq) throw new Error("fixture");
    expect(isCorrect(mcq, "A")).toBe(true);
    expect(isCorrect(mcq, "b")).toBe(false);
    expect(isCorrect(tfng, "not given")).toBe(true);
    expect(isCorrect(short, "Reem")).toBeNull();
    expect(isCorrect(seq, "b,a")).toBe(true);
    expect(isCorrect(seq, "a,b")).toBe(false);
  });

  it("never sends answers, hints or explanations to the browser", () => {
    const sent = JSON.stringify(unitSchema.parse(sampleUnit()).comprehension.map(publicQuestion));
    expect(sent).not.toMatch(/answer|hints|explanation|Line 1 says/);
  });
});
