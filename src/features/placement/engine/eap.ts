import { probability } from "./rasch.ts";
import type { Estimate, Prior } from "./types.ts";

/**
 * EAP (expected a posteriori) ability estimate on a fixed grid (SPEC §7):
 * θ ∈ [−4, 4] step 0.05, Normal(θ₀, σ) prior. θ̂ = posterior mean, SE = posterior SD.
 * Computed in log space so long tests never underflow.
 */
export const GRID: readonly number[] = Array.from(
  { length: 161 },
  (_, i) => Math.round((-4 + i * 0.05) * 100) / 100,
);

export function eap(answers: readonly { b: number; correct: boolean }[], prior: Prior): Estimate {
  const points = GRID.map((theta) => {
    const z = (theta - prior.mean) / prior.sd;
    let lp = -0.5 * z * z;
    for (const a of answers) {
      const p = probability(theta, a.b);
      lp += Math.log(a.correct ? p : 1 - p);
    }
    return { theta, lp };
  });
  const max = Math.max(...points.map((p) => p.lp));
  const weighted = points.map((p) => ({ theta: p.theta, w: Math.exp(p.lp - max) }));
  const total = weighted.reduce((s, p) => s + p.w, 0);
  const mean = weighted.reduce((s, p) => s + p.theta * p.w, 0) / total;
  const variance = weighted.reduce((s, p) => s + (p.theta - mean) ** 2 * p.w, 0) / total;
  return { theta: mean, se: Math.sqrt(variance) };
}
