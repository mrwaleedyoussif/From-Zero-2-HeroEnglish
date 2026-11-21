import { step } from "./cat.ts";
import { probability, bFromDifficulty } from "./rasch.ts";
import { type Rng, normal } from "./rng.ts";
import type { Blueprint, EngineAnswer, EngineItem, Estimate, StopReason } from "./types.ts";

/**
 * Simulated learners (SPEC §7 acceptance): a learner with a true θ answers each item
 * correctly with the Rasch probability. Used by tests and `npm run sim:placement`.
 */

/** A bank like the Owner's: difficulty 1–10 per item (so b is coarse, as in real content). */
export function makeBank(size: number, skills: readonly string[], rng: Rng): EngineItem[] {
  return Array.from({ length: size }, (_, i) => ({
    id: `SIM-${String(i + 1).padStart(4, "0")}`,
    skill: skills[i % skills.length] as string,
    b: bFromDifficulty(1 + Math.floor(rng() * 10)),
  }));
}

export interface SimResult extends Estimate {
  trueTheta: number;
  items: number;
  stop: StopReason;
  answers: EngineAnswer[];
}

export function simulateLearner(
  trueTheta: number,
  bank: readonly EngineItem[],
  blueprint: Blueprint,
  rng: Rng,
): SimResult {
  const answers: EngineAnswer[] = [];
  for (;;) {
    const r = step({
      answers,
      pool: bank,
      blueprint,
      prior: { mean: 0, sd: 1 },
      rng,
      elapsedSec: 0,
    });
    if (r.stop) return { trueTheta, ...r.estimate, items: answers.length, stop: r.stop, answers };
    answers.push({
      itemId: r.next.id,
      skill: r.next.skill,
      b: r.next.b,
      correct: rng() < probability(trueTheta, r.next.b),
    });
  }
}

export interface SimGroup {
  label: string;
  learners: number;
  mae: number;
  meanItems: number;
  meanSe: number;
  maxItems: number;
}

export function summarize(label: string, results: readonly SimResult[]): SimGroup {
  const n = results.length;
  const mean = (f: (r: SimResult) => number) => results.reduce((s, r) => s + f(r), 0) / n;
  return {
    label,
    learners: n,
    mae: mean((r) => Math.abs(r.theta - r.trueTheta)),
    meanItems: mean((r) => r.items),
    meanSe: mean((r) => r.se),
    maxItems: Math.max(...results.map((r) => r.items)),
  };
}

/** The acceptance run: fixed θ groups (−2, 0, +2) and a random N(0, 1) population. */
export function runSimulation(
  bank: readonly EngineItem[],
  blueprint: Blueprint,
  rng: Rng,
  perGroup = 300,
): SimGroup[] {
  const groups: [string, () => number][] = [
    ["θ = −2", () => -2],
    ["θ = 0", () => 0],
    ["θ = +2", () => 2],
    ["θ ~ N(0,1)", () => normal(rng)],
  ];
  return groups.map(([label, draw]) =>
    summarize(
      label,
      Array.from({ length: perGroup }, () => simulateLearner(draw(), bank, blueprint, rng)),
    ),
  );
}
