import { describe, expect, it } from "vitest";
import { makeDocx, SAMPLE_MOCK } from "@/lib/docx/make-docx";
import { docxText } from "@/lib/docx/text";
import { mockSchema, publicSection, scoreMock } from "@/features/mocks/schema";
import { readMock } from "./mock";
import { mockToDoc } from "./mock-doc";

describe("STEP mock exams", () => {
  const mock = mockSchema.parse(
    mockToDoc(readMock("STEP_F_Mock_01.docx", docxText(makeDocx(SAMPLE_MOCK)))!),
  );
  it("reads timed sections, passages, recordings with scripts and the key", () => {
    expect(mock).toMatchObject({ id: "M01", set: "A", band: "A2 60% · B1 40%" });
    expect(mock.sections.map((s) => [s.n, s.minutes])).toEqual([
      [1, 5],
      [3, 4],
    ]);
    const [reading, listening] = mock.sections;
    expect(reading?.groups[0]?.text?.paragraphs).toEqual([
      "[1] My uncle has a small farm near Qassim.",
    ]);
    expect(listening?.groups[0]).toMatchObject({
      track: "M01-L-01",
      script: [{ speaker: "Man", text: "I'd like to return this book." }],
    });
    expect(reading?.groups[0]?.questions[0]?.explanation).toEqual({
      en: "It says near Qassim.",
      ar: "قرب القصيم.",
    });
    expect(mock.guide).toHaveLength(2);
  });
  it("marks by section and never sends answers to the learner during the exam", () => {
    const r = scoreMock(mock, { "M01-Q001": "a", "M01-Q002": "c", "M01-Q003": "c" });
    expect(r).toEqual({
      score: 2,
      total: 3,
      sections: [
        { n: 1, right: 1, total: 2 },
        { n: 3, right: 1, total: 1 },
      ],
    });
    const shown = JSON.stringify(publicSection(mock.sections[1]!));
    expect(shown).not.toContain("answer");
    expect(shown).not.toContain("return this book");
  });
});
