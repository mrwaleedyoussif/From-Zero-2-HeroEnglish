import { eap } from "./eap.ts";
import type { CutScore, EngineAnswer, Estimate } from "./types.ts";

/** Internal scaled score (labelled "LinguaPath Scale", not NWEA RIT): round(200 + 20·θ̂). */
export function scaledScore(theta: number): number {
  return Math.round(200 + 20 * theta);
}

/** CEFR band whose [min, max) holds θ; below/above the table → lowest/highest band. */
export function cefrFor(theta: number, cuts: readonly CutScore[]): string | null {
  if (cuts.length === 0) return null;
  const sorted = [...cuts].sort((a, b) => a.min - b.min);
  const hit = sorted.find((c) => theta >= c.min && theta < c.max);
  if (hit) return hit.cefr;
  // `cuts` is non-empty here, so first/last exist.
  const first = sorted[0] as CutScore;
  const last = sorted[sorted.length - 1] as CutScore;
  return theta < first.min ? first.cefr : last.cefr;
}

/** θ midpoint of a CEFR band (to turn a teacher's rubric level into an ability estimate). */
export function thetaForCefr(cefr: string, cuts: readonly CutScore[]): number | null {
  const band = cuts.find((c) => c.cefr === cefr);
  return band ? (band.min + band.max) / 2 : null;
}

export interface SkillEstimate extends Estimate {
  skill: string;
  n: number;
}

/**
 * Per-skill θ̂ from that skill's answers only, with the overall θ̂ as prior mean — fewer
 * items, so the SE is wider (SPEC §7).
 */
export function skillEstimates(answers: readonly EngineAnswer[], overall: number): SkillEstimate[] {
  const skills = [...new Set(answers.map((a) => a.skill))].sort();
  return skills.map((skill) => {
    const mine = answers.filter((a) => a.skill === skill);
    return { skill, n: mine.length, ...eap(mine, { mean: overall, sd: 1 }) };
  });
}

/** Strengths/gaps: skills clearly above/below the overall level (default ±0.5 logits). */
export function strengthsAndGaps(
  skills: readonly SkillEstimate[],
  overall: number,
  margin = 0.5,
): { strengths: string[]; gaps: string[] } {
  return {
    strengths: skills.filter((s) => s.theta - overall >= margin).map((s) => s.skill),
    gaps: skills.filter((s) => overall - s.theta >= margin).map((s) => s.skill),
  };
}
