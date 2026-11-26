import { describe, expect, it } from "vitest";
import { docxText } from "@/lib/docx/text";
import { makeDocx, SAMPLE_BOOKLET } from "@/lib/docx/make-docx";
import { unitSchema } from "@/features/units/schema";
import { readBooklet } from "./booklet";
import { readKey, readQuestions } from "./questions";
import { bookletToUnits } from "./to-units";

const NAME = "STEP_F_B1_Grammar_Unit1_A1_Part1.docx";

describe("STEP booklets", () => {
  it("reads a Word file's paragraphs and tabs", () => {
    const text = docxText(makeDocx(["Hello & welcome", "A. one\tB. two"]));
    expect(text.split("\n")).toEqual(["Hello & welcome", "A. one\tB. two"]);
  });
  it("reads questions with options on one line or several, and the key with Arabic hints", () => {
    const { questions } = readQuestions([
      "1.\tQ one?",
      "A. a\tB. b",
      "C. c\tD. d",
      "1. Not a question",
    ]);
    expect(questions).toEqual([
      { n: 1, stem: "Q one?", options: { a: "a", b: "b", c: "c", d: "d" } },
    ]);
    const key = readKey(["1. D — Because.", "Corrected: It is.", "تلميح: لأن."]);
    expect(key.get(1)).toEqual({ answer: "d", en: "Because. Corrected: It is.", ar: "لأن." });
  });
  it("turns a booklet part into lessons that pass the unit check, teacher notes marked", () => {
    const book = readBooklet(NAME, docxText(makeDocx(SAMPLE_BOOKLET)))!;
    expect(book).toMatchObject({ booklet: "B1", unit: 1, level: "A1" });
    const [unit] = bookletToUnits(book);
    const parsed = unitSchema.parse(unit);
    expect(parsed).toMatchObject({ id: "SG-A1-L1-1", strand: "SG", level: "A1", unit: 1 });
    expect(parsed.title).toBe("1.1 Pronouns and be");
    const q = parsed.quiz[0]!.questions;
    expect(q.map((x) => [x.id, x.type === "mcq" && x.answer])).toEqual([
      ["SG-A1-L1-1-Q01", "b"],
      ["SG-A1-L1-1-Q02", "c"],
    ]);
    expect(q[0]?.explanation).toEqual({ en: "With I we always use am.", ar: "مع I نستخدم am." });
    expect(parsed.notes.find((n) => n.heading.startsWith("Classroom"))?.staff).toBe(true);
  });
  it("ignores files that are not booklet parts", () => {
    expect(readBooklet("STEP_F_B1_Grammar_MASTER.docx", "Lesson 1.1 — X")).toBeNull();
  });
});
