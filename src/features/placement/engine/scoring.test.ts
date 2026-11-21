import { describe, expect, it } from "vitest";
import { mulberry32 } from "./rng.ts";
import { cefrFor, scaledScore, skillEstimates, strengthsAndGaps, thetaForCefr } from "./score.ts";
import { isCorrect, normalizeText } from "./scoring.ts";
import { makeBank, runSimulation, simulateLearner, summarize } from "./simulate.ts";
import type { Blueprint, CutScore } from "./types.ts";

const CUTS: CutScore[] = [
  { cefr: "A2", min: -1.8, max: -0.6 },
  { cefr: "A1", min: -3, max: -1.8 },
  { cefr: "B1", min: -0.6, max: 0.6 },
];

describe("scores and CEFR", () => {
  it("computes the LinguaPath scale and the CEFR band (clamped at both ends)", () => {
    expect(scaledScore(0)).toBe(200);
    expect(scaledScore(-1.234)).toBe(175);
    expect(cefrFor(-1, CUTS)).toBe("A2");
    expect(cefrFor(-0.6, CUTS)).toBe("B1");
    expect(cefrFor(-3.5, CUTS)).toBe("A1");
    expect(cefrFor(3, CUTS)).toBe("B1");
    expect(cefrFor(0, [])).toBeNull();
    expect(thetaForCefr("A2", CUTS)).toBeCloseTo(-1.2);
    expect(thetaForCefr("C2", CUTS)).toBeNull();
  });

  it("estimates each skill separately and names strengths and gaps", () => {
    const answers = [
      ...Array.from({ length: 6 }, (_, i) => ({
        itemId: `r${i}`,
        skill: "READ",
        b: 0.5,
        correct: true,
      })),
      ...Array.from({ length: 6 }, (_, i) => ({
        itemId: `g${i}`,
        skill: "GRAM",
        b: -0.5,
        correct: false,
      })),
    ];
    const skills = skillEstimates(answers, 0);
    expect(skills.map((s) => s.skill)).toEqual(["GRAM", "READ"]);
    expect(skills.find((s) => s.skill === "READ")?.theta).toBeGreaterThan(0.5);
    expect(skills.every((s) => s.se > 0.4 && s.n === 6)).toBe(true);
    expect(strengthsAndGaps(skills, 0)).toEqual({ strengths: ["READ"], gaps: ["GRAM"] });
  });
});

describe("answer checking", () => {
  it.each([
    ["mcq_single", "C", "c", true],
    ["mcq_single", "C", "B", false],
    ["mcq_single", "C", "", false],
    ["true_false", "A", "A", true],
    ["mcq_multi", "A;C", ["C", "A"], true],
    ["mcq_multi", "A;C", "A", false],
    ["gap_fill", "went|had gone", " Went. ", true],
    ["gap_fill", "went|had gone", "had  gone", true],
    ["gap_fill", "went", "", false],
    ["short_answer", "Riyadh", "riyadh", true],
    ["matching", "1-c;2-a", "1 - c ; 2 - a", true],
    ["ordering", "B;A;C", "A;B;C", false],
  ] as const)("%s key=%s answer=%s → %s", (type, key, answer, expected) => {
    expect(isCorrect(type, key, answer)).toBe(expected);
  });

  it("leaves productive prompts to the teacher and fails safely without a key", () => {
    expect(isCorrect("writing_prompt", null, "My weekend…")).toBeNull();
    expect(isCorrect("speaking_prompt", null, "")).toBeNull();
    expect(isCorrect("mcq_single", null, "A")).toBe(false);
    expect(isCorrect("unknown" as never, "A", "A")).toBe(false);
  });

  it("normalises curly quotes, case and trailing punctuation", () => {
    expect(normalizeText("  Don’t  STOP!! ")).toBe("don't stop");
    expect(normalizeText("“hi”")).toBe('"hi"');
  });
});

describe("simulated learners (SPEC §7)", () => {
  const shares = { READ: 0.25, LIST: 0.2, GRAM: 0.2, VOC: 0.15 };
  const bp: Blueprint = {
    minItems: 12,
    maxItems: 40,
    targetSe: 0.35,
    timeLimitSec: null,
    skillMinShares: shares,
  };

  it.each([-2, 0, 2])("θ = %i converges to SE ≤ 0.35 within 40 items", (theta) => {
    const rng = mulberry32(100 + theta);
    const bank = makeBank(300, Object.keys(shares), rng);
    const results = Array.from({ length: 40 }, () => simulateLearner(theta, bank, bp, rng));
    const converged = results.filter((r) => r.stop === "precision").length;
    expect(converged / results.length).toBeGreaterThanOrEqual(0.9);
    expect(summarize("g", results).mae).toBeLessThan(0.45);
  });

  it("keeps blueprint minimum shares per skill", () => {
    const rng = mulberry32(9);
    const r = simulateLearner(0.3, makeBank(200, Object.keys(shares), rng), bp, rng);
    for (const [skill, share] of Object.entries(shares)) {
      expect(r.answers.filter((a) => a.skill === skill).length / r.items).toBeGreaterThanOrEqual(
        share - 0.05,
      );
    }
  });

  it("summarises groups for the report", () => {
    const rng = mulberry32(1);
    const groups = runSimulation(makeBank(120, ["GEN"], rng), { ...bp, maxItems: 15 }, rng, 5);
    expect(groups.map((g) => g.label)).toEqual(["θ = −2", "θ = 0", "θ = +2", "θ ~ N(0,1)"]);
    expect(groups.every((g) => g.maxItems <= 15 && g.learners === 5)).toBe(true);
  });
});
