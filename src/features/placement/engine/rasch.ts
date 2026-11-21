/** Rasch (1-parameter IRT) model (SPEC §7). */

/** P(correct | θ, b) = 1 / (1 + e^-(θ − b)) */
export function probability(theta: number, b: number): number {
  return 1 / (1 + Math.exp(-(theta - b)));
}

/** Fisher information of a Rasch item at θ: p(1 − p). Max 0.25 when b = θ. */
export function information(theta: number, b: number): number {
  const p = probability(theta, b);
  return p * (1 - p);
}

/** The Owner's 1–10 difficulty → initial logits: (d − 5.5) × 0.6 ≈ −2.7 … +2.7. */
export function bFromDifficulty(difficulty: number): number {
  return Math.round((difficulty - 5.5) * 0.6 * 100) / 100;
}

/** Calibrated b replaces the initial one once the monthly calibration has run. */
export function itemB(item: { difficulty: number; b_calibrated: number | null }): number {
  return item.b_calibrated ?? bFromDifficulty(item.difficulty);
}
