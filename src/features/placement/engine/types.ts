/** Shared types for the adaptive placement engine (SPEC §7). Pure — no I/O anywhere in engine/. */

export interface EngineItem {
  id: string;
  skill: string;
  /** Rasch difficulty in logits. */
  b: number;
}

export interface EngineAnswer {
  itemId: string;
  skill: string;
  b: number;
  correct: boolean;
}

export interface Estimate {
  theta: number;
  se: number;
}

export interface Prior {
  mean: number;
  sd: number;
}

export interface Blueprint {
  minItems: number;
  maxItems: number;
  targetSe: number;
  /** Minimum share of administered items per skill (e.g. READ: 0.25). */
  skillMinShares: Readonly<Record<string, number>>;
  /** Whole-test time limit; null = untimed. */
  timeLimitSec: number | null;
}

export type StopReason = "precision" | "maxItems" | "time" | "exhausted";

export interface CutScore {
  cefr: string;
  min: number;
  max: number;
}
