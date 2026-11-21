import { probability } from "./rasch.ts";

/**
 * Monthly item calibration (SPEC §7): for items with enough responses, re-estimate b by
 * conditional maximum likelihood given each learner's estimated θ, and flag items that
 * misfit (infit/outfit outside 0.7–1.3) or are nearly always wrong/right (p < 0.1 / > 0.95).
 */
export interface CalibrationResponse {
  theta: number;
  correct: boolean;
}

export type CalibrationFlag = "misfit" | "tooHard" | "tooEasy";

export interface ItemCalibration {
  n: number;
  pValue: number;
  /** New b in logits; null when every answer was right (or wrong): no finite estimate. */
  b: number | null;
  infit: number | null;
  outfit: number | null;
  flags: CalibrationFlag[];
}

export const MIN_RESPONSES = 200;

/** Newton–Raphson on Σ(x − P(θ, b)) = 0, with steps capped at 1 logit so far starts converge. */
export function estimateB(
  responses: readonly CalibrationResponse[],
  start: number,
  maxIterations = 50,
): number | null {
  const right = responses.filter((r) => r.correct).length;
  if (right === 0 || right === responses.length) return null;
  let b = start;
  for (let i = 0; i < maxIterations; i++) {
    let f = 0;
    let df = 0;
    for (const r of responses) {
      const p = probability(r.theta, b);
      f += (r.correct ? 1 : 0) - p;
      df += p * (1 - p);
    }
    const stepSize = Math.max(-1, Math.min(1, f / df));
    const next = Math.max(-6, Math.min(6, b - stepSize));
    if (Math.abs(next - b) < 1e-6) return next;
    b = next;
  }
  return b;
}

/** Rasch fit: outfit = mean squared standardised residual; infit = information-weighted. */
export function fit(
  responses: readonly CalibrationResponse[],
  b: number,
): { infit: number; outfit: number } {
  let z2 = 0;
  let sq = 0;
  let info = 0;
  for (const r of responses) {
    const p = probability(r.theta, b);
    const residual = (r.correct ? 1 : 0) - p;
    const variance = p * (1 - p);
    z2 += (residual * residual) / variance;
    sq += residual * residual;
    info += variance;
  }
  return { infit: sq / info, outfit: z2 / responses.length };
}

export function calibrateItem(
  responses: readonly CalibrationResponse[],
  currentB: number,
  minResponses = MIN_RESPONSES,
): ItemCalibration | null {
  if (responses.length < minResponses) return null;
  const pValue = responses.filter((r) => r.correct).length / responses.length;
  const b = estimateB(responses, currentB);
  const stats = b === null ? null : fit(responses, b);
  const flags: CalibrationFlag[] = [];
  if (stats && (stats.infit < 0.7 || stats.infit > 1.3 || stats.outfit < 0.7 || stats.outfit > 1.3))
    flags.push("misfit");
  if (pValue < 0.1) flags.push("tooHard");
  if (pValue > 0.95) flags.push("tooEasy");
  return {
    n: responses.length,
    pValue,
    b: b === null ? null : Math.round(b * 100) / 100,
    infit: stats ? Math.round(stats.infit * 100) / 100 : null,
    outfit: stats ? Math.round(stats.outfit * 100) / 100 : null,
    flags,
  };
}
