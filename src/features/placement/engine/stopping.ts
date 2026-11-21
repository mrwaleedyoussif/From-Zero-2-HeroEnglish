import type { Blueprint, StopReason } from "./types.ts";

/**
 * Stopping rule (SPEC §7): the time limit, the maximum number of items, or SE ≤ target after
 * the minimum number of items. (Running out of eligible items is handled by the caller.)
 */
export function stopReason(
  state: { answered: number; se: number; elapsedSec: number },
  bp: Pick<Blueprint, "minItems" | "maxItems" | "targetSe" | "timeLimitSec">,
): Exclude<StopReason, "exhausted"> | null {
  if (bp.timeLimitSec !== null && state.elapsedSec >= bp.timeLimitSec) return "time";
  if (state.answered >= bp.maxItems) return "maxItems";
  if (state.answered >= bp.minItems && state.se <= bp.targetSe) return "precision";
  return null;
}
