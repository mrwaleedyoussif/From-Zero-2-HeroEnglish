import { describe, expect, it } from "vitest";
import {
  type CandidateLesson,
  cefrIndex,
  type Learner,
  levelFit,
  mixFormats,
  recommend,
  scoreLesson,
} from "./engine.ts";

const now = new Date("2026-11-21T10:00:00Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);
const lesson = (id: string, over: Partial<CandidateLesson> = {}): CandidateLesson => ({
  id,
  skillId: "gram",
  cefr: "A2",
  tags: [],
  format: "reading",
  ...over,
});
const learner: Learner = {
  level: 2, // A2
  skillGaps: new Map([
    ["gram", 1.5],
    ["read", -0.4],
  ]),
  interests: ["Sports"],
  formats: ["video"],
};

describe("recommendation scoring", () => {
  it("maps CEFR and scores level fit (stretch above beats review below)", () => {
    expect(cefrIndex("B1")).toBe(3);
    expect(cefrIndex(null)).toBeNull();
    expect(levelFit(2, 2)).toBe(2);
    expect(levelFit(3, 2)).toBe(1.5);
    expect(levelFit(1, 2)).toBe(1);
    expect(levelFit(5, 2)).toBe(-3);
    expect(levelFit(null, 2)).toBe(0);
    expect(levelFit(2, null)).toBe(0);
  });

  it("adds gap, level, interest, format and novelty, with reasons", () => {
    const s = scoreLesson(
      lesson("a", { tags: ["sports", "school"], format: "video" }),
      learner,
      undefined,
      now,
    );
    expect(s.score).toBe(2 + 2 + 1 + 1 + 1);
    expect(s.reasons).toEqual(["gap", "level", "interest", "format", "new"]);
  });

  it("strengths add no gap weight; interests cap at two tags", () => {
    const s = scoreLesson(
      lesson("b", { skillId: "read", tags: ["sports", "sports", "sports"] }),
      { ...learner, interests: ["sports"] },
      undefined,
      now,
    );
    expect(s.score).toBe(0 + 2 + 2 + 0 + 1);
  });

  it("penalises lessons already done and ones opened in the last days", () => {
    const base = scoreLesson(lesson("c"), learner, undefined, now).score;
    const done = scoreLesson(
      lesson("c"),
      learner,
      { status: "done", lastOpenedAt: daysAgo(30) },
      now,
    );
    const recent = scoreLesson(
      lesson("c"),
      learner,
      { status: "in_progress", lastOpenedAt: daysAgo(1) },
      now,
    );
    const old = scoreLesson(
      lesson("c"),
      learner,
      { status: "in_progress", lastOpenedAt: daysAgo(10) },
      now,
    );
    expect(done.score).toBe(base - 1 - 3);
    expect(recent.score).toBe(base - 1 - 1);
    expect(old.score).toBe(base - 1);
    expect(done.reasons).not.toContain("new");
  });

  it("mixes formats in the top picks and fills from the rest when variety runs out", () => {
    const ranked = [
      { id: "r1", score: 9, format: "reading" },
      { id: "r2", score: 8, format: "reading" },
      { id: "r3", score: 7, format: "reading" },
      { id: "v1", score: 1, format: "video" },
    ];
    expect(mixFormats(ranked, 3).map((l) => l.id)).toEqual(["r1", "r2", "v1"]);
    expect(mixFormats(ranked.slice(0, 3), 3).map((l) => l.id)).toEqual(["r1", "r2", "r3"]);
    expect(mixFormats(ranked, 10)).toHaveLength(4);
  });

  it("never re-recommends teacher-assigned lessons (they rank first elsewhere)", () => {
    const out = recommend(
      [lesson("x", { format: "video" }), lesson("y")],
      learner,
      new Map(),
      new Set(["x"]),
      now,
    );
    expect(out.map((l) => l.id)).toEqual(["y"]);
    expect(out[0]?.format).toBe("reading");
  });
});

describe("recommendation edge cases", () => {
  it("unknown skills, far levels and equal scores", () => {
    const s = scoreLesson(lesson("z", { skillId: "other", cefr: "C2" }), learner, undefined, now);
    expect(s.reasons).toEqual(["new"]);
    const tied = mixFormats(
      [
        { id: "b", score: 1, format: "audio" },
        { id: "a", score: 1, format: "audio" },
      ],
      2,
    );
    expect(tied.map((l) => l.id)).toEqual(["a", "b"]);
    expect(mixFormats([{ id: "v", score: 2, format: "video" }, ...tied], 1)).toHaveLength(1);
  });
});
