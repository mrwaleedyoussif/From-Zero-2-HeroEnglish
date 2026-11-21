import { describe, expect, it } from "vitest";
import type { CandidateLesson } from "./engine.ts";
import { suggestGroups } from "./suggest.ts";

const lesson = (id: string, over: Partial<CandidateLesson> = {}): CandidateLesson => ({
  id,
  skillId: "gram",
  cefr: "A2",
  tags: [],
  format: "reading",
  ...over,
});

describe("teacher suggestions", () => {
  const student = (id: string, level: number | null, gaps: [string, number][]) => ({
    id,
    level,
    gaps: new Map(gaps),
  });

  it("groups students who share a weak skill and picks lessons near their usual level", () => {
    const out = suggestGroups(
      [
        student("s1", 2, [["gram", 0.8]]),
        student("s2", 2, [
          ["gram", 0.6],
          ["read", 0.9],
        ]),
        student("s3", 1, [["gram", 0.5]]),
        student("s4", null, [["read", 0.2]]),
      ],
      [
        lesson("g-b2", { cefr: "B2" }),
        lesson("g-a2", { cefr: "A2" }),
        lesson("g-a1", { cefr: "A1" }),
        lesson("g-none", { cefr: null }),
        lesson("r-a2", { skillId: "read" }),
      ],
      2,
    );
    expect(out).toEqual([
      { skillId: "gram", studentIds: ["s1", "s2", "s3"], level: 2, lessonIds: ["g-a2", "g-a1"] },
    ]);
  });

  it("breaks level ties toward the lower level, skips skills without lessons", () => {
    const out = suggestGroups(
      [
        student("a", 3, [
          ["gram", 1],
          ["list", 1],
        ]),
        student("b", 1, [
          ["gram", 1],
          ["list", 1],
        ]),
      ],
      [lesson("g", { cefr: null })],
    );
    expect(out).toEqual([{ skillId: "gram", studentIds: ["a", "b"], level: 1, lessonIds: ["g"] }]);
    expect(
      suggestGroups(
        [student("a", null, [["gram", 1]]), student("b", null, [["gram", 1]])],
        [lesson("g")],
      )[0]?.level,
    ).toBeNull();
  });

  it("orders suggestions by group size, then skill", () => {
    const out = suggestGroups(
      [
        student("a", 1, [
          ["gram", 1],
          ["read", 1],
        ]),
        student("b", 1, [
          ["gram", 1],
          ["read", 1],
        ]),
        student("c", 1, [["read", 1]]),
        student("d", 1, [["list", 1]]),
        student("e", 1, [["list", 1]]),
      ],
      [
        lesson("g2"),
        lesson("g"),
        lesson("r", { skillId: "read" }),
        lesson("l", { skillId: "list" }),
      ],
    );
    expect(out.map((x) => x.skillId)).toEqual(["read", "gram", "list"]);
  });
});
