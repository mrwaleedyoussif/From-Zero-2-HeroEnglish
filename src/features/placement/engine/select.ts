import type { Rng } from "./rng.ts";
import type { EngineAnswer, EngineItem } from "./types.ts";

export type NonEmpty<T> = readonly [T, ...T[]];

/**
 * Content balancing: the skill furthest below its blueprint minimum share, counting the
 * item about to be given. Null when every minimum is met (any skill may follow).
 */
export function chooseSkill(
  shares: Readonly<Record<string, number>>,
  answers: readonly EngineAnswer[],
  available: ReadonlySet<string>,
): string | null {
  const n = answers.length + 1;
  let best: string | null = null;
  let bestDeficit = 0;
  for (const [skill, share] of Object.entries(shares)) {
    if (!available.has(skill)) continue;
    const given = answers.filter((a) => a.skill === skill).length;
    const deficit = share * n - given;
    if (deficit > bestDeficit + 1e-9) {
      best = skill;
      bestDeficit = deficit;
    }
  }
  return best;
}

/**
 * Next item from the unused candidates: within the balanced skill, pick at random among the
 * `k` items whose difficulty is closest to θ̂ (randomesque exposure control, SPEC §7).
 */
export function selectItem(
  candidates: NonEmpty<EngineItem>,
  theta: number,
  answers: readonly EngineAnswer[],
  shares: Readonly<Record<string, number>>,
  rng: Rng,
  k = 5,
): EngineItem {
  const skill = chooseSkill(shares, answers, new Set(candidates.map((i) => i.skill)));
  const inSkill = skill ? candidates.filter((i) => i.skill === skill) : [...candidates];
  const closest = inSkill
    .sort((a, b) => Math.abs(a.b - theta) - Math.abs(b.b - theta) || a.id.localeCompare(b.id))
    .slice(0, k);
  // chooseSkill only returns skills present in candidates, so `closest` is never empty.
  return closest[Math.floor(rng() * closest.length)] as EngineItem;
}
