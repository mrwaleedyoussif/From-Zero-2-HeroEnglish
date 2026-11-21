import { eap } from "./eap.ts";
import type { Rng } from "./rng.ts";
import { selectItem } from "./select.ts";
import { stopReason } from "./stopping.ts";
import type { Blueprint, EngineAnswer, EngineItem, Estimate, Prior, StopReason } from "./types.ts";

export interface StepInput {
  answers: readonly EngineAnswer[];
  /** Eligible items (the caller applied status, department, visibility, grade band, 180-day rule). */
  pool: readonly EngineItem[];
  blueprint: Blueprint;
  prior: Prior;
  rng: Rng;
  elapsedSec: number;
}

export type StepResult =
  | { estimate: Estimate; stop: StopReason; next: null }
  | { estimate: Estimate; stop: null; next: EngineItem };

/**
 * One adaptive step (SPEC §7): update θ̂ from all answers so far (right answers raise it,
 * wrong ones lower it), decide whether to stop, otherwise pick the next item near θ̂.
 */
export function step(input: StepInput): StepResult {
  const estimate = eap(input.answers, input.prior);
  const stop = stopReason(
    { answered: input.answers.length, se: estimate.se, elapsedSec: input.elapsedSec },
    input.blueprint,
  );
  if (stop) return { estimate, stop, next: null };
  const used = new Set(input.answers.map((a) => a.itemId));
  const [first, ...rest] = input.pool.filter((i) => !used.has(i.id));
  if (!first) return { estimate, stop: "exhausted", next: null };
  const next = selectItem(
    [first, ...rest],
    estimate.theta,
    input.answers,
    input.blueprint.skillMinShares,
    input.rng,
  );
  return { estimate, stop: null, next };
}
